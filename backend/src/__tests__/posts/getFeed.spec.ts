import "dotenv/config";
import request from "supertest";
import app from "../../app.js";
import { prisma } from "../setup.js";
import bcrypt from "bcryptjs";

describe("GET /api/v1/posts", () => {
    let hashedPassword: string;
    let authCookie: string;
    let user: any;

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
    });

    beforeEach(async () => {
        const posts = [];
        const now = new Date();
        for (let i = 1; i <= 25; i++) {
            posts.push({
                text: `Test post ${i}`,
                userId: user.id,
                // for the return posts in descending order test
                createdAt: new Date(now.getTime() - i),
            });
        }
        await prisma.post.createMany({ data: posts });
    });

    describe("successful fetch", () => {
        it("should return the first page with the default limit", async () => {
            const response = await request(app)
                .get("/api/v1/posts")
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.posts).toHaveLength(10);
            expect(response.body.data.nextCursor).toBeDefined();
        });

        it("should return the first and second page with the default limit", async () => {
            const firstPageResponse = await request(app)
                .get("/api/v1/posts")
                .set("Cookie", authCookie);

            expect(firstPageResponse.status).toBe(200);
            expect(firstPageResponse.body.success).toBe(true);
            expect(firstPageResponse.body.data.posts).toHaveLength(10);
            expect(firstPageResponse.body.data.nextCursor).toBeDefined();

            const secondPageResponse = await request(app)
                .get(
                    `/api/v1/posts?cursor=${firstPageResponse.body.data.nextCursor}`,
                )
                .set("Cookie", authCookie);

            expect(secondPageResponse.status).toBe(200);
            expect(secondPageResponse.body.success).toBe(true);
            expect(secondPageResponse.body.data.posts).toHaveLength(10);
            expect(secondPageResponse.body.data.nextCursor).toBeDefined();
        });
    });

    describe("cursor-based pagination", () => {
        it("should have no duplicate posts between pages", async () => {
            const firstPageResponse = await request(app)
                .get("/api/v1/posts")
                .set("Cookie", authCookie);

            const secondPageResponse = await request(app)
                .get(
                    `/api/v1/posts?cursor=${firstPageResponse.body.data.nextCursor}`,
                )
                .set("Cookie", authCookie);

            const firstPageIds = firstPageResponse.body.data.posts.map(
                (p: any) => p.id,
            );
            const secondPageIds = secondPageResponse.body.data.posts.map(
                (p: any) => p.id,
            );

            const duplicates = firstPageIds.filter((id: string) =>
                secondPageIds.includes(id),
            );

            expect(duplicates).toHaveLength(0);
        });
        it("should return posts in descending order", async () => {
            const firstPageResponse = await request(app)
                .get("/api/v1/posts")
                .set("Cookie", authCookie);

            const secondPageResponse = await request(app)
                .get(
                    `/api/v1/posts?cursor=${firstPageResponse.body.data.nextCursor}`,
                )
                .set("Cookie", authCookie);

            const firstPageNewest = firstPageResponse.body.data.posts[0];
            const secondPageOldest = secondPageResponse.body.data.posts[0];

            expect(
                new Date(firstPageNewest.createdAt).getTime(),
            ).toBeGreaterThan(new Date(secondPageOldest.createdAt).getTime());
        });
    });

    describe("cursor & limit validation", () => {
        it("should return undefined nextCursor on last page", async () => {
            const response = await request(app)
                .get("/api/v1/posts?limit=50")
                .set("Cookie", authCookie);

            expect(response.body.data.nextCursor).toBeUndefined();
        });

        it("should respect custom limit", async () => {
            const response = await request(app)
                .get("/api/v1/posts?limit=5")
                .set("Cookie", authCookie);

            expect(response.body.data.posts).toHaveLength(5);
        });

        it("should reject invalid cursor", async () => {
            const response = await request(app)
                .get("/api/v1/posts?cursor=invalid-uuid")
                .set("Cookie", authCookie);

            expect(response.status).toBe(400);
        });
    });
});
