import prisma from "../db/prisma";
import { NextFunction, Response } from "express";
import { authenticateJWT } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import { body, validationResult, matchedData, query } from "express-validator";

const validateCreatePost = [
    body("text")
        .trim()
        .isLength({
            min: 1,
            max: 400,
        })
        .withMessage("Post must be between 1 and 400 characters long"),
];

const validateFeedQuery = [
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

export const createPost = [
    authenticateJWT,
    ...validateCreatePost,
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

        const { text } = matchedData(req);

        try {
            const newPost = await prisma.post.create({
                data: {
                    text,
                    userId: req.user!.id,
                },
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            createdAt: true,
                            aboutMe: true,
                            profile_picture_url: true,
                        },
                    },
                },
            });

            return res.json({
                success: true,
                message: "Created post successfully",
                data: {
                    post: newPost,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const getFeed = [
    authenticateJWT,
    ...validateFeedQuery,
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
            const posts = await prisma.post.findMany({
                // search query
                ...(search && {
                    where: {
                        text: {
                            contains: search,
                        },
                    },
                }),
                // cursor-based pagination
                take: limit + 1,
                ...(cursor && {
                    skip: 1,
                    cursor: {
                        id: cursor,
                    },
                }),
                // order by latest to oldest post
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
                    updatedAt: true,
                    // count the comments and likes
                    _count: {
                        select: {
                            comments: true,
                            likes: true,
                        },
                    },
                    // the user who created the post
                    user: {
                        select: {
                            id: true,
                            username: true,
                            profile_picture_url: true,
                        },
                    },
                    // if the user fetching the post liked the post or not
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
                data: {
                    posts,
                    nextCursor,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const getPost = [
    authenticateJWT,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {},
];

export const updatePost = [
    authenticateJWT,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {},
];

export const deletePost = [
    authenticateJWT,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {},
];
