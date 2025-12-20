import "dotenv/config";
import request from "supertest";
import app from "../../../app";
import { prisma } from "../../setup";
import bcrypt from "bcryptjs";

describe("DELETE /api/v1/posts/:postId/comments/:commentId", () => {
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
                text: "Comment to delete",
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

    describe("successfully deletes a comment", () => {
        it("should delete the comment and return 200 with deleted comment", async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Successfully deleted comment");
            expect(response.body.data.comment.id).toBe(comment.id);
            expect(response.body.data.comment.text).toBe("Comment to delete");
            expect(response.body.data.comment.user.id).toBe(user.id);

            const deletedComment = await prisma.comment.findUnique({
                where: { id: comment.id },
            });
            expect(deletedComment).toBeNull();
        });

        it("should delete comment and all its likes", async () => {
            await prisma.likeComment.create({
                data: {
                    userId: user.id,
                    commentId: comment.id,
                },
            });

            await prisma.likeComment.create({
                data: {
                    userId: otherUser.id,
                    commentId: comment.id,
                },
            });

            const likesBefore = await prisma.likeComment.findMany({
                where: { commentId: comment.id },
            });
            expect(likesBefore).toHaveLength(2);

            const response = await request(app)
                .delete(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);

            const deletedComment = await prisma.comment.findUnique({
                where: { id: comment.id },
            });
            expect(deletedComment).toBeNull();

            const likesAfter = await prisma.likeComment.findMany({
                where: { commentId: comment.id },
            });
            expect(likesAfter).toHaveLength(0);
        });

        it("should allow comment owner to delete comment even if blocked", async () => {
            await prisma.follow.create({
                data: {
                    senderId: post.userId,
                    recipientId: user.id,
                    status: "BLOCKED",
                },
            });

            const response = await request(app)
                .delete(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const deletedComment = await prisma.comment.findUnique({
                where: { id: comment.id },
            });
            expect(deletedComment).toBeNull();
        });
    });

    describe("validation errors", () => {
        it("should reject invalid post ID format", async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/invalid-uuid/comments/${comment.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject invalid comment ID format", async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${post.id}/comments/invalid-uuid`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("post not found", () => {
        it("should return 404 for non-existent post", async () => {
            const nonExistentId = crypto.randomUUID();
            const response = await request(app)
                .delete(`/api/v1/posts/${nonExistentId}/comments/${comment.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe("Post not found");
        });
    });

    describe("comment not found", () => {
        it("should return 404 for non-existent comment", async () => {
            const nonExistentId = crypto.randomUUID();
            const response = await request(app)
                .delete(`/api/v1/posts/${post.id}/comments/${nonExistentId}`)
                .set("Cookie", authCookie);

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
                .delete(`/api/v1/posts/${otherPost.id}/comments/${comment.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe("Comment not found");
        });
    });

    describe("authorization errors", () => {
        it("should reject deletion of another user's comment", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/posts/${post.id}/comments/${otherUserComment.id}`,
                )
                .set("Cookie", authCookie);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe(
                "Cannot delete another user's comment!",
            );
        });

        it("should allow other user to delete their own comment", async () => {
            const response = await request(app)
                .delete(
                    `/api/v1/posts/${post.id}/comments/${otherUserComment.id}`,
                )
                .set("Cookie", otherUserAuthCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.comment.id).toBe(otherUserComment.id);
        });
    });

    describe("concurrent deletion", () => {
        it("should handle when comment is already deleted", async () => {
            await request(app)
                .delete(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie);

            const response = await request(app)
                .delete(`/api/v1/posts/${post.id}/comments/${comment.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
});
