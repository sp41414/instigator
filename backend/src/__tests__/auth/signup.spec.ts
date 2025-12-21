import "dotenv/config";
import request from "supertest";
import { prisma } from "../setup";
import app from "../../app";

describe("POST /api/v1/auth/signup", () => {
    describe("successful signup", () => {
        it("should create a new user with valid credentials", async () => {
            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    username: "newuser",
                    password: "password123",
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toHaveProperty("id");
            expect(response.body.data.user.username).toBe("newuser");
            expect(response.body.data.user).not.toHaveProperty("password");

            const user = await prisma.user.findUnique({
                where: { username: "newuser" },
            });
            expect(user).toBeDefined();
            expect(user?.password).toBeDefined();
        });

        it("should set a signed httpOnly cookie", async () => {
            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    username: "cookieuser",
                    password: "password123",
                });

            expect(response.status).toBe(201);
            const cookies = response.headers["set-cookie"];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toMatch(/token=/);
            expect(cookies[0]).toMatch(/HttpOnly/);
            expect(cookies[0]).toMatch(/SameSite=Strict/i);
        });
    });

    describe("validation errors", () => {
        it("should reject signup with empty username", async () => {
            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    username: "",
                    password: "password123",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe("BAD_REQUEST");
        });

        it("should reject signup with username too long", async () => {
            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    username: "a".repeat(21),
                    password: "password123",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it("should reject signup with password too short", async () => {
            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    username: "passwordshort",
                    password: "123",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it("should reject signup with password too long", async () => {
            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    username: "passwordlong",
                    password: "a".repeat(129),
                });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it("should reject signup with invalid username characters", async () => {
            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    username: "user@name!",
                    password: "password123",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it("should reject signup with invalid password characters", async () => {
            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    username: "validuser1",
                    password: "pass word+=",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it("should reject signup with missing username", async () => {
            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    password: "password123",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it("should reject signup with missing password", async () => {
            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    username: "validuser2",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("duplicate username", () => {
        it("should reject signup with duplicate username", async () => {
            await request(app).post("/api/v1/auth/signup").send({
                username: "existinguser",
                password: "password123",
            });

            const response = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    username: "existinguser",
                    password: "password123",
                });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe("CONFLICT");
            expect(response.body.message[0]).toMatch(/already taken/i);
        });

        it("should not create duplicate user in database", async () => {
            await request(app).post("/api/v1/auth/signup").send({
                username: "uniqueuser",
                password: "password123",
            });

            await request(app).post("/api/v1/auth/signup").send({
                username: "uniqueuser",
                password: "password456",
            });

            const users = await prisma.user.findMany({
                where: { username: "uniqueuser" },
            });

            expect(users.length).toBe(1);
        });
    });
});
