import { NextFunction, Response } from "express";
import prisma from "../db/prisma";
import { AuthenticatedRequest } from "../types";
import { authenticateJWT } from "../middleware/auth";
import { body, validationResult, matchedData, param } from "express-validator";
import { FollowStatus } from "../../generated/prisma";

const validateSendFollow = [
    body("recipientId")
        .isInt()
        .withMessage("Recipient ID must be a valid integer"),
];

const validateUpdateFollow = [
    param("followId").isUUID().withMessage("Follow ID must be a valid UUID"),
    body("status")
        .isIn(["ACCEPTED", "REFUSED"])
        .withMessage("Status must be ACCEPTED or REFUSED"),
];

const validateBlockUser = [
    param("userId").isInt().withMessage("User ID must be an Integer"),
];

const validateDeleteFollow = [
    param("followId").isUUID().withMessage("Follow ID must be a valid UUID"),
];

export const sendFollow = [
    authenticateJWT,
    ...validateSendFollow,
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

        const { recipientId } = matchedData(req);
        const senderId = req.user!.id;

        // check if the user is trying to follow themselves
        if (recipientId === senderId) {
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
                                select: {
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
                                },
                            });
                            return res.status(201).json({
                                success: true,
                                message: "Accepted friend request successfully",
                                data: {
                                    follow: acceptedFollow,
                                },
                            });
                        }
                        // if the user who sent the follow request is not the recipient, that means they sent it twice and it creates a conflict
                        if (follow.senderId === senderId) {
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
                                select: {
                                    id: true,
                                    status: true,
                                    createdAt: true,
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
                                },
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
                                select: {
                                    id: true,
                                    status: true,
                                    createdAt: true,
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
                                },
                            });
                            return res.status(201).json({
                                success: true,
                                message: "Followed user successfully",
                                data: { follow: newFollow },
                            });
                        }
                }
            } else {
                // if the follow doesn't exist, create a new PENDING one
                const createFollow = await prisma.follow.create({
                    data: {
                        senderId,
                        recipientId,
                    },
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
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
                    },
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

            if (follow?.status === "BLOCKED") {
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
                select: {
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
                },
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

            let updatedFollow;
            if (follow) {
                updatedFollow = await prisma.follow.update({
                    where: {
                        id: follow.id,
                    },
                    data: {
                        status: "BLOCKED",
                    },
                    select: {
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
                    },
                });
            } else {
                updatedFollow = await prisma.follow.create({
                    data: {
                        senderId: req.user!.id,
                        recipientId: userId,
                        status: "BLOCKED",
                    },
                    select: {
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
                    },
                });
            }

            return res.json({
                success: true,
                message: "Blocked user successfully",
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
                select: {
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
                },
            });

            return res.json({
                success: true,
                message: ["Successfully unfollowed user"],
                data: {
                    follow: deletedFollow,
                },
            });
        } catch (err) {
            next(err);
        }
    },
];
