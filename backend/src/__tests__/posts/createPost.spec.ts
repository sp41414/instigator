import "dotenv/config";
import request from "supertest";
import app from "../../app";
import { prisma } from "../setup";
import bcrypt from "bcryptjs";

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
        it("should create a new post and return post and user info", async () => {
            const postText = "Hey, this is my first post!";

            const response = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", authCookie)
                .send({
                    text: postText,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.post.text).toBe(postText);
            expect(response.body.data.post.user.username).toBe("user");
            expect(response.body.data.post.user).toHaveProperty(
                "profile_picture_url",
            );
            expect(response.body.data.post.user).toHaveProperty("aboutMe");

            const post = await prisma.post.findUnique({
                where: { id: response.body.data.post.id },
            });
            expect(post).toBeDefined();
            expect(post?.userId).toBe(user.id);
        });
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

        it("should reject empty post text", async () => {
            const response = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", authCookie)
                .send({ text: "" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject missing post text field", async () => {
            const response = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", authCookie)
                .send({});

            expect(response.status).toBe(400);
        });
    });
});
