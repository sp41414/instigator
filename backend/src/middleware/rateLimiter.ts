import rateLimit from "express-rate-limit";
import { AuthenticatedRequest } from "../types";
import { Request } from "express";

export const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    keyGenerator: (req: Request) => req.ip!,
    message: {
        success: false,
        message: ["Too many login attempts from this IP, try again later"],
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            timestamp: new Date().toISOString(),
        },
    },
});

export const signUpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 3,
    keyGenerator: (req: Request) => req.ip!,
    message: {
        success: false,
        message: ["Too many sign up attempts from this IP, try again later"],
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            timestamp: new Date().toISOString(),
        },
    },
});

export const createPostLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
        const authReq = req as AuthenticatedRequest;
        return authReq.user?.id.toString() || authReq.ip!;
    },
    skip: (req) => !(req as AuthenticatedRequest).user,
    message: {
        success: false,
        message: ["You are posting too quickly. Please wait a moment."],
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            timestamp: new Date().toISOString(),
        },
    },
});

export const createCommentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => {
        const authReq = req as AuthenticatedRequest;
        return authReq.user?.id.toString() || authReq.ip!;
    },
    skip: (req) => !(req as AuthenticatedRequest).user,
    message: {
        success: false,
        message: ["You are commenting too quickly. Please wait a moment."],
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            timestamp: new Date().toISOString(),
        },
    },
});
