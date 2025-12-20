import prisma from "../db/prisma";
import { NextFunction, Response } from "express";
import { authenticateJWT } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import {
    body,
    validationResult,
    matchedData,
    query,
    param,
} from "express-validator";

const validateCreatePost = [
    body("text")
        .trim()
        .isLength({
            min: 1,
            max: 400,
        })
        .withMessage("Post must be between 1 and 400 characters long"),
];

const validateDeletePost = [
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
];

const validateUpdatePost = [
    body("text")
        .optional()
        .trim()
        .isLength({
            min: 1,
            max: 400,
        })
        .withMessage("Post must be between 1 and 400 characters long"),
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
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

const validateGetPost = [
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
    // paginaton for comments
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

            return res.status(201).json({
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
                            mode: "insensitive",
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
    ...validateGetPost,
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

        const { postId, cursor, limit = 10, search } = matchedData(req);
        try {
            const post = await prisma.post.findUnique({
                where: {
                    id: postId,
                },
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

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: ["Post not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const comments = await prisma.comment.findMany({
                where: {
                    postId: post?.id,
                    ...(search && {
                        text: { contains: search, mode: "insensitive" },
                    }),
                },
                take: limit + 1,
                ...(cursor && {
                    skip: 1,
                    cursor: {
                        id: cursor,
                    },
                }),
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            likes: true,
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
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                    {
                        id: "asc",
                    },
                ],
            });

            let nextCursor: string | undefined;
            if (comments.length > limit) {
                const lastComment = comments.pop();
                nextCursor = lastComment!.id;
            }

            return res.json({
                success: true,
                message: "Fetched comments successfully",
                data: {
                    post,
                    comments,
                    nextCursor,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const updatePost = [
    authenticateJWT,
    ...validateUpdatePost,
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

        const { text, postId } = matchedData(req);
        try {
            const post = await prisma.post.findUnique({
                where: {
                    id: postId,
                },
            });

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: ["Post not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (post.userId !== req.user?.id) {
                return res.status(403).json({
                    success: false,
                    message: ["Cannot update another user's post!"],
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const updatedPost = await prisma.post.update({
                where: {
                    id: post.id,
                    userId: req.user!.id,
                },
                data: {
                    ...(text && { text }),
                },
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    updatedAt: true,
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
                message: "Updated post successfully",
                data: {
                    post: updatedPost,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const deletePost = [
    authenticateJWT,
    ...validateDeletePost,
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

        const { postId } = matchedData(req);
        const userId = req.user?.id;

        try {
            const post = await prisma.post.findUnique({
                where: {
                    id: postId,
                },
            });

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: ["Post not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }
            if (post.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: ["Cannot delete another user's post!"],
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const deletedPost = await prisma.post.delete({
                where: {
                    id: postId,
                    userId,
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
                message: "Deleted post successfully",
                data: {
                    post: deletedPost,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

// comments
// validation

const validateCreateComment = [
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
    body("text")
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage("Comment must be between 1 and 200 characters long"),
];

const validateUpdateComment = [
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
    param("commentId")
        .trim()
        .isUUID()
        .withMessage("Comment ID must be a valid UUID"),
    body("text")
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage("Comment must be between 1 and 200 characters long"),
];

const validateDeleteComment = [
    param("postId").trim().isUUID().withMessage("Post ID must be a valid UUID"),
    param("commentId")
        .trim()
        .isUUID()
        .withMessage("Comment ID must be a valid UUID"),
];

// controllers

export const createComment = [
    authenticateJWT,
    ...validateCreateComment,
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

        const { text, postId } = matchedData(req);
        try {
            const post = await prisma.post.findUnique({
                where: {
                    id: postId,
                },
            });

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: ["Post not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const blocked = await prisma.follow.findFirst({
                where: {
                    OR: [
                        {
                            senderId: post.userId,
                            recipientId: req.user!.id,
                            status: "BLOCKED",
                        },
                        {
                            senderId: req.user!.id,
                            recipientId: post.userId,
                            status: "BLOCKED",
                        },
                    ],
                },
            });

            if (blocked) {
                return res.status(403).json({
                    success: false,
                    message: [
                        "Cannot comment on this post due to blocking relationship",
                    ],
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const createdComment = await prisma.comment.create({
                data: {
                    text,
                    userId: req.user!.id,
                    postId: post.id,
                },
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            likes: true,
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

            return res.status(201).json({
                success: true,
                message: "Created comment successfully",
                data: {
                    comment: createdComment,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const updateComment = [
    authenticateJWT,
    ...validateUpdateComment,
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

        const { text, postId, commentId } = matchedData(req);

        try {
            const post = await prisma.post.findUnique({
                where: {
                    id: postId,
                },
            });

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: ["Post not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const comment = await prisma.comment.findUnique({
                where: {
                    id: commentId,
                    postId,
                },
            });

            if (!comment) {
                return res.status(404).json({
                    success: false,
                    message: ["Comment not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (comment.userId !== req.user!.id) {
                return res.status(403).json({
                    success: false,
                    message: ["Cannot update another user's comment!"],
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const updatedComment = await prisma.comment.update({
                where: {
                    id: comment.id,
                    userId: req.user!.id,
                    postId,
                },
                data: {
                    ...(text && { text }),
                },
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            likes: true,
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
                message: "Updated comment successfully",
                data: {
                    comment: updatedComment,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const deleteComment = [
    authenticateJWT,
    ...validateDeleteComment,
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

        const { postId, commentId } = matchedData(req);
        try {
            const post = await prisma.post.findUnique({
                where: {
                    id: postId,
                },
            });

            if (!post) {
                return res.status(404).json({
                    success: false,
                    message: ["Post not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const comment = await prisma.comment.findUnique({
                where: {
                    id: commentId,
                    postId,
                },
            });

            if (!comment) {
                return res.status(404).json({
                    success: false,
                    message: ["Comment not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (comment.userId !== req.user!.id) {
                return res.status(403).json({
                    success: false,
                    message: ["Cannot delete another user's comment!"],
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const deletedComment = await prisma.comment.delete({
                where: {
                    id: comment.id,
                    userId: req.user!.id,
                    postId,
                },
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            likes: true,
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
                message: "Successfully deleted comment",
                data: {
                    comment: deletedComment,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];
