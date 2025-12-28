import "dotenv/config";
import request from "supertest";
import app from "../../app.js";
import { prisma } from "../setup.js";
import bcrypt from "bcryptjs";

describe("POST /api/v1/auth/login", () => {
    let hashedPassword: string;

    beforeAll(async () => {
        hashedPassword = await bcrypt.hash("password123", 1);
    });

    beforeEach(async () => {
        await prisma.user.create({
            data: {
                username: "testuser",
                password: hashedPassword,
            },
        });
    });

    describe("successful login", () => {
        it("should login with valid credentials", async () => {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "testuser",
                    password: "password123",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.username).toBe("testuser");
            expect(response.body.data.user).toHaveProperty("id");
            expect(response.body.data.user.password).toBeUndefined();
        });

        it("should set a signed httpOnly cookie", async () => {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "testuser",
                    password: "password123",
                });

            const cookies = response.headers["set-cookie"];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toMatch(/token=/);
            expect(cookies[0]).toMatch(/HttpOnly/);
        });

        it("should return user profile information", async () => {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "testuser",
                    password: "password123",
                });

            expect(response.body.data.user).toHaveProperty("id");
            expect(response.body.data.user).toHaveProperty("username");
            expect(response.body.data.user).toHaveProperty(
                "profile_picture_url",
            );
            expect(response.body.data.user).not.toHaveProperty("password");
        });
    });

    describe("validation errors", () => {
        it("should reject login with empty username", async () => {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "",
                    password: "password123",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject login with empty password", async () => {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "testuser",
                    password: "",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject login with missing credentials", async () => {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("authentication errors", () => {
        it("should reject login with non-existent username", async () => {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "nonexistent",
                    password: "password123",
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(
                /Invalid Username or Password/i,
            );
        });

        it("should reject login with wrong password", async () => {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "testuser",
                    password: "wrongpassword",
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(
                /Invalid Username or Password/i,
            );
        });

        it("should not reveal if username exists on failed login", async () => {
            const responseWrongUser = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "nonexistent",
                    password: "password123",
                });

            const responseWrongPass = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "testuser",
                    password: "wrongpassword",
                });

            expect(responseWrongUser.body.message[0]).toEqual(
                responseWrongPass.body.message[0],
            );
        });
    });

    describe("google oauth users", () => {
        beforeEach(async () => {
            await prisma.user.create({
                data: {
                    username: "googleuser",
                    googleId: "123456789",
                    email: "google@example.com",
                },
            });
        });
        it("should reject password login for google oauth users", async () => {
            const response = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "googleuser",
                    password: "anypassword",
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/Google sign-in/i);
        });
    });
});
