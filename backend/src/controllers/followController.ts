import { NextFunction, Response } from "express";
import prisma from "../db/prisma";
import { AuthenticatedRequest } from "../types";
import { authenticateJWT } from "../middleware/auth";
import { body, validationResult, matchedData } from "express-validator";

const validateSendFollow = [
    body("recipientId").isInt().withMessage("Recipient ID must be a valid integer")
]

export const sendFollow = [authenticateJWT, ...validateSendFollow, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errs = validationResult(req)
    if (!errs.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: errs.array(),
            error: {
                code: "BAD_REQUEST",
                timestamp: new Date().toISOString()
            }
        })
    }

    const { recipientId } = matchedData(req)
    const senderId = req.user!.id

    // check if the user is trying to follow themselves
    if (recipientId === senderId) {
        return res.status(400).json({
            success: false,
            message: ["Cannot follow yourself!"],
            error: {
                code: "BAD_REQUEST",
                timestamp: new Date().toISOString()
            }
        })
    }

    try {
        const recipient = await prisma.user.findUnique({
            where: {
                id: recipientId
            }
        })
        // check if the recipient doesnt exist
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: ["Recipient user not found"],
                error: {
                    code: "NOT_FOUND",
                    timestamp: new Date().toISOString()
                }
            })
        }

        const follow = await prisma.follow.findFirst({
            where: {
                OR: [
                    { senderId, recipientId },
                    { senderId: recipientId, recipientId: senderId }
                ]
            }
        })

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
                                timestamp: new Date().toISOString()
                            }
                        })
                    }
                    if (follow.senderId === senderId) {
                        return res.status(403).json({
                            success: false,
                            message: ["You have blocked this user"],
                            error: {
                                code: "FORBIDDEN",
                                timestamp: new Date().toISOString()
                            }
                        })
                    }
                    return res.status(500).json({
                        success: false,
                        message: ["Unexpected block state"],
                        error: { code: "INTERNAL_SERVER_ERROR", timestamp: new Date().toISOString() }
                    })
                case "PENDING":
                    // if the recipient sends a friend request to a user who already sent them a friend request, it is automatically accepted.
                    if (follow.senderId === recipientId) {
                        const acceptedFollow = await prisma.follow.update({
                            where: {
                                id: follow.id
                            },
                            data: {
                                status: "ACCEPTED",
                                acceptedAt: new Date()
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
                                        createdAt: true
                                    }
                                },
                                recipient: {
                                    select: {
                                        username: true,
                                        aboutMe: true,
                                        profile_picture_url: true,
                                        createdAt: true
                                    }
                                }
                            }
                        })
                        return res.status(201).json({
                            success: true,
                            message: "Accepted friend request successfully",
                            data: {
                                follow: acceptedFollow
                            }
                        })
                    }
                    // if the user who sent the follow request is not the recipient, that means they sent it twice and it creates a conflict
                    if (follow.senderId === senderId) {
                        return res.status(409).json({
                            success: false,
                            message: ["You already sent a follow request to this user"],
                            error: {
                                code: "CONFLICT",
                                timestamp: new Date().toISOString()
                            }
                        })
                    }
                    return res.status(500).json({
                        success: false,
                        message: ["Unexpected follow state in PENDING case"],
                        error: { code: "INTERNAL_SERVER_ERROR", timestamp: new Date().toISOString() }
                    })
                case "ACCEPTED":
                    // if the status is accepted, and the user sends another request, it's a conflict
                    return res.status(409).json({
                        success: false,
                        message: ["You are already following this user"],
                        error: {
                            code: "CONFLICT",
                            timestamp: new Date().toISOString()
                        }
                    })
                case "REFUSED":
                    // if the recipient refused, the sender can send another request as long as the status is not (^^) BLOCKED (^^)
                    if (follow.senderId === senderId) {
                        const updatedFollow = await prisma.follow.update({
                            where: {
                                id: follow.id
                            },
                            data: {
                                status: "PENDING"
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
                                        createdAt: true
                                    }
                                },
                                recipient: {
                                    select: {
                                        username: true,
                                        aboutMe: true,
                                        profile_picture_url: true,
                                        createdAt: true
                                    }
                                }
                            }
                        })
                        return res.json({
                            success: true,
                            message: "Followed user successfully",
                            data: {
                                follow: updatedFollow
                            }
                        })
                    } else {
                        // if the recipient tries to send after refusing, create new request
                        const newFollow = await prisma.follow.update({
                            where: { id: follow.id },
                            data: {
                                senderId,
                                recipientId,
                                status: "PENDING"
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
                                        createdAt: true
                                    }
                                },
                                recipient: {
                                    select: {
                                        username: true,
                                        aboutMe: true,
                                        profile_picture_url: true,
                                        createdAt: true
                                    }
                                }
                            }
                        })
                        return res.status(201).json({
                            success: true,
                            message: "Followed user successfully",
                            data: { follow: newFollow }
                        })
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
                            createdAt: true
                        }
                    },
                    recipient: {
                        select: {
                            username: true,
                            aboutMe: true,
                            profile_picture_url: true,
                            createdAt: true
                        }
                    }
                }
            })

            return res.status(201).json({
                success: true,
                message: "Followed user successfully",
                data: {
                    follow: createFollow
                }
            })
        }
        return res.status(500).json({
            success: false,
            message: ["Unexpected follow state"],
            error: { code: "INTERNAL_SERVER_ERROR", timestamp: new Date().toISOString() }
        })
    } catch (err) {
        next(err)
    }
}]


export const updateFollowStatus = [authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {

}]

export const deleteFollow = [authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {

}]
