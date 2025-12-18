import "dotenv/config";
import request from "supertest";
import app from "../../app";
import { prisma } from "../setup";
import bcrypt from "bcryptjs";

describe("GET /api/v1/posts/:postId", () => {
    let hashedPassword: string;
    let authCookie: string;
    let user: any;
    let post: any;

    beforeAll(async () => {
        hashedPassword = await bcrypt.hash("password123", 1);
    });

    beforeEach(async () => {
        user = await prisma.user.create({
            data: {
                username: "testuser",
                password: hashedPassword,
            },
        });

        const response = await request(app).post("/api/v1/auth/login").send({
            username: "testuser",
            password: "password123",
        });

        authCookie = response.headers["set-cookie"][0];

        post = await prisma.post.create({
            data: {
                text: "Test post for comments",
                userId: user.id,
            },
        });
    });

    beforeEach(async () => {
        const comments = [];
        const now = new Date();
        for (let i = 1; i <= 25; i++) {
            comments.push({
                text: `Test comment ${i}`,
                userId: user.id,
                postId: post.id,
                // for the return comments in descending order test
                createdAt: new Date(now.getTime() - i),
            });
        }
        await prisma.comment.createMany({ data: comments });
    });

    describe("successful fetch", () => {
        it("should return the post with first page of comments", async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.post).toBeDefined();
            expect(response.body.data.post.id).toBe(post.id);
            expect(response.body.data.comments).toHaveLength(10);
            expect(response.body.data.nextCursor).toBeDefined();
        });

        it("should return the first and second page of comments", async () => {
            const firstPageResponse = await request(app)
                .get(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie);

            expect(firstPageResponse.status).toBe(200);
            expect(firstPageResponse.body.success).toBe(true);
            expect(firstPageResponse.body.data.comments).toHaveLength(10);
            expect(firstPageResponse.body.data.nextCursor).toBeDefined();

            const secondPageResponse = await request(app)
                .get(
                    `/api/v1/posts/${post.id}?cursor=${firstPageResponse.body.data.nextCursor}`,
                )
                .set("Cookie", authCookie);

            expect(secondPageResponse.status).toBe(200);
            expect(secondPageResponse.body.success).toBe(true);
            expect(secondPageResponse.body.data.comments).toHaveLength(10);
            expect(secondPageResponse.body.data.nextCursor).toBeDefined();
        });
    });

    describe("cursor-based pagination for comments", () => {
        it("should have no duplicate comments between pages", async () => {
            const firstPageResponse = await request(app)
                .get(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie);

            const secondPageResponse = await request(app)
                .get(
                    `/api/v1/posts/${post.id}?cursor=${firstPageResponse.body.data.nextCursor}`,
                )
                .set("Cookie", authCookie);

            const firstPageIds = firstPageResponse.body.data.comments.map(
                (c: any) => c.id,
            );
            const secondPageIds = secondPageResponse.body.data.comments.map(
                (c: any) => c.id,
            );

            const duplicates = firstPageIds.filter((id: string) =>
                secondPageIds.includes(id),
            );

            expect(duplicates).toHaveLength(0);
        });

        it("should return comments in descending order", async () => {
            const firstPageResponse = await request(app)
                .get(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie);

            const secondPageResponse = await request(app)
                .get(
                    `/api/v1/posts/${post.id}?cursor=${firstPageResponse.body.data.nextCursor}`,
                )
                .set("Cookie", authCookie);

            const firstPageNewest = firstPageResponse.body.data.comments[0];
            const secondPageOldest = secondPageResponse.body.data.comments[0];

            expect(
                new Date(firstPageNewest.createdAt).getTime(),
            ).toBeGreaterThan(new Date(secondPageOldest.createdAt).getTime());
        });
    });

    describe("cursor & limit validation", () => {
        it("should return undefined nextCursor on last page of comments", async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${post.id}?limit=50`)
                .set("Cookie", authCookie);

            expect(response.body.data.nextCursor).toBeUndefined();
        });

        it("should respect custom limit for comments", async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${post.id}?limit=5`)
                .set("Cookie", authCookie);

            expect(response.body.data.comments).toHaveLength(5);
        });

        it("should reject invalid cursor", async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${post.id}?cursor=invalid-uuid`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(400);
        });

        it("should reject invalid post ID", async () => {
            const response = await request(app)
                .get("/api/v1/posts/invalid-uuid")
                .set("Cookie", authCookie);

            expect(response.status).toBe(400);
        });
    });

    describe("search functionality", () => {
        beforeEach(async () => {
            await prisma.comment.createMany({
                data: [
                    {
                        text: "Apple banana cherry",
                        userId: user.id,
                        postId: post.id,
                    },
                    {
                        text: "Banana orange grape",
                        userId: user.id,
                        postId: post.id,
                    },
                    {
                        text: "Cherry grape apple",
                        userId: user.id,
                        postId: post.id,
                    },
                ],
            });
        });

        it("should return comments matching search query", async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${post.id}?search=banana`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.data.comments).toHaveLength(2);
            expect(
                response.body.data.comments.every((c: any) =>
                    c.text.toLowerCase().includes("banana"),
                ),
            ).toBe(true);
        });

        it("should return empty array for no matching search", async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${post.id}?search=watermelon`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.data.comments).toHaveLength(0);
        });
    });

    describe("post not found", () => {
        it("should return 404 for non-existent post", async () => {
            const nonExistentId = crypto.randomUUID();
            const response = await request(app)
                .get(`/api/v1/posts/${nonExistentId}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
});
