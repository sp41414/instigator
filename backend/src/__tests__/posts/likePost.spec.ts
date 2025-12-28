import "dotenv/config";
import request from "supertest";
import app from "../../app.js";
import { prisma } from "../setup.js";
import bcrypt from "bcryptjs";

describe("POST /api/v1/posts/:postId/like", () => {
    let user1: any;
    let user2: any;
    let post: any;
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
    });

    describe("successfully likes post", () => {
        it("should like a post", async () => {
            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Successfully liked post");
            expect(res.body.data.liked).toBe(true);

            const updatedPost: any = await prisma.post.findUnique({
                where: {
                    id: post.id,
                },
                select: {
                    _count: {
                        select: {
                            likes: true,
                        },
                    },
                },
            });

            expect(updatedPost._count.likes).toBe(1);
        });
        it("should unlike a post", async () => {
            await request(app)
                .post(`/api/v1/posts/${post.id}/like`)
                .set("Cookie", authCookie);

            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Successfully unliked post");
            expect(res.body.data.liked).toBe(false);

            const updatedPost: any = await prisma.post.findUnique({
                where: {
                    id: post.id,
                },
                select: {
                    _count: {
                        select: {
                            likes: true,
                        },
                    },
                },
            });

            expect(updatedPost._count.likes).toBe(0);
        });

        it("should be able to like user's own post", async () => {
            const newPost = await prisma.post.create({
                data: {
                    text: "Second post text",
                    userId: user1.id,
                },
            });

            const res = await request(app)
                .post(`/api/v1/posts/${newPost.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Successfully liked post");
            expect(res.body.data.liked).toBe(true);

            const updatedPost: any = await prisma.post.findUnique({
                where: {
                    id: newPost.id,
                },
                select: {
                    _count: {
                        select: {
                            likes: true,
                        },
                    },
                },
            });

            expect(updatedPost._count.likes).toBe(1);
        });

        it("should be able to unlike user's own post", async () => {
            const newPost = await prisma.post.create({
                data: {
                    text: "Second post text",
                    userId: user1.id,
                },
            });

            await request(app)
                .post(`/api/v1/posts/${newPost.id}/like`)
                .set("Cookie", authCookie);

            const res = await request(app)
                .post(`/api/v1/posts/${newPost.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Successfully unliked post");
            expect(res.body.data.liked).toBe(false);

            const updatedPost: any = await prisma.post.findUnique({
                where: {
                    id: newPost.id,
                },
                select: {
                    _count: {
                        select: {
                            likes: true,
                        },
                    },
                },
            });

            expect(updatedPost._count.likes).toBe(0);
        });
    });

    describe("validation errors", () => {
        it("should reject non-uuid post id", async () => {
            const res = await request(app)
                .post(`/api/v1/posts/11/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(400);
            expect(res.body.message[0].msg).toMatch(/valid UUID/i);
            expect(res.body.error.code).toBe("BAD_REQUEST");
        });

        it("should reject non-existent post", async () => {
            const res = await request(app)
                .post(`/api/v1/posts/${crypto.randomUUID()}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(404);
            expect(res.body.message[0]).toMatch(/not found/i);
            expect(res.body.error.code).toBe("NOT_FOUND");
        });
    });

    describe("follow relationships", () => {
        it("should reject like when user blocked post author", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                    status: "BLOCKED",
                },
            });

            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(403);
            expect(res.body.message[0]).toMatch(/BLOCKED relationship/i);
            expect(res.body.error.code).toBe("FORBIDDEN");
        });

        it("should reject like when post author blocked user", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user2.id,
                    recipientId: user1.id,
                    status: "BLOCKED",
                },
            });

            const res = await request(app)
                .post(`/api/v1/posts/${post.id}/like`)
                .set("Cookie", authCookie);

            expect(res.status).toBe(403);
            expect(res.body.message[0]).toMatch(/BLOCKED relationship/i);
            expect(res.body.error.code).toBe("FORBIDDEN");
        });
    });
});
