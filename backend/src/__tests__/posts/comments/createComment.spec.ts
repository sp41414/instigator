import "dotenv/config";
import request from "supertest";
import app from "../../../app";
import { prisma } from "../../setup";
import bcrypt from "bcryptjs";

describe("POST /api/v1/posts/:postId/comments", () => {
    let user: any;
    let otherUser: any;
    let post: any;
    let hashedPassword: string;
    let authCookie: string;
    let otherUserAuthCookie: string;

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

        const otherResponse = await request(app)
            .post("/api/v1/auth/login")
            .send({
                username: "otheruser",
                password: "password123",
            });

        otherUserAuthCookie = otherResponse.headers["set-cookie"][0];

        post = await prisma.post.create({
            data: {
                text: "Original post to comment on",
                userId: user.id,
            },
        });
    });

    describe("successfully creates a comment", () => {
        it("should create a comment and return comment and user info", async () => {
            const commentText = "This is my comment!";

            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({
                    text: commentText,
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Created comment successfully");
            expect(response.body.data.comment.text).toBe(commentText);
            expect(response.body.data.comment.user.id).toBe(user.id);
            expect(response.body.data.comment.user.username).toBe("user");
            expect(response.body.data.comment._count.likes).toBeDefined();
            expect(response.body.data.comment.likes).toHaveLength(0);

            const comment = await prisma.comment.findUnique({
                where: { id: response.body.data.comment.id },
            });
            expect(comment).toBeDefined();
            expect(comment?.postId).toBe(post.id);
            expect(comment?.userId).toBe(user.id);
        });

        it("should create a comment with minimum 1 character", async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({
                    text: "a",
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.comment.text).toBe("a");
        });

        it("should create a comment with maximum 200 characters", async () => {
            const maxText = "a".repeat(200);
            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({
                    text: maxText,
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.comment.text).toBe(maxText);
        });

        it("should allow other user to comment on post", async () => {
            const commentText = "Other user's comment";

            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", otherUserAuthCookie)
                .send({
                    text: commentText,
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.comment.text).toBe(commentText);
            expect(response.body.data.comment.user.id).toBe(otherUser.id);
            expect(response.body.data.comment.user.username).toBe("otheruser");
        });
    });

    describe("validation errors", () => {
        it("should reject comments over 200 characters long", async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({
                    text: "a".repeat(201),
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/between 1 and 200/i);
        });

        it("should reject empty comment text", async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({ text: "" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/between 1 and 200/i);
        });

        it("should reject missing comment text field", async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${post.id}/comments`)
                .set("Cookie", authCookie)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject invalid post ID format", async () => {
            const response = await request(app)
                .post("/api/v1/posts/invalid-uuid/comments")
                .set("Cookie", authCookie)
                .send({
                    text: "Valid comment text",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("post not found", () => {
        it("should return 404 for non-existent post", async () => {
            const nonExistentId = crypto.randomUUID();
            const response = await request(app)
                .post(`/api/v1/posts/${nonExistentId}/comments`)
                .set("Cookie", authCookie)
                .send({
                    text: "Comment on non-existent post",
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe("Post not found");
        });
    });
});
