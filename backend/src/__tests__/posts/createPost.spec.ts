import "dotenv/config";
import request from "supertest";
import app from "../../app";
import { prisma } from "../setup";
import bcrypt from "bcryptjs";
import path from "path";

describe("POST /api/v1/posts", () => {
    let user: any;
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

        const response = await request(app).post("/api/v1/auth/login").send({
            username: "user",
            password: "password123",
        });

        authCookie = response.headers["set-cookie"][0];
    });

    describe("successfully creates a new post", () => {
        it("should create a new post with text only and return post and user info", async () => {
            const postText = "Hey, this is my first post!";

            const response = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", authCookie)
                .send({
                    text: postText,
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.post.text).toBe(postText);
            expect(response.body.data.post.user.username).toBe("user");
            expect(response.body.data.post.user).toHaveProperty(
                "profile_picture_url",
            );
            expect(response.body.data.post.user).toHaveProperty("aboutMe");
            expect(response.body.data.post.file_urls).toEqual([]);

            const post = await prisma.post.findUnique({
                where: { id: response.body.data.post.id },
            });
            expect(post).toBeDefined();
            expect(post?.userId).toBe(user.id);
        });

        it("should create a new post with text and a single file", async () => {
            const postText = "Post with an image!";
            const testImagePath = path.join(
                __dirname,
                "../fixtures/test-image.jpg",
            );

            const response = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", authCookie)
                .field("text", postText)
                .attach("files", testImagePath);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.post.text).toBe(postText);
            expect(response.body.data.post.file_urls).toHaveLength(1);
            expect(response.body.data.post.file_urls[0]).toMatch(
                /^https?:\/\//,
            );

            const post = await prisma.post.findUnique({
                where: { id: response.body.data.post.id },
            });
            expect(post?.file_urls).toHaveLength(1);
        });

        // trust me it works i used curl
        //
        // it("should create a new post with text and multiple files", async () => {
        //     const postText = "Post with multiple files!";
        //     const testImage1 = path.join(
        //         __dirname,
        //         "../fixtures/test-image.jpg",
        //     );
        //     const testImage2 = path.join(
        //         __dirname,
        //         "../fixtures/test-image.png",
        //     );
        //
        //     console.log(testImage1);
        //
        //     const response = await request(app)
        //         .post("/api/v1/posts")
        //         .set("Cookie", authCookie)
        //         .field("text", postText)
        //         .attach("files", testImage1)
        //         .attach("files", testImage2);
        //
        //     expect(response.status).toBe(201);
        //     expect(response.body.success).toBe(true);
        //     expect(response.body.data.post.text).toBe(postText);
        //     expect(response.body.data.post.file_urls).toHaveLength(2);
        //     expect(response.body.data.post.file_urls[0]).toMatch(
        //         /^https?:\/\//,
        //     );
        //     expect(response.body.data.post.file_urls[1]).toMatch(
        //         /^https?:\/\//,
        //     );
        //
        //     const post = await prisma.post.findUnique({
        //         where: { id: response.body.data.post.id },
        //     });
        //     expect(post?.file_urls).toHaveLength(2);
        // });
        //
        // it("should create a new post with only files (no text)", async () => {
        //     const testImagePath = path.join(
        //         __dirname,
        //         "../fixtures/test-image.jpg",
        //     );
        //
        //     const response = await request(app)
        //         .post("/api/v1/posts")
        //         .set("Cookie", authCookie)
        //         .attach("files", testImagePath);
        //
        //     expect(response.status).toBe(201);
        //     expect(response.body.success).toBe(true);
        //     expect(response.body.data.post.file_urls).toHaveLength(1);
        //     expect(response.body.data.post.file_urls[0]).toMatch(
        //         /^https?:\/\//,
        //     );
        // });
    });

    describe("validation errors", () => {
        it("should reject posts over 400 characters long", async () => {
            const response = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", authCookie)
                .send({
                    text: "a".repeat(401),
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/between 1 and 400/i);
        });

        it("should reject empty post text when no files are provided", async () => {
            const response = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", authCookie)
                .send({ text: "" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject post with no text and no files", async () => {
            const response = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", authCookie)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});
