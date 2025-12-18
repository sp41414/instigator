import { NextFunction, Response } from "express";
import prisma from "../db/prisma";
import { validationResult, matchedData, body, query } from "express-validator";
import { authenticateJWT } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import bcrypt from "bcryptjs";

// TODO: implement changing profile picture by uploading to supabase, way later...
const validateUpdateUser = [
    // im not sure if the optional overwrites the isLength check, probably...
    body("username")
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage("Username must be between 1 and 20 characters long")
        .matches(/^[a-zA-Z0-9 ]*$/)
        .withMessage("Username must only have characters numbers and spaces"),
    body("password")
        .trim()
        .isLength({ min: 6, max: 32 })
        .withMessage("Password must be between 6 and 32 characters long")
        .matches(/^[a-zA-Z0-9!@#$%^&*]{6,32}$/)
        .withMessage(
            "Password can only contain letters, numbers, and special characters (!@#$%^&*).",
        ),
    body("about")
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage("About me has a maximum length of 200 characters"),
    body("email")
        .optional()
        .trim()
        .isEmail()
        .withMessage("Email must be a valid email, e.g. example@gmail.com"),
];

const validatePaginationQuery = [
    query("limit")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("Limit must be between 1 and 50")
        .toInt(),
    query("cursor")
        .optional()
        .isUUID()
        .withMessage("Cursor must be a valid UUID"),
    query("search")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Search query must be between 1 and 100 characters"),
];

export const getProfile = [
    authenticateJWT,
    ...validatePaginationQuery,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const errs = validationResult(req);
        if (!errs.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errs.array(),
                error: {
                    code: "BAD_REQUEST",
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const { limit = 10, cursor, search } = matchedData(req);
        try {
            const userProfile = await prisma.user.findUnique({
                where: {
                    id: req.user!.id,
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    profile_picture_url: true,
                    aboutMe: true,
                    _count: {
                        select: {
                            posts: true,
                            sentFollows: {
                                where: {
                                    OR: [
                                        { status: "ACCEPTED" },
                                        { status: "PENDING" },
                                    ],
                                },
                            },
                            receivedFollows: {
                                where: {
                                    OR: [
                                        { status: "ACCEPTED" },
                                        { status: "PENDING" },
                                    ],
                                },
                            },
                        },
                    },
                },
            });

            if (!userProfile) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const posts = await prisma.post.findMany({
                where: {
                    userId: req.user!.id,
                    ...(search && {
                        text: {
                            contains: search,
                        },
                    }),
                },
                take: limit + 1,
                ...(cursor && {
                    skip: 1,
                    cursor: {
                        id: cursor,
                    },
                }),
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                    {
                        id: "asc",
                    },
                ],
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    _count: {
                        select: {
                            comments: true,
                            likes: true,
                        },
                    },
                },
            });

            let nextCursor: string | undefined;
            if (posts.length > limit) {
                const lastPost = posts.pop();
                nextCursor = lastPost!.id;
            }

            return res.json({
                success: true,
                message: "User profile fetched",
                data: {
                    user: userProfile,
                    posts,
                    nextCursor,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const getUserProfile = [
    authenticateJWT,
    ...validatePaginationQuery,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: ["Invalid user ID"],
                error: {
                    code: "BAD_REQUEST",
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const errs = validationResult(req);
        if (!errs.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errs.array(),
                error: {
                    code: "BAD_REQUEST",
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const { limit = 10, cursor, search } = matchedData(req);

        try {
            const userProfile = await prisma.user.findUnique({
                where: {
                    id: userId,
                },
                select: {
                    id: true,
                    username: true,
                    profile_picture_url: true,
                    aboutMe: true,
                    _count: {
                        select: {
                            posts: true,
                            sentFollows: {
                                where: {
                                    OR: [
                                        { status: "ACCEPTED" },
                                        { status: "PENDING" },
                                    ],
                                },
                            },
                            receivedFollows: {
                                where: {
                                    OR: [
                                        { status: "ACCEPTED" },
                                        { status: "PENDING" },
                                    ],
                                },
                            },
                        },
                    },
                },
            });

            if (!userProfile) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const posts = await prisma.post.findMany({
                where: {
                    userId,
                    ...(search && {
                        text: {
                            contains: search,
                        },
                    }),
                },
                take: limit + 1,
                ...(cursor && {
                    skip: 1,
                    cursor: {
                        id: cursor,
                    },
                }),
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                    {
                        id: "asc",
                    },
                ],
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    _count: {
                        select: {
                            comments: true,
                            likes: true,
                        },
                    },
                },
            });

            let nextCursor: string | undefined;
            if (posts.length > limit) {
                const lastPost = posts.pop();
                nextCursor = lastPost!.id;
            }

            return res.json({
                success: true,
                message: "User profile fetched",
                data: {
                    user: userProfile,
                    posts,
                    nextCursor,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const updateProfile = [
    authenticateJWT,
    ...validateUpdateUser,
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

        const { username, password, about, email } = matchedData(req);
        try {
            let hashedPassword;
            if (password) {
                const salt = await bcrypt.genSalt();
                hashedPassword = await bcrypt.hash(password, salt);
            }

            const existingUser = await prisma.user.findFirst({
                where: {
                    username,
                    NOT: { id: req.user!.id },
                },
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: ["Username already taken"],
                    error: {
                        code: "CONFLICT",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (password && req.user!.googleId) {
                return res.status(403).json({
                    success: false,
                    message: [
                        "Cannot set a password as a google authenticated user",
                    ],
                    error: {
                        error: {
                            code: "FORBIDDEN",
                            timestamp: new Date().toISOString(),
                        },
                    },
                });
            }

            const updatedUserProfile = await prisma.user.update({
                where: {
                    id: req.user!.id,
                },
                data: {
                    username,
                    ...(hashedPassword && { password: hashedPassword }),
                    ...(about && { aboutMe: about }),
                    ...(email && { email }),
                },
                select: {
                    username: true,
                    aboutMe: true,
                    email: true,
                },
            });

            if (!updatedUserProfile) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            return res.json({
                success: true,
                message: "Updated profile successfully",
                data: {
                    user: updatedUserProfile,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const deleteUser = [
    authenticateJWT,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const deletedUser = await prisma.user.delete({
                where: {
                    id: req.user!.id,
                },
                select: {
                    username: true,
                    aboutMe: true,
                    email: true,
                },
            });

            if (!deletedUser) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            res.clearCookie("token", {
                httpOnly: true,
                signed: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
            });
            return res.json({
                success: true,
                message: "User deleted successfully",
                data: {
                    user: deletedUser,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];
