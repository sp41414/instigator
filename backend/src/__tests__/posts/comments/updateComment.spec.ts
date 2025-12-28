import "dotenv/config";
import request from "supertest";
import app from "../../../app.js";
import { prisma } from "../../setup.js";
import bcrypt from "bcryptjs";

describe("PUT /api/v1/posts/:postId/comments/:commentId", () => {
    let user: any;
    let otherUser: any;
    let post: any;
    let comment: any;
    let otherUserComment: any;
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
                text: "Test post",
                userId: user.id,
            },
        });

        comment = await prisma.comment.create({
            data: {
                text: "Original comment text",
                userId: user.id,
                postId: post.id,
            },
        });

        otherUserComment = await prisma.comment.create({
            data: {
                text: "Other user's comment",
                userId: otherUser.id,
                postId: post.id,
            },
        });
    });

    describe("successfully updates a comment", () => {
        it("should update the comment and return 200 with updated comment", async () => {
            const updatedText = "Updated comment text";

            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: updatedText,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Updated comment successfully");
            expect(response.body.data.comment.text).toBe(updatedText);
            expect(response.body.data.comment.id).toBe(comment.id);
            expect(response.body.data.comment.user.id).toBe(user.id);
            expect(response.body.data.comment.updatedAt).toBeDefined();

            const updatedComment = await prisma.comment.findUnique({
                where: { id: comment.id },
            });
            expect(updatedComment?.text).toBe(updatedText);
        });

        it("should update comment with minimum 1 character", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "a",
                });

            expect(response.status).toBe(200);
            expect(response.body.data.comment.text).toBe("a");
        });

        it("should update comment with maximum 200 characters", async () => {
            const maxText = "a".repeat(200);
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: maxText,
                });

            expect(response.status).toBe(200);
            expect(response.body.data.comment.text).toBe(maxText);
        });

        it("should not update comment when text field is omitted", async () => {
            const originalComment = await prisma.comment.findUnique({
                where: { id: comment.id },
            });

            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({});

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.comment.text).toBe(originalComment?.text);
        });

        it("should update updatedAt timestamp when text is changed", async () => {
            const originalComment = await prisma.comment.findUnique({
                where: { id: comment.id },
            });
            const originalUpdatedAt = originalComment?.updatedAt;

            await new Promise((resolve) => setTimeout(resolve, 10));

            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Updated text",
                });

            expect(response.status).toBe(200);

            const updatedComment = await prisma.comment.findUnique({
                where: { id: comment.id },
            });

            expect(updatedComment?.updatedAt.getTime()).toBeGreaterThan(
                originalUpdatedAt!.getTime(),
            );
        });

        it("should not change comment text when text is undefined", async () => {
            const originalComment = await prisma.comment.findUnique({
                where: { id: comment.id },
            });

            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: undefined,
                });

            expect(response.status).toBe(200);
            expect(response.body.data.comment.text).toBe(originalComment?.text);
        });
    });

    describe("validation errors", () => {
        it("should reject comments over 200 characters long", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "a".repeat(201),
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/between 1 and 200/i);
        });

        it("should reject empty string text", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/between 1 and 200/i);
        });

        it("should reject invalid post ID format", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/invalid-uuid/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Valid text",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject invalid comment ID format", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/invalid-uuid`)
                .set("Cookie", authCookie)
                .send({
                    text: "Valid text",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject whitespace-only text", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "   ",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("authorization errors", () => {
        it("should reject update of another user's comment", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${otherUserComment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Trying to update someone else's comment",
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe(
                "Cannot update another user's comment!",
            );
        });

        it("should allow comment owner to update their own comment", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Updated by owner",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should allow comment owner to update comment on their own post", async () => {
            const userPost = await prisma.post.create({
                data: {
                    text: "User's own post",
                    userId: user.id,
                },
            });

            const userComment = await prisma.comment.create({
                data: {
                    text: "Comment on own post",
                    userId: user.id,
                    postId: userPost.id,
                },
            });

            const response = await request(app)
                .put(`/api/v1/posts/${userPost.id}/comments/${userComment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Updated comment",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe("post not found", () => {
        it("should return 404 for non-existent post", async () => {
            const nonExistentId = crypto.randomUUID();
            const response = await request(app)
                .put(`/api/v1/posts/${nonExistentId}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Updated text",
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe("Post not found");
        });
    });

    describe("comment not found", () => {
        it("should return 404 for non-existent comment", async () => {
            const nonExistentId = crypto.randomUUID();
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${nonExistentId}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Updated text",
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe("Comment not found");
        });

        it("should return 404 for comment on different post", async () => {
            const otherPost = await prisma.post.create({
                data: {
                    text: "Another post",
                    userId: user.id,
                },
            });

            const response = await request(app)
                .put(`/api/v1/posts/${otherPost.id}/comments/${comment.id}`)
                .set("Cookie", authCookie)
                .send({
                    text: "Updated text",
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe("Comment not found");
        });
    });

    describe("authentication", () => {
        it("should reject unauthenticated requests", async () => {
            const response = await request(app)
                .put(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .send({
                    text: "Updated text",
                });

            expect(response.status).toBe(401);
        });
    });
});
