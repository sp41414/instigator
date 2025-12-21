import { NextFunction, Response } from "express";
import prisma from "../db/prisma";
import { validationResult, matchedData, body, query } from "express-validator";
import { authenticateJWT } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import bcrypt from "bcryptjs";
import {
    validateUpdateUser,
    validatePaginationQuery,
    validateProfilePicture,
} from "../middleware/validation";
import { supabase } from "../config/supabase";
import logger from "../utils/logger";

export const getProfile = [
    authenticateJWT,
    ...validatePaginationQuery,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const errs = validationResult(req);
        if (!errs.isEmpty()) {
            logger.warn("Failed get profile attempt", {
                ip: req.ip,
                errors: errs.array(),
                reason: "validation_error",
            });
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
                logger.warn("Failed get profile attempt", {
                    ip: req.ip,
                    userProfile,
                    reason: "not_found",
                });

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
            logger.warn("Failed get user profile attempt", {
                ip: req.ip,
                userId,
                reason: "invalid_user_id",
            });

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
            logger.warn("Failed get user profile attempt", {
                ip: req.ip,
                errors: errs.array(),
                reason: "validation_error",
            });

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
                logger.warn("Failed get user profile attempt", {
                    ip: req.ip,
                    errors: errs.array(),
                    reason: "user_not_found",
                });

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
            logger.warn("Failed update user profile attempt", {
                ip: req.ip,
                errors: err.array(),
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
                logger.warn("Failed update user profile attempt", {
                    ip: req.ip,
                    username,
                    reason: "user_already_taken",
                });

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
                logger.warn("Failed update user profile attempt", {
                    ip: req.ip,
                    googleId: req.user!.googleId,
                    reason: "oauth_no_password",
                });

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
                logger.warn("Failed update user profile attempt", {
                    ip: req.ip,
                    user: updatedUserProfile,
                    reason: "user_not_found",
                });

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
                logger.warn("Failed delete user profile attempt", {
                    ip: req.ip,
                    user: deletedUser,
                    reason: "user_not_found",
                });

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

export const updateProfilePicture = [
    authenticateJWT,
    ...validateProfilePicture,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const err = validationResult(req);
        if (!err.isEmpty()) {
            logger.warn("Failed update user profile picture attempt", {
                ip: req.ip,
                errors: err.array(),
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

        const file = req.file;
        if (!file) {
            logger.warn("Failed update user profile picture attempt", {
                ip: req.ip,
                file,
                reason: "missing_data_file",
            });

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
