import "dotenv/config";
import request from "supertest";
import app from "../../app";
import { prisma } from "../setup";
import bcrypt from "bcryptjs";

describe("PUT /api/v1/posts/:postId", () => {
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
                text: "Original post text",
                userId: user.id,
            },
        });
    });

    describe("successfully updates a post", () => {
        it("should update the post and return post and user info", async () => {
            const updatedText = "This is my updated post!";

            const response = await request(app)
                .put(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: updatedText,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Updated post successfully");
            expect(response.body.data.post.text).toBe(updatedText);
            expect(response.body.data.post.id).toBe(post.id);
            expect(response.body.data.post.user.id).toBe(user.id);
            expect(response.body.data.post.user.username).toBe("user");

            const updatedPost = await prisma.post.findUnique({
                where: { id: post.id },
            });
            expect(updatedPost?.text).toBe(updatedText);
        });

        it("should update the updatedAt timestamp", async () => {
            const originalPost = await prisma.post.findUnique({
                where: { id: post.id },
            });
            const originalUpdatedAt = originalPost?.updatedAt;

            const response = await request(app)
                .put(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Updated text",
                });

            expect(response.status).toBe(200);

            const updatedPost = await prisma.post.findUnique({
                where: { id: post.id },
            });

            expect(updatedPost?.updatedAt.getTime()).toBeGreaterThan(
                originalUpdatedAt!.getTime(),
            );
        });

        it("should allow updating post with minimum 1 character", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "a",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.post.text).toBe("a");
        });

        it("should allow updating post with maximum 400 characters", async () => {
            const maxText = "a".repeat(400);
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: maxText,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.post.text).toBe(maxText);
        });

        it("should update the post when text field is omitted", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie)
                .send({});

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const updatedPost = await prisma.post.findUnique({
                where: { id: post.id },
            });
            expect(updatedPost?.text).toBe("Original post text");
        });

        it("should update the post when text field is empty string", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie)
                .send({ text: "" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/between 1 and 400/i);
        });
    });

    describe("validation errors", () => {
        it("should reject posts over 400 characters long", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "a".repeat(401),
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/between 1 and 400/i);
        });

        it("should reject empty string text", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie)
                .send({ text: "" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/between 1 and 400/i);
        });

        it("should reject invalid post ID format", async () => {
            const response = await request(app)
                .put("/api/v1/posts/invalid-uuid")
                .set("Cookie", authCookie)
                .send({
                    text: "Updated text",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("authorization errors", () => {
        it("should reject update of another user's post", async () => {
            const otherUserPost = await prisma.post.create({
                data: {
                    text: "Other user's post",
                    userId: otherUser.id,
                },
            });

            const response = await request(app)
                .put(`/api/v1/posts/${otherUserPost.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Trying to update someone else's post",
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe(
                "Cannot update another user's post!",
            );
        });

        it("should allow owner to update their own post", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Updated by owner",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe("post not found", () => {
        it("should return 404 for non-existent post", async () => {
            const nonExistentId = crypto.randomUUID();
            const response = await request(app)
                .put(`/api/v1/posts/${nonExistentId}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Updated text",
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe("Post not found");
        });
    });
});
