import "dotenv/config";
import request from "supertest";
import app from "../../../app";
import { prisma } from "../../setup";
import bcrypt from "bcryptjs";

describe("POST /api/v1/posts/:postId/comments/:commentId/like", () => {
    let user1: any;
    let user2: any;
    let post: any;
    let comment: any;
    let authCookie: string;
    let hashedPassword: string;

    beforeAll(async () => {
        hashedPassword = await bcrypt.hash("password123", 1);
    });

    beforeEach(async () => {
        user1 = await prisma.user.create({
            data: {
                username: "user1",
                password: hashedPassword,
            },
        });

        user2 = await prisma.user.create({
            data: {
                username: "user2",
                password: hashedPassword,
            },
        });

        const response = await request(app).post("/api/v1/auth/login").send({
            username: "user1",
            password: "password123",
        });

        authCookie = response.headers["set-cookie"][0];

        post = await prisma.post.create({
            data: {
                text: "Original post text",
                userId: user2.id,
            },
        });

        comment = await prisma.comment.create({
            data: {
                text: "A comment on the post",
                userId: user2.id,
                postId: post.id,
            },
        });
    });

    describe("successfully likes comment", () => {
        it("should like a comment", async () => {
            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/comments/${comment.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Successfully liked comment");
            expect(res.body.data.liked).toBe(true);

            const updatedComment: any = await prisma.comment.findUnique({
                where: {
                    id: comment.id,
                },
                select: {
                    _count: {
                        select: {
                            likes: true,
                        },
                    },
                },
            });

            expect(updatedComment._count.likes).toBe(1);
        });

        it("should unlike a comment", async () => {
            await request(app)
                .post(`/api/v1/posts/${post.id}/comments/${comment.id}/like`)
                .set("Cookie", authCookie);

            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/comments/${comment.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Successfully unliked comment");
            expect(res.body.data.liked).toBe(false);

            const updatedComment: any = await prisma.comment.findUnique({
                where: {
                    id: comment.id,
                },
                select: {
                    _count: {
                        select: {
                            likes: true,
                        },
                    },
                },
            });

            expect(updatedComment._count.likes).toBe(0);
        });

        it("should be able to like user's own comment", async () => {
            const ownComment = await prisma.comment.create({
                data: {
                    text: "My own comment",
                    userId: user1.id,
                    postId: post.id,
                },
            });

            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/comments/${ownComment.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Successfully liked comment");
            expect(res.body.data.liked).toBe(true);

            const updatedComment: any = await prisma.comment.findUnique({
                where: {
                    id: ownComment.id,
                },
                select: {
                    _count: {
                        select: {
                            likes: true,
                        },
                    },
                },
            });

            expect(updatedComment._count.likes).toBe(1);
        });

        it("should be able to unlike user's own comment", async () => {
            const ownComment = await prisma.comment.create({
                data: {
                    text: "My own comment",
                    userId: user1.id,
                    postId: post.id,
                },
            });

            await request(app)
                .post(`/api/v1/posts/${post.id}/comments/${ownComment.id}/like`)
                .set("Cookie", authCookie);

            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/comments/${ownComment.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Successfully unliked comment");
            expect(res.body.data.liked).toBe(false);

            const updatedComment: any = await prisma.comment.findUnique({
                where: {
                    id: ownComment.id,
                },
                select: {
                    _count: {
                        select: {
                            likes: true,
                        },
                    },
                },
            });

            expect(updatedComment._count.likes).toBe(0);
        });

        it("should allow multiple users to like the same comment", async () => {
            await request(app)
                .post(`/api/v1/posts/${post.id}/comments/${comment.id}/like`)
                .set("Cookie", authCookie);

            const user2Response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "user2",
                    password: "password123",
                });
            const user2Cookie = user2Response.headers["set-cookie"][0];

            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/comments/${comment.id}/like`)
                .set("Cookie", user2Cookie);

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Successfully liked comment");
            expect(res.body.data.liked).toBe(true);

            const updatedComment: any = await prisma.comment.findUnique({
                where: {
                    id: comment.id,
                },
                select: {
                    _count: {
                        select: {
                            likes: true,
                        },
                    },
                },
            });

            expect(updatedComment._count.likes).toBe(2);
        });
    });

    describe("validation errors", () => {
        it("should reject non-uuid post id", async () => {
            const res = await request(app)
                .post(`/api/v1/posts/11/comments/${comment.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(400);
            expect(res.body.message[0].msg).toMatch(/valid UUID/i);
            expect(res.body.error.code).toBe("BAD_REQUEST");
        });

        it("should reject non-uuid comment id", async () => {
            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/comments/11/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(400);
            expect(res.body.message[0].msg).toMatch(/valid UUID/i);
            expect(res.body.error.code).toBe("BAD_REQUEST");
        });

        it("should reject non-existent post", async () => {
            const res = await request(app)
                .post(
                    `/api/v1/posts/${crypto.randomUUID()}/comments/${comment.id}/like`,
                )
                .set("Cookie", authCookie);

            expect(res.status).toBe(404);
            expect(res.body.message[0]).toMatch(/Comment not found/i);
            expect(res.body.error.code).toBe("NOT_FOUND");
        });

        it("should reject non-existent comment", async () => {
            const res = await request(app)
                .post(
                    `/api/v1/posts/${post.id}/comments/${crypto.randomUUID()}/like`,
                )
                .set("Cookie", authCookie);

            expect(res.status).toBe(404);
            expect(res.body.message[0]).toMatch(/Comment not found/i);
            expect(res.body.error.code).toBe("NOT_FOUND");
        });

        it("should reject comment on different post", async () => {
            const otherPost = await prisma.post.create({
                data: {
                    text: "Another post",
                    userId: user2.id,
                },
            });

            const res = await request(app)
                .post(
                    `/api/v1/posts/${otherPost.id}/comments/${comment.id}/like`,
                )
                .set("Cookie", authCookie);

            expect(res.status).toBe(404);
            expect(res.body.message[0]).toMatch(/Comment not found/i);
            expect(res.body.error.code).toBe("NOT_FOUND");
        });
    });

    describe("follow relationships", () => {
        it("should reject like when user blocked comment author", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                    status: "BLOCKED",
                },
            });

            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/comments/${comment.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(403);
            expect(res.body.message[0]).toMatch(/BLOCKED relationship/i);
            expect(res.body.error.code).toBe("FORBIDDEN");
        });

        it("should reject like when comment author blocked user", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user2.id,
                    recipientId: user1.id,
                    status: "BLOCKED",
                },
            });

            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/comments/${comment.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(403);
            expect(res.body.message[0]).toMatch(/BLOCKED relationship/i);
            expect(res.body.error.code).toBe("FORBIDDEN");
        });
    });
});
