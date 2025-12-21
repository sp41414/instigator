import { NextFunction, Request, Response } from "express";
import prisma from "../db/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { matchedData, validationResult } from "express-validator";
import {
    validateUser,
    validateLogin,
    validateUsername,
} from "../middleware/validation";
import { authenticateJWT } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import logger from "../utils/logger";

const SECRET = process.env.JWT_SECRET!;

export const login = [
    validateLogin,
    async (req: Request, res: Response, next: NextFunction) => {
        const err = validationResult(req);
        if (!err.isEmpty()) {
            logger.warn("Failed login attempt", {
                ip: req.ip,
                error: err.array,
                reason: "validation_error",
            });

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
                logger.warn("Failed login attempt", {
                    username,
                    ip: req.ip,
                    reason: "user_not_found",
                });

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
                logger.warn("Failed login attempt", {
                    username,
                    ip: req.ip,
                    reason: "google_oauth",
                });

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
                    sameSite: "strict",
                    maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
                    signed: true,
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
                logger.warn("Failed login attempt", {
                    username,
                    ip: req.ip,
                    reason: "invalid_password",
                });

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
            logger.warn("Failed signup attempt", {
                ip: req.ip,
                error: err.array,
                reason: "validation_error",
            });

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
                logger.warn("Failed signup attempt", {
                    username,
                    ip: req.ip,
                    reason: "existing_user",
                });

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
                sameSite: "strict",
                maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
                signed: true,
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
        signed: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
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
            logger.warn("Failed setup username attempt", {
                ip: req.ip,
                error: err.array,
                reason: "validation_error",
            });

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
        const user = req.user as { id: number };

        try {
            const existing = await prisma.user.findUnique({
                where: {
                    username,
                },
            });

            if (existing) {
                logger.warn("Failed setup username attempt", {
                    ip: req.ip,
                    reason: "existing_user",
                });

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
