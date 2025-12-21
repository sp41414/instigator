import "dotenv/config";
import request from "supertest";
import app from "../../app";
import { prisma } from "../setup";
import bcrypt from "bcryptjs";
import { supabase } from "../../config/supabase";

describe("user routes", () => {
    let authCookie: string;
    let user1;
    let user2;
    let hashedPassword: string;

    beforeAll(async () => {
        hashedPassword = await bcrypt.hash("password123", 1);
    });

    beforeEach(async () => {
        user1 = await prisma.user.create({
            data: {
                username: "testuser",
                password: hashedPassword,
            },
        });

        user2 = await prisma.user.create({
            data: {
                username: "testuser1",
                password: hashedPassword,
            },
        });

        const loginResponse = await request(app)
            .post("/api/v1/auth/login")
            .send({
                username: "testuser",
                password: "password123",
            });

        authCookie = loginResponse.headers["set-cookie"][0];
    });

    describe("GET /api/v1/users/me", () => {
        it("should return a user profile with all the fields", async () => {
            const response = await request(app)
                .get("/api/v1/users/me")
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.password).toBeUndefined();
            expect(response.body.data.user.username).toBe("testuser");
            expect(response.body.data.user.email).toBeNull();
            expect(response.body.data.user.profile_picture_url).toBeNull();
            expect(response.body.data.user.aboutMe).toBeNull();
            expect(response.body.data.user._count.posts).toBe(0);
            expect(response.body.data.user._count.sentFollows).toBe(0);
            expect(response.body.data.user._count.receivedFollows).toBe(0);
        });

        it("should return 400 for pagination validation", async () => {
            const response = await request(app)
                .get("/api/v1/users/me?limit='aa'?cursor=2")
                .set("Cookie", authCookie);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject request without auth cookie", async () => {
            const response = await request(app).get("/api/v1/users/me");

            expect(response.status).toBe(401);
        });
    });

    describe("GET /api/v1/users/:id", () => {
        it("should return another user's profile with all the fields", async () => {
            const response = await request(app)
                .get(`/api/v1/users/${user2!.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.password).toBeUndefined();
            expect(response.body.data.user.username).toBe("testuser1");
            expect(response.body.data.user.email).toBeUndefined();
            expect(response.body.data.user.profile_picture_url).toBeNull();
            expect(response.body.data.user.aboutMe).toBeNull();
            expect(response.body.data.user._count.posts).toBe(0);
            expect(response.body.data.user._count.sentFollows).toBe(0);
            expect(response.body.data.user._count.receivedFollows).toBe(0);
        });

        it("should return 400 for invalid ID", async () => {
            const response = await request(app)
                .get("/api/v1/users/asdkjlf")
                .set("Cookie", authCookie);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.data).toBeUndefined();
        });

        it("should return 404 for non-existent user", async () => {
            const response = await request(app)
                .get("/api/v1/users/112181")
                .set("Cookie", authCookie);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.data).toBeUndefined();
        });
    });

    describe("PUT /api/v1/users/me", () => {
        it("should update successfully", async () => {
            const response = await request(app)
                .put("/api/v1/users/me")
                .set("Cookie", authCookie)
                .send({
                    username: "testuserupdated",
                    password: "password1234",
                    about: "Im a test user",
                    email: "testuser@test.com",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.username).toBe("testuserupdated");
            expect(response.body.data.user.password).toBeUndefined();
            expect(response.body.data.user.aboutMe).toBe("Im a test user");
            expect(response.body.data.user.email).toBe("testuser@test.com");
        });
        it("should reject nonexistent password", async () => {
            const response = await request(app)
                .put("/api/v1/users/me")
                .set("Cookie", authCookie)
                .send({
                    username: "testuserupdated2",
                    about: "Im a test user, again",
                    email: "testuser2@test.com",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
        });
        it("should update without email field", async () => {
            const response = await request(app)
                .put("/api/v1/users/me")
                .set("Cookie", authCookie)
                .send({
                    username: "testuserupdated3",
                    password: "password12345",
                    about: "Im a test user, again, again",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.username).toBe("testuserupdated3");
            expect(response.body.data.user.password).toBeUndefined();
            expect(response.body.data.user.aboutMe).toBe(
                "Im a test user, again, again",
            );
            expect(response.body.data.user.email).toBeNull();
        });
        it("should update without about field", async () => {
            const response = await request(app)
                .put("/api/v1/users/me")
                .set("Cookie", authCookie)
                .send({
                    username: "testuserupdated4",
                    password: "password123456",
                    email: "testuser4@test.com",
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.username).toBe("testuserupdated4");
            expect(response.body.data.user.password).toBeUndefined();
            expect(response.body.data.user.aboutMe).toBeNull();
            expect(response.body.data.user.email).toBe("testuser4@test.com");
        });
        it("should reject invalid username length", async () => {
            const response = await request(app)
                .put("/api/v1/users/me")
                .set("Cookie", authCookie)
                .send({
                    username: "a".repeat(23),
                    password: "password1234567",
                    email: "testuser4@test.com",
                    about: "im a test user :)",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/1 and 20/i);
        });
        it("should reject nonexistent username", async () => {
            const response = await request(app)
                .put("/api/v1/users/me")
                .set("Cookie", authCookie)
                .send({
                    about: "Im a test user, again",
                    email: "testuser2@test.com",
                    password: "password12341234",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
        });
        it("should reject invalid username characters", async () => {
            const response = await request(app)
                .put("/api/v1/users/me")
                .set("Cookie", authCookie)
                .send({
                    username: "!$*!$",
                    about: "Im a test user, again :0",
                    email: "testuser3@test.com",
                    password: "password1234",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(
                /characters numbers and dashes/i,
            );
        });
        it("should reject without auth cookie", async () => {
            const response = await request(app).put("/api/v1/users/me").send({
                username: "testuser3",
                about: "Im a test user, again :0",
                email: "testuser3@test.com",
                password: "password1234",
            });

            expect(response.status).toBe(401);
        });
        it("should return 409 with duplicate usernames", async () => {
            // same as user2 from the beginning
            const response = await request(app)
                .put("/api/v1/users/me")
                .set("Cookie", authCookie)
                .send({
                    username: "testuser1",
                    about: "Im a test user, again :0",
                    email: "testuser3@test.com",
                    password: "password1234",
                });
            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/already taken/i);
            expect(response.body.error.code).toBe("CONFLICT");
        });
    });

    describe("DELETE /api/v1/users/me", () => {
        it("should reject without auth cookie", async () => {
            const response = await request(app).delete("/api/v1/users/me");

            expect(response.status).toBe(401);
        });
        it("should delete authenticated user's profile", async () => {
            const response = await request(app)
                .delete("/api/v1/users/me")
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toMatch(/deleted successfully/i);
            expect(response.body.data.user.username).toBeDefined();

            const cookies = response.headers["set-cookie"];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toMatch(/Expires=Thu, 01 Jan 1970/);

            const deletedUser = await prisma.user.findUnique({
                where: { id: user1!.id },
            });
            expect(deletedUser).toBeNull();
        });
    });

    describe("PUT /api/v1/users/me/avatar", () => {
        beforeAll(() => {
            jest.spyOn(console, "error").mockImplementation(() => {});
        });

        afterAll(async () => {
            (console.error as jest.Mock).mockRestore();
        });

        it("should upload a profile picture successfully", async () => {
            const buffer = Buffer.from("fake-png-data");

            const response = await request(app)
                .put("/api/v1/users/me/avatar")
                .set("Cookie", authCookie)
                .attach("file", buffer, "test-avatar.png");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toMatch(/successfully updated/i);
            expect(response.body.data.url).toContain("supabase.co");

            const updatedUser = await prisma.user.findUnique({
                where: { id: user1!.id },
            });
            expect(updatedUser?.profile_picture_url).toBe(
                response.body.data.url,
            );
        });

        it("should reject files that are too large", async () => {
            const bigBuffer = Buffer.alloc(9 * 1024 * 1024);

            const response = await request(app)
                .put("/api/v1/users/me/avatar")
                .set("Cookie", authCookie)
                .attach("file", bigBuffer, "large.png");

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe("LIMIT_FILE_SIZE");
        });

        it("should reject if no file is provided", async () => {
            const response = await request(app)
                .put("/api/v1/users/me/avatar")
                .set("Cookie", authCookie);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/File is required/i);
        });

        it("should reject request without auth cookie", async () => {
            const response = await request(app)
                .put("/api/v1/users/me/avatar")
                .attach("file", Buffer.from("data"), "test.png");

            expect(response.status).toBe(401);
        });
    });
});
