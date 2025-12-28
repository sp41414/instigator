import { NextFunction, Request, Response } from "express";
import prisma from "../db/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { matchedData, validationResult } from "express-validator";
import {
    validateUser,
    validateLogin,
    validateUsername,
} from "../middleware/validation.js";
import { authenticateJWT } from "../middleware/auth.js";
import { AuthenticatedRequest } from "../types/index.js";

const SECRET = process.env.JWT_SECRET!;

export const login = [
    validateLogin,
    async (req: Request, res: Response, next: NextFunction) => {
        const err = validationResult(req);
        if (!err.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: err.array(),
                error: {
                    code: "BAD_REQUEST",
                    timestamp: new Date().toISOString(),
                },
            });
        }
        const { username, password } = matchedData(req);
        try {
            const user = await prisma.user.findUnique({
                where: {
                    username: username,
                },
            });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: ["Invalid Username or Password"],
                    error: {
                        error: {
                            code: "UNAUTHORIZED",
                            timestamp: new Date().toISOString(),
                        },
                    },
                });
            }
            if (!user.password) {
                return res.status(401).json({
                    success: false,
                    message: [
                        "This account uses Google sign-in. Please login with Google.",
                    ],
                    error: {
                        code: "UNAUTHORIZED",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                const token = jwt.sign({ id: user.id }, SECRET, {
                    expiresIn: "2d",
                });

                res.cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "none",
                    maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
                });

                return res.json({
                    success: true,
                    message: "Logged in successfully",
                    data: {
                        user: {
                            id: user.id,
                            username: user.username,
                            profile_picture_url: user.profile_picture_url,
                        },
                    },
                });
            } else {
                return res.status(401).json({
                    success: false,
                    message: ["Invalid Username or Password"],
                    error: {
                        code: "UNAUTHORIZED",
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        } catch (err) {
            next(err);
        }
    },
];

export const signup = [
    validateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        const err = validationResult(req);
        if (!err.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: err.array(),
                error: {
                    code: "BAD_REQUEST",
                    timestamp: new Date().toISOString(),
                },
            });
        }
        const { username, password } = matchedData(req);
        try {
            const existingUser = await prisma.user.findUnique({
                where: {
                    username: username,
                },
            });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: [`Username ${username} is already taken.`],
                    error: {
                        code: "CONFLICT",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = await prisma.user.create({
                data: {
                    username: username,
                    password: hashedPassword,
                },
                select: {
                    id: true,
                    username: true,
                    createdAt: true,
                    profile_picture_url: true,
                },
            });

            const token = jwt.sign({ id: newUser.id }, SECRET, {
                expiresIn: "2d",
            });
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "none",
                maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
            });

            res.status(201).json({
                success: true,
                message: "Signed up successfully",
                data: {
                    user: newUser,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const logout = (req: Request, res: Response) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
    });
    res.json({
        success: true,
        message: "Logged out successfully",
    });
};

export const setupUsername = [
    authenticateJWT,
    validateUsername,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const err = validationResult(req);
        if (!err.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: err.array(),
                error: {
                    code: "BAD_REQUEST",
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const { username } = matchedData(req);
        const user = req.user as { id: number; username: string };

        try {
            if (!user.username.startsWith("temp_")) {
                return res.status(403).json({
                    success: false,
                    message: ["You don't need to set up a username"],
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const existing = await prisma.user.findUnique({
                where: {
                    username,
                },
            });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: ["Username is already taken"],
                    error: {
                        code: "CONFLICT",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: { username },
                select: {
                    id: true,
                    username: true,
                    profile_picture_url: true,
                },
            });

            return res.json({
                success: true,
                message: "Username set successfully",
                data: {
                    user: updatedUser,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const guestLogin = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        // guest user will always have an ID of 1
        const guestUser = await prisma.user.findUnique({
            where: {
                id: 1,
            },
        });

        const token = jwt.sign({ id: guestUser?.id }, SECRET, {
            expiresIn: "2d",
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
        });

        return res.json({
            success: true,
            message: "Logged in successfully",
            data: {
                user: {
                    id: guestUser?.id,
                    username: guestUser?.username,
                    profile_picture_url: guestUser?.profile_picture_url,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};
