import prisma from "../db/prisma.js";
import { NextFunction, Response } from "express";
import { authenticateJWT } from "../middleware/auth.js";
import { AuthenticatedRequest } from "../types/index.js";
import {
    body,
    validationResult,
    matchedData,
    query,
    param,
} from "express-validator";
import {
    validateCreatePost,
    validateDeletePost,
    validateUpdatePost,
    validateFeedQuery,
    validateGetPost,
    validateCreateComment,
    validateUpdateComment,
    validateDeleteComment,
    validateLikePost,
    validateLikeComment,
} from "../middleware/validation.js";
import { supabase } from "../config/supabase.js";
import sanitize from "sanitize-html";

const sanitizeOptions = {
    allowedTags: [
        "ul",
        "li",
        "ol",
        "em",
        "strong",
        "i",
        "s",
        "u",
        "code",
        "img",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
    ],
    allowedAttributes: {
        img: ["src", "alt"],
        allowedSchemes: ["http", "https", "mailto", "tel"],
    },
};

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

        let { text } = matchedData(req);
        text = sanitize(text, sanitizeOptions);

        try {
            const files = req.files as Express.Multer.File[];
            if (
                (!text || text.trim() === "") &&
                (!files || files.length === 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: [
                        { msg: "Post must contain text or at least one file" },
                    ],
                    error: {
                        code: "BAD_REQUEST",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const file_urls: string[] = [];

            if (files && files.length > 0) {
                const uploads = files.map(async (file) => {
                    const fileExt = file.originalname.split(".").pop();
                    // a file name such as this because upsert is enabled
                    const filePath = `${req.user!.id}/posts/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { error } = await supabase.storage
                        .from("posts-files")
                        .upload(filePath, file.buffer, {
                            contentType: file.mimetype,
                            upsert: true,
                        });

                    if (error) throw error;

                    const {
                        data: { publicUrl },
                    } = supabase.storage
                        .from("posts-files")
                        .getPublicUrl(filePath);

                    return publicUrl;
                });

                const urls = await Promise.all(uploads);
                file_urls.push(...urls);
            }
            const newPost = await prisma.post.create({
                data: {
                    text,
                    userId: req.user!.id,
                    file_urls,
                },
                select: {
                    id: true,
                    text: true,
                    file_urls: true,
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
                    file_urls: true,
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
                    file_urls: true,
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
                    cursor: {
                        id: cursor,
                    },
                }),
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    updatedAt: true,
                    file_urls: true,
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

        let { text, postId } = matchedData(req);
        text = sanitize(text, sanitizeOptions);

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
                    file_urls: true,
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

            if (post.file_urls && post.file_urls.length > 0) {
                const pathsToDelete = post.file_urls.map((url: any) => {
                    // userId/posts/filename.ext
                    return url.split("/").slice(-3).join("/");
                });

                await supabase.storage
                    .from("posts-files")
                    .remove(pathsToDelete);
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
                    file_urls: true,
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

        let { text, postId } = matchedData(req);
        text = sanitize(text, sanitizeOptions);

        try {
            const files = req.files as Express.Multer.File[];
            if (
                (!text || text.trim() === "") &&
                (!files || files.length === 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: [
                        { msg: "Post must contain text or at least one file" },
                    ],
                    error: {
                        code: "BAD_REQUEST",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const file_urls: string[] = [];

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

            if (files && files.length > 0) {
                const uploads = files.map(async (file) => {
                    const fileExt = file.originalname.split(".").pop();
                    // a file name such as this because upsert is enabled
                    const filePath = `${req.user!.id}/comments/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { error } = await supabase.storage
                        .from("comments-files")
                        .upload(filePath, file.buffer, {
                            contentType: file.mimetype,
                            upsert: true,
                        });

                    if (error) throw error;

                    const {
                        data: { publicUrl },
                    } = supabase.storage
                        .from("comments-files")
                        .getPublicUrl(filePath);

                    return publicUrl;
                });

                const urls = await Promise.all(uploads);
                file_urls.push(...urls);
            }

            const createdComment = await prisma.comment.create({
                data: {
                    text,
                    userId: req.user!.id,
                    postId: post.id,
                    file_urls,
                },
                select: {
                    id: true,
                    text: true,
                    createdAt: true,
                    updatedAt: true,
                    file_urls: true,
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

        let { text, postId, commentId } = matchedData(req);
        text = sanitize(text, sanitizeOptions);

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
                    file_urls: true,
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

            if (comment.file_urls && comment.file_urls.length > 0) {
                const pathsToDelete = comment.file_urls.map((url: any) => {
                    // userId/comments/filename.ext
                    return url.split("/").slice(-3).join("/");
                });

                await supabase.storage
                    .from("comments-files")
                    .remove(pathsToDelete);
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
                    file_urls: true,
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

export const likePost = [
    authenticateJWT,
    validateLikePost,
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

            const isBlocked = await prisma.follow.findFirst({
                where: {
                    OR: [
                        {
                            senderId: req.user!.id,
                            recipientId: post.userId,
                            status: "BLOCKED",
                        },
                        {
                            senderId: post.userId,
                            recipientId: req.user!.id,
                            status: "BLOCKED",
                        },
                    ],
                },
            });

            if (isBlocked) {
                return res.status(403).json({
                    success: false,
                    message: [
                        "Cannot like a user's post when in a BLOCKED relationship",
                    ],
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const existingLike = await prisma.likePost.findUnique({
                where: {
                    userId_postId: {
                        userId: req.user!.id,
                        postId,
                    },
                },
            });

            if (existingLike) {
                await prisma.likePost.delete({
                    where: {
                        userId_postId: {
                            userId: req.user!.id,
                            postId,
                        },
                    },
                });
                return res.json({
                    success: true,
                    message: "Successfully unliked post",
                    data: {
                        liked: false,
                    },
                });
            }

            await prisma.likePost.create({
                data: {
                    userId: req.user!.id,
                    postId,
                },
            });

            return res.status(201).json({
                success: true,
                message: "Successfully liked post",
                data: {
                    liked: true,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const likeComment = [
    authenticateJWT,
    validateLikeComment,
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
            const comment = await prisma.comment.findUnique({
                where: {
                    id: commentId,
                    postId: postId,
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

            const isBlocked = await prisma.follow.findFirst({
                where: {
                    OR: [
                        {
                            senderId: req.user!.id,
                            recipientId: comment.userId,
                            status: "BLOCKED",
                        },
                        {
                            senderId: comment.userId,
                            recipientId: req.user!.id,
                            status: "BLOCKED",
                        },
                    ],
                },
            });

            if (isBlocked) {
                return res.status(403).json({
                    success: false,
                    message: [
                        "Cannot like a user's comment when in a BLOCKED relationship",
                    ],
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const existingLike = await prisma.likeComment.findUnique({
                where: {
                    userId_commentId: {
                        userId: req.user!.id,
                        commentId: comment.id,
                    },
                },
            });

            if (existingLike) {
                await prisma.likeComment.delete({
                    where: {
                        userId_commentId: {
                            userId: req.user!.id,
                            commentId: comment.id,
                        },
                    },
                });
                return res.json({
                    success: true,
                    message: "Successfully unliked comment",
                    data: {
                        liked: false,
                    },
                });
            }

            await prisma.likeComment.create({
                data: {
                    userId: req.user!.id,
                    commentId: comment.id,
                },
            });

            return res.status(201).json({
                success: true,
                message: "Successfully liked comment",
                data: {
                    liked: true,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];
