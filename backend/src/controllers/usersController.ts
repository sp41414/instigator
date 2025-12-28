import { NextFunction, Response } from "express";
import prisma from "../db/prisma.js";
import { validationResult, matchedData, body, query } from "express-validator";
import { authenticateJWT } from "../middleware/auth.js";
import { AuthenticatedRequest } from "../types/index.js";
import bcrypt from "bcryptjs";
import {
    validateUpdateUser,
    validatePaginationQuery,
    validateProfilePicture,
} from "../middleware/validation.js";
import { supabase } from "../config/supabase.js";

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
                    createdAt: true,
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
                            mode: "insensitive",
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
                    file_urls: true,
                    _count: {
                        select: {
                            comments: true,
                            likes: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            username: true,
                            profile_picture_url: true,
                        },
                    },
                    likes: {
                        where: {
                            userId: req.user!.id,
                        },
                        select: {
                            id: true,
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
                    createdAt: true,
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
                            mode: "insensitive",
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
                    file_urls: true,
                    _count: {
                        select: {
                            comments: true,
                            likes: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            username: true,
                            profile_picture_url: true,
                        },
                    },
                    likes: {
                        where: {
                            userId: req.user!.id,
                        },
                        select: {
                            id: true,
                        },
                    },
                },
            });

            let nextCursor: string | undefined;
            if (posts.length > limit) {
                const lastPost = posts.pop();
                nextCursor = lastPost!.id;
            }

            const followStatus = await prisma.follow.findFirst({
                where: {
                    OR: [
                        { senderId: req.user!.id, recipientId: userId },
                        { senderId: userId, recipientId: req.user!.id },
                    ],
                },
            });

            return res.json({
                success: true,
                message: "User profile fetched",
                data: {
                    user: userProfile,
                    posts,
                    nextCursor,
                    followStatus,
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
            if (req.user!.id === 1) {
                return res.status(403).json({
                    success: false,
                    message: "Cannot delete the Guest user",
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

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
                secure: process.env.NODE_ENV === "production",
                sameSite:
                    process.env.NODE_ENV === "production" ? "none" : "lax",
                path: "/",
                partitioned: process.env.NODE_ENV === "production",
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

export const updateProfilePicture = [
    authenticateJWT,
    ...validateProfilePicture,
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

        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: ["Upload failed: no file"],
                error: {
                    code: "BAD_REQUEST",
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const fileExt = file?.mimetype.split("/")[1];
        const filePath = `${req.user!.id}/${Date.now()}.${fileExt}`;

        try {
            const { data, error } = await supabase.storage
                .from("profile-pictures")
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true,
                });

            if (error) throw error;

            const {
                data: { publicUrl },
            } = supabase.storage
                .from("profile-pictures")
                .getPublicUrl(filePath);

            const user = await prisma.user.findUnique({
                where: {
                    id: req.user!.id,
                },
            });

            if (user?.profile_picture_url) {
                const oldPath = user.profile_picture_url;
                await supabase.storage
                    .from("profile-pictures")
                    .remove([oldPath]);
            }

            await prisma.user.update({
                where: {
                    id: req.user!.id,
                },
                data: {
                    profile_picture_url: publicUrl,
                },
            });

            return res.json({
                success: true,
                message: "Successfully updated profile picture",
                data: {
                    url: publicUrl,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const getUsers = [
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

        const { limit = 20, cursor, search } = matchedData(req);

        try {
            const users = await prisma.user.findMany({
                where: {
                    NOT: {
                        id: req.user!.id,
                    },
                    ...(search && {
                        username: {
                            contains: search,
                            mode: "insensitive",
                        },
                    }),
                },
                take: limit + 1,
                ...(cursor && {
                    skip: 1,
                    cursor: {
                        id: parseInt(cursor),
                    },
                }),
                orderBy: {
                    username: "asc",
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

            let nextCursor: number | undefined;
            if (users.length > limit) {
                const lastUser = users.pop();
                nextCursor = lastUser!.id;
            }

            const usersWithStatus = await Promise.all(
                users.map(async (user) => {
                    const followStatus = await prisma.follow.findFirst({
                        where: {
                            OR: [
                                {
                                    senderId: req.user!.id,
                                    recipientId: user.id,
                                },
                                {
                                    senderId: user.id,
                                    recipientId: req.user!.id,
                                },
                            ],
                        },
                    });
                    return { ...user, followStatus };
                }),
            );

            return res.json({
                success: true,
                message: "Fetched users successfully",
                data: {
                    users: usersWithStatus,
                    nextCursor,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];
