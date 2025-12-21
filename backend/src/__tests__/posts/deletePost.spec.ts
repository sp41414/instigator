import "dotenv/config";
import request from "supertest";
import app from "../../app";
import { prisma } from "../setup";
import bcrypt from "bcryptjs";

describe("DELETE /api/v1/posts/:postId", () => {
    let user: any;
    let otherUser: any;
    let post: any;
    let postWithFiles: any;
    let otherUserPost: any;
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
                text: "Post to delete",
                userId: user.id,
            },
        });

        postWithFiles = await prisma.post.create({
            data: {
                text: "Post with files to delete",
                userId: user.id,
                file_urls: [
                    "https://example.com/storage/posts-files/1/posts/test-file-1.jpg",
                    "https://example.com/storage/posts-files/1/posts/test-file-2.jpg",
                ],
            },
        });

        otherUserPost = await prisma.post.create({
            data: {
                text: "Other user's post",
                userId: otherUser.id,
            },
        });
    });

    describe("successfully deletes a post", () => {
        it("should delete the post and return post info", async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Deleted post successfully");
            expect(response.body.data.post.id).toBe(post.id);
            expect(response.body.data.post.text).toBe("Post to delete");
            expect(response.body.data.post.user.id).toBe(user.id);
            expect(response.body.data.post.user.username).toBe("user");

            const deletedPost = await prisma.post.findUnique({
                where: { id: post.id },
            });
            expect(deletedPost).toBeNull();
        });

        it("should delete the post and all its comments", async () => {
            await prisma.comment.createMany({
                data: [
                    {
                        text: "Comment 1",
                        userId: user.id,
                        postId: post.id,
                    },
                    {
                        text: "Comment 2",
                        userId: otherUser.id,
                        postId: post.id,
                    },
                ],
            });

            const commentsBefore = await prisma.comment.findMany({
                where: { postId: post.id },
            });
            expect(commentsBefore).toHaveLength(2);

            const response = await request(app)
                .delete(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const deletedPost = await prisma.post.findUnique({
                where: { id: post.id },
            });
            expect(deletedPost).toBeNull();

            const commentsAfter = await prisma.comment.findMany({
                where: { postId: post.id },
            });
            expect(commentsAfter).toHaveLength(0);
        });

        it("should delete the post and all its likes", async () => {
            await prisma.likePost.create({
                data: {
                    userId: user.id,
                    postId: post.id,
                },
            });

            await prisma.likePost.create({
                data: {
                    userId: otherUser.id,
                    postId: post.id,
                },
            });

            const likesBefore = await prisma.likePost.findMany({
                where: { postId: post.id },
            });
            expect(likesBefore).toHaveLength(2);

            const response = await request(app)
                .delete(`/api/v1/posts/${post.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const deletedPost = await prisma.post.findUnique({
                where: { id: post.id },
            });
            expect(deletedPost).toBeNull();

            const likesAfter = await prisma.likePost.findMany({
                where: { postId: post.id },
            });
            expect(likesAfter).toHaveLength(0);
        });

        it("should delete the post and remove associated files from storage", async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${postWithFiles.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.post.file_urls).toHaveLength(2);

            const deletedPost = await prisma.post.findUnique({
                where: { id: postWithFiles.id },
            });
            expect(deletedPost).toBeNull();

            // Note: In a real test environment, you'd want to verify
            // that supabase.storage.remove() was called with the correct paths
            // This might require mocking the Supabase client
        });

        it("should delete post with empty file_urls array", async () => {
            const postNoFiles = await prisma.post.create({
                data: {
                    text: "Post without files",
                    userId: user.id,
                    file_urls: [],
                },
            });

            const response = await request(app)
                .delete(`/api/v1/posts/${postNoFiles.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const deletedPost = await prisma.post.findUnique({
                where: { id: postNoFiles.id },
            });
            expect(deletedPost).toBeNull();
        });
    });

    describe("validation errors", () => {
        it("should reject invalid post ID format", async () => {
            const response = await request(app)
                .delete("/api/v1/posts/invalid-uuid")
                .set("Cookie", authCookie);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("authorization errors", () => {
        it("should reject deletion of another user's post", async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${otherUserPost.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe(
                "Cannot delete another user's post!",
            );
        });

        it("should allow other user to delete their own post", async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${otherUserPost.id}`)
                .set("Cookie", otherUserAuthCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.post.id).toBe(otherUserPost.id);
        });
    });

    describe("post not found", () => {
        it("should return 404 for non-existent post", async () => {
            const nonExistentId = crypto.randomUUID();
            const response = await request(app)
                .delete(`/api/v1/posts/${nonExistentId}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toBe("Post not found");
        });
    });
});
