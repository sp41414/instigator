import prisma from "../db/prisma";
import { NextFunction, Response } from "express";
import { authenticateJWT } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import { body, validationResult, matchedData } from "express-validator";

const validateCreatePost = [
    body("text")
        .trim()
        .isLength({
            min: 1,
            max: 400,
        })
        .withMessage("Post must be between 1 and 400 characters long"),
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
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {},
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
