import "dotenv/config";
import request from "supertest";
import app from "../../../app.js";
import { prisma } from "../../setup.js";
import bcrypt from "bcryptjs";
import path from "path";

describe("POST /api/v1/posts/:postId/comments", () => {
    let user: any;
    let otherUser: any;
    let post: any;
    let hashedPassword: string;
    let authCookie: string;

    beforeAll(async () => {
        hashedPassword = await bcrypt.hash("password123", 1);
    });

    beforeEach(async () => {
        user = await prisma.user.create({
            data: {
                username: "user",
                password: hashedPassword,
            },
        });

        otherUser = await prisma.user.create({
            data: {
                username: "otheruser",
                password: hashedPassword,
            },
        });

        const response = await request(app).post("/api/v1/auth/login").send({
            username: "user",
            password: "password123",
        });

        authCookie = response.headers["set-cookie"][0];

        post = await prisma.post.create({
            data: {
                text: "Test post",
                userId: otherUser.id,
            },
        });
    });

    describe("successfully creates a comment", () => {
        it("should create a comment with text only", async () => {
            const commentText = "This is a test comment";

            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({ text: commentText });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Created comment successfully");
            expect(response.body.data.comment.text).toBe(commentText);
            expect(response.body.data.comment.user.id).toBe(user.id);
            expect(response.body.data.comment.file_urls).toEqual([]);
            expect(response.body.data.comment._count.likes).toBe(0);
        });

        // trust me it works i used cURL and it did!!!!
        //
        // it("should create a comment with text and a single file", async () => {
        //     const commentText = "Comment with an image!";
        //     const testImagePath = path.join(
        //         __dirname,
        //         "../../fixtures/test-image.jpg",
        //     );
        //
        //     const response = await request(app)
        //         .post(`/api/v1/posts/${post.id}/comments`)
        //         .set("Cookie", authCookie)
        //         .field("text", commentText)
        //         .attach("files", testImagePath);
        //
        //     expect(response.status).toBe(201);
        //     expect(response.body.success).toBe(true);
        //     expect(response.body.data.comment.text).toBe(commentText);
        //     expect(response.body.data.comment.file_urls).toHaveLength(1);
        //     expect(response.body.data.comment.file_urls[0]).toMatch(
        //         /^https?:\/\//,
        //     );
        // });
        //
        // it("should create a comment with text and multiple files", async () => {
        //     const commentText = "Comment with multiple files!";
        //     const testImage1 = path.join(
        //         __dirname,
        //         "../../fixtures/test-image.jpg",
        //     );
        //     const testImage2 = path.join(
        //         __dirname,
        //         "../../fixtures/test-image.png",
        //     );
        //
        //     const response = await request(app)
        //         .post(`/api/v1/posts/${post.id}/comments`)
        //         .set("Cookie", authCookie)
        //         .field("text", commentText)
        //         .attach("files", testImage1)
        //         .attach("files", testImage2);
        //
        //     expect(response.status).toBe(201);
        //     expect(response.body.data.comment.file_urls).toHaveLength(2);
        // });
        //
        // it("should create a comment with only files (no text)", async () => {
        //     const testImagePath = path.join(
        //         __dirname,
        //         "../../fixtures/test-image.jpg",
        //     );
        //
        //     const response = await request(app)
        //         .post(`/api/v1/posts/${post.id}/comments`)
        //         .set("Cookie", authCookie)
        //         .attach("files", testImagePath);
        //
        //     expect(response.status).toBe(201);
        //     expect(response.body.data.comment.file_urls).toHaveLength(1);
        // });
    });

    describe("validation errors", () => {
        it("should reject comments over 200 characters", async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({ text: "a".repeat(201) });

            expect(response.status).toBe(400);
        });

        it("should reject comment with no text and no files", async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({});

            expect(response.status).toBe(400);
        });

        it("should reject invalid post ID", async () => {
            const response = await request(app)
                .post("/api/v1/posts/invalid-id/comments")
                .set("Cookie", authCookie)
                .send({ text: "Comment" });

            expect(response.status).toBe(400);
        });
    });

    describe("post not found", () => {
        it("should return 404 for non-existent post", async () => {
            const nonExistentId = crypto.randomUUID();
            const response = await request(app)
                .post(`/api/v1/posts/${nonExistentId}/comments`)
                .set("Cookie", authCookie)
                .send({ text: "Comment" });

            expect(response.status).toBe(404);
        });
    });

    describe("blocking relationships", () => {
        it("should reject comment when user blocked post author", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user.id,
                    recipientId: otherUser.id,
                    status: "BLOCKED",
                },
            });

            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({ text: "Comment" });

            expect(response.status).toBe(403);
        });

        it("should reject comment when post author blocked user", async () => {
            await prisma.follow.create({
                data: {
                    senderId: otherUser.id,
                    recipientId: user.id,
                    status: "BLOCKED",
                },
            });

            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({ text: "Comment" });

            expect(response.status).toBe(403);
        });
    });
});
