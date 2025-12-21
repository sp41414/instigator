import { NextFunction, Response } from "express";
import prisma from "../db/prisma";
import { AuthenticatedRequest } from "../types";
import { authenticateJWT } from "../middleware/auth";
import { validationResult, matchedData } from "express-validator";
import { FollowStatus } from "../../generated/prisma";
import {
    validateLogin,
    validateSendFollow,
    validateUpdateFollow,
    validateBlockUser,
    validateDeleteFollow,
} from "../middleware/validation";
import logger from "../utils/logger";

const userSelect = {
    id: true,
    status: true,
    createdAt: true,
    acceptedAt: true,
    sender: {
        select: {
            username: true,
        },
    },
    recipient: {
        select: {
            username: true,
        },
    },
};

const detailedUserSelect = {
    id: true,
    status: true,
    createdAt: true,
    acceptedAt: true,
    sender: {
        select: {
            username: true,
            aboutMe: true,
            profile_picture_url: true,
            createdAt: true,
        },
    },

    recipient: {
        select: {
            username: true,
            aboutMe: true,
            profile_picture_url: true,
            createdAt: true,
        },
    },
};

export const getFollows = [
    authenticateJWT,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.user!.id;
        try {
            const [incoming, pending, blocked, acceptedRequests] =
                await prisma.$transaction([
                    prisma.follow.findMany({
                        where: { recipientId: userId, status: "PENDING" },
                        select: detailedUserSelect,
                    }),
                    prisma.follow.findMany({
                        where: { senderId: userId, status: "PENDING" },
                        select: detailedUserSelect,
                    }),
                    prisma.follow.findMany({
                        where: { senderId: userId, status: "BLOCKED" },
                        select: detailedUserSelect,
                    }),
                    prisma.follow.findMany({
                        where: {
                            status: "ACCEPTED",
                            OR: [{ recipientId: userId }, { senderId: userId }],
                        },
                        include: { sender: true, recipient: true },
                    }),
                ]);

            // automatically access the user (friend) to clean up frontend code
            const accepted = acceptedRequests.map((f) => ({
                id: f.id,
                acceptedAt: f.acceptedAt,
                user: f.senderId === userId ? f.recipient : f.sender,
            }));

            return res.json({
                success: true,
                message: "Successfully retrieved relationships",
                data: {
                    accepted,
                    blocked,
                    pending,
                    incoming,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

export const sendFollow = [
    authenticateJWT,
    ...validateSendFollow,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const errs = validationResult(req);
        if (!errs.isEmpty()) {
            logger.warn("Failed send follow attempt", {
                ip: req.ip,
                error: errs.array(),
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

        const { recipientId } = matchedData(req);
        const senderId = req.user!.id;

        // check if the user is trying to follow themselves
        if (recipientId === senderId) {
            logger.warn("Failed send follow attempt", {
                ip: req.ip,
                reason: "follow_self",
            });

            return res.status(400).json({
                success: false,
                message: ["Cannot follow yourself!"],
                error: {
                    code: "BAD_REQUEST",
                    timestamp: new Date().toISOString(),
                },
            });
        }

        try {
            const recipient = await prisma.user.findUnique({
                where: {
                    id: recipientId,
                },
            });
            // check if the recipient doesnt exist
            if (!recipient) {
                logger.warn("Failed send follow attempt", {
                    ip: req.ip,
                    recipientId,
                    reason: "recipient_not_found",
                });

                return res.status(404).json({
                    success: false,
                    message: ["Recipient user not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const follow = await prisma.follow.findFirst({
                where: {
                    OR: [
                        { senderId, recipientId },
                        { senderId: recipientId, recipientId: senderId },
                    ],
                },
            });

            // check if the follow already exists
            if (follow) {
                switch (follow.status) {
                    // if the user is blocked, check if the sender or the recipient blocked them
                    case "BLOCKED":
                        logger.warn("Failed send follow attempt", {
                            ip: req.ip,
                            follow: follow.status,
                            reason: "blocked",
                        });
                        if (follow.senderId === recipientId) {
                            return res.status(403).json({
                                success: false,
                                message: ["You have been blocked by this user"],
                                error: {
                                    code: "FORBIDDEN",
                                    timestamp: new Date().toISOString(),
                                },
                            });
                        }
                        if (follow.senderId === senderId) {
                            return res.status(403).json({
                                success: false,
                                message: ["You have blocked this user"],
                                error: {
                                    code: "FORBIDDEN",
                                    timestamp: new Date().toISOString(),
                                },
                            });
                        }
                        logger.error("Failed send follow attempt", {
                            ip: req.ip,
                            follow: follow.status,
                            reason: "unexpected_state",
                        });
                        return res.status(500).json({
                            success: false,
                            message: ["Unexpected block state"],
                            error: {
                                code: "INTERNAL_SERVER_ERROR",
                                timestamp: new Date().toISOString(),
                            },
                        });
                    case "PENDING":
                        // if the recipient sends a friend request to a user who already sent them a friend request, it is automatically accepted.
                        if (follow.senderId === recipientId) {
                            const acceptedFollow = await prisma.follow.update({
                                where: {
                                    id: follow.id,
                                },
                                data: {
                                    status: "ACCEPTED",
                                    acceptedAt: new Date(),
                                },
                                select: userSelect,
                            });
                            return res.json({
                                success: true,
                                message: "Accepted friend request successfully",
                                data: {
                                    follow: acceptedFollow,
                                },
                            });
                        }
                        // if the user who sent the follow request is not the recipient, that means they sent it twice and it creates a conflict
                        if (follow.senderId === senderId) {
                            logger.warn("Failed send follow attempt", {
                                ip: req.ip,
                                senderId,
                                reason: "follow_request_already_sent",
                            });
                            return res.status(409).json({
                                success: false,
                                message: [
                                    "You already sent a follow request to this user",
                                ],
                                error: {
                                    code: "CONFLICT",
                                    timestamp: new Date().toISOString(),
                                },
                            });
                        }

                        logger.error("Failed send follow attempt", {
                            ip: req.ip,
                            follow: follow.status,
                            reason: "unexpected_state",
                        });

                        return res.status(500).json({
                            success: false,
                            message: [
                                "Unexpected follow state in PENDING case",
                            ],
                            error: {
                                code: "INTERNAL_SERVER_ERROR",
                                timestamp: new Date().toISOString(),
                            },
                        });
                    case "ACCEPTED":
                        // if the status is accepted, and the user sends another request, it's a conflict
                        logger.warn("Failed send follow attempt", {
                            ip: req.ip,
                            senderId,
                            reason: "already_following",
                        });
                        return res.status(409).json({
                            success: false,
                            message: ["You are already following this user"],
                            error: {
                                code: "CONFLICT",
                                timestamp: new Date().toISOString(),
                            },
                        });
                    case "REFUSED":
                        // if the recipient refused, the sender can send another request as long as the status is not (^^) BLOCKED (^^)
                        if (follow.senderId === senderId) {
                            const updatedFollow = await prisma.follow.update({
                                where: {
                                    id: follow.id,
                                },
                                data: {
                                    status: "PENDING",
                                },
                                select: userSelect,
                            });
                            return res.json({
                                success: true,
                                message: "Followed user successfully",
                                data: {
                                    follow: updatedFollow,
                                },
                            });
                        } else {
                            // if the recipient tries to send after refusing, create new request
                            const newFollow = await prisma.follow.update({
                                where: { id: follow.id },
                                data: {
                                    senderId,
                                    recipientId,
                                    status: "PENDING",
                                },
                                select: userSelect,
                            });
                            return res.json({
                                success: true,
                                message: "Followed user successfully",
                                data: { follow: newFollow },
                            });
                        }
                    default:
                        logger.error("Failed send follow attempt", {
                            ip: req.ip,
                            follow: follow.status,
                            reason: "unexpected_state",
                        });

                        return res.status(500).json({
                            success: false,
                            message: ["Unexpected follow state"],
                            error: {
                                code: "INTERNAL_SERVER_ERROR",
                                timestamp: new Date().toISOString(),
                            },
                        });
                }
            } else {
                // if the follow doesn't exist, create a new PENDING one
                const createFollow = await prisma.follow.create({
                    data: {
                        senderId,
                        recipientId,
                    },
                    select: userSelect,
                });

                return res.status(201).json({
                    success: true,
                    message: "Followed user successfully",
                    data: {
                        follow: createFollow,
                    },
                });
            }
            return res.status(500).json({
                success: false,
                message: ["Unexpected follow state"],
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

// ACCEPT / REFUSE a follow request, recipient only
export const updateFollowStatus = [
    authenticateJWT,
    ...validateUpdateFollow,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const errs = validationResult(req);
        if (!errs.isEmpty()) {
            logger.warn("Failed accept/refuse follow attempt", {
                ip: req.ip,
                error: errs.array(),
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

        const { status } = matchedData(req) as { status: FollowStatus };
        const { followId } = matchedData(req);
        const userId = req.user!.id;

        try {
            const follow = await prisma.follow.findUnique({
                where: {
                    id: followId,
                },
            });

            if (!follow) {
                logger.warn("Failed accept/refuse follow attempt", {
                    ip: req.ip,
                    follow,
                    reason: "follow_not_found",
                });

                return res.status(404).json({
                    success: false,
                    message: ["Follow request not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (follow?.recipientId !== userId) {
                logger.warn("Failed accept/refuse follow attempt", {
                    ip: req.ip,
                    recipientId: follow.recipientId,
                    userId,
                    reason: "sender_accept_refuse_follow_forbidden",
                });

                return res.status(403).json({
                    success: false,
                    message: [
                        "Only the recipient can accept or refuse the request",
                    ],
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (follow?.status === status) {
                logger.warn("Failed accept/refuse follow attempt", {
                    ip: req.ip,
                    recipientId: follow.recipientId,
                    userId,
                    status,
                    reason: "duplicate_follow_status_request",
                });

                return res.status(400).json({
                    success: false,
                    message: [`Status is already ${status}`],
                    error: {
                        code: "BAD_REQUEST",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (follow?.status === "BLOCKED") {
                logger.warn("Failed accept/refuse follow attempt", {
                    ip: req.ip,
                    recipientId: follow.recipientId,
                    userId,
                    status,
                    reason: "follow_blocked",
                });

                return res.status(400).json({
                    success: false,
                    message: ["Cannot update blocked relationship"],
                    error: {
                        code: "BAD_REQUEST",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (status === "PENDING") {
                logger.warn("Failed accept/refuse follow attempt", {
                    ip: req.ip,
                    recipientId: follow.recipientId,
                    userId,
                    status,
                    reason: "update_follow_to_pending",
                });

                return res.status(400).json({
                    success: false,
                    message: ["Cannot go back to pending status"],
                    error: {
                        code: "BAD_REQUEST",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const updatedFollow = await prisma.follow.update({
                where: {
                    id: followId,
                },
                data: {
                    status: status,
                    acceptedAt: status === "ACCEPTED" ? new Date() : null,
                },
                select: userSelect,
            });

            return res.json({
                success: true,
                message: "Follow status updated successfully",
                data: {
                    follow: updatedFollow,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

// block a user
export const blockUser = [
    authenticateJWT,
    ...validateBlockUser,
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

        const { userId } = matchedData(req);
        if (userId === req.user!.id) {
            logger.warn("Failed block follow attempt", {
                ip: req.ip,
                userId,
                reason: "block_self",
            });

            return res.status(400).json({
                success: false,
                message: ["Cannot block yourself"],
                error: {
                    code: "BAD_REQUEST",
                    timestamp: new Date().toISOString(),
                },
            });
        }
        try {
            const userToBlock = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!userToBlock) {
                logger.warn("Failed block follow attempt", {
                    ip: req.ip,
                    userId,
                    userToBlock,
                    reason: "block_user_not_found",
                });
                return res.status(404).json({
                    success: false,
                    message: ["User not found"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const follow = await prisma.follow.findFirst({
                where: {
                    OR: [
                        { senderId: req.user!.id, recipientId: userId },
                        { senderId: userId, recipientId: req.user!.id },
                    ],
                },
            });

            if (follow?.status === "BLOCKED") {
                logger.warn("Failed block follow attempt", {
                    ip: req.ip,
                    userId,
                    status: follow.status,
                    reason: "duplicate_block_request",
                });
                return res.status(400).json({
                    success: false,
                    message: ["User is already blocked"],
                    error: {
                        code: "BAD_REQUEST",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            let updatedFollow;
            if (follow) {
                updatedFollow = await prisma.follow.update({
                    where: {
                        id: follow.id,
                    },
                    data: {
                        status: "BLOCKED",
                        senderId: req.user!.id,
                        recipientId: userId,
                    },
                    select: userSelect,
                });
            } else {
                updatedFollow = await prisma.follow.create({
                    data: {
                        senderId: req.user!.id,
                        recipientId: userId,
                        status: "BLOCKED",
                    },
                    select: userSelect,
                });
            }

            return res.json({
                success: true,
                message: ["Blocked user successfully"],
                data: {
                    follow: updatedFollow,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];

// cancel or unfriend a user
export const deleteFollow = [
    authenticateJWT,
    ...validateDeleteFollow,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const errs = validationResult(req);
        if (!errs.isEmpty()) {
            logger.warn("Failed delete follow attempt", {
                ip: req.ip,
                error: errs.array(),
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

        const { followId } = matchedData(req);
        try {
            const follow = await prisma.follow.findUnique({
                where: {
                    id: followId,
                },
            });

            if (!follow) {
                logger.warn("Failed delete follow attempt", {
                    ip: req.ip,
                    error: errs.array(),
                    reason: "follow_not_found",
                });

                return res.status(404).json({
                    success: false,
                    message: [
                        "You are currently not following or blocking this user",
                    ],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (
                follow.senderId !== req.user!.id &&
                follow.recipientId !== req.user!.id
            ) {
                logger.warn("Failed delete follow attempt", {
                    ip: req.ip,
                    error: errs.array(),
                    reason: "unauthorized",
                });

                return res.status(403).json({
                    success: false,
                    message: [
                        "You are not authorized to delete this follow relationship",
                    ],
                    error: {
                        code: "FORBIDDEN",
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            const deletedFollow = await prisma.follow.delete({
                where: {
                    id: follow.id,
                },
                select: userSelect,
            });

            // cases:
            // 1. blocked, gives unblocked message
            // 2. pending, gives cancelled friend request message
            // 3. accepted/refused, gives unfollowed user message
            return res.json({
                success: true,
                message: [
                    follow.status === "BLOCKED"
                        ? "Successfully unblocked user"
                        : follow.status === "PENDING"
                          ? "Successfully cancelled request"
                          : "Successfully unfollowed user",
                ],
                data: {
                    follow: deletedFollow,
                },
            });
        } catch (err: any) {
            // handles race condition
            if (err.code === "P2025") {
                logger.warn("Failed delete follow attempt", {
                    ip: req.ip,
                    error: errs.array(),
                    reason: "already_deleted_race_condition",
                });

                return res.status(404).json({
                    success: false,
                    message: ["Relationship was already deleted"],
                    error: {
                        code: "NOT_FOUND",
                        timestamp: new Date().toISOString(),
                    },
                });
            }
            next(err);
        }
    },
];
