import "dotenv/config";
import request from "supertest";
import app from "../../app";
import { prisma } from "../setup";
import bcrypt from "bcryptjs";

describe("POST /api/v1/follows/:userId/block", () => {
    let user1: any;
    let user2: any;
    let authCookieUser1: string;
    let authCookieUser2: string;
    let hashedPassword: string;

    beforeAll(async () => {
        hashedPassword = await bcrypt.hash("password123", 1);
    });

    beforeEach(async () => {
        user1 = await prisma.user.create({
            data: {
                username: "user1",
                password: hashedPassword,
            },
        });

        user2 = await prisma.user.create({
            data: {
                username: "user2",
                password: hashedPassword,
            },
        });

        let response = await request(app).post("/api/v1/auth/login").send({
            username: "user1",
            password: "password123",
        });

        authCookieUser1 = response.headers["set-cookie"][0];

        response = await request(app).post("/api/v1/auth/login").send({
            username: "user2",
            password: "password123",
        });

        authCookieUser2 = response.headers["set-cookie"][0];
    });

    describe("successfully blocks user", () => {
        it("user 1 blocks user 2 successfully", async () => {
            const response = await request(app)
                .post(`/api/v1/follows/${user2.id}/block`)
                .set("Cookie", authCookieUser1);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message[0]).toMatch(/Blocked user/i);
            expect(response.body.data.follow.status).toBe("BLOCKED");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: response.body.data.follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("BLOCKED");
        });

        it("user 2 blocks user 1 successfully", async () => {
            const response = await request(app)
                .post(`/api/v1/follows/${user1.id}/block`)
                .set("Cookie", authCookieUser2);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message[0]).toMatch(/Blocked user/i);
            expect(response.body.data.follow.status).toBe("BLOCKED");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: response.body.data.follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("BLOCKED");
        });

        it("user 1 blocks user 2 successfully on an already ACCEPTED follow", async () => {
            const follow = await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                    status: "ACCEPTED",
                },
            });

            const response = await request(app)
                .post(`/api/v1/follows/${user2.id}/block`)
                .set("Cookie", authCookieUser1);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message[0]).toMatch(/Blocked user/i);
            expect(response.body.data.follow.status).toBe("BLOCKED");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("BLOCKED");
        });

        it("user 1 blocks user 2 successfully on an already REFUSED follow", async () => {
            const follow = await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                    status: "REFUSED",
                },
            });

            const response = await request(app)
                .post(`/api/v1/follows/${user2.id}/block`)
                .set("Cookie", authCookieUser1);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message[0]).toMatch(/Blocked user/i);
            expect(response.body.data.follow.status).toBe("BLOCKED");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("BLOCKED");
        });
    });

    describe("user validation", () => {
        it("should fail on invalid ID type", async () => {
            const response = await request(app)
                .post(`/api/v1/follows/safdklj/block`)
                .set("Cookie", authCookieUser1);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/must be an Integer/i);
            expect(response.body.error.code).toBe("BAD_REQUEST");
        });

        it("should fail on non-existent user", async () => {
            const response = await request(app)
                .post(`/api/v1/follows/188888/block`)
                .set("Cookie", authCookieUser1);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/not found/i);
            expect(response.body.error.code).toBe("NOT_FOUND");
        });

        it("should fail when user tries to block themselves", async () => {
            const response = await request(app)
                .post(`/api/v1/follows/${user1.id}/block`)
                .set("Cookie", authCookieUser1);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/block yourself/i);
            expect(response.body.error.code).toBe("BAD_REQUEST");
        });

        it("should fail when the user is already blocked", async () => {
            await request(app)
                .post(`/api/v1/follows/${user2.id}/block`)
                .set("Cookie", authCookieUser1);

            const response = await request(app)
                .post(`/api/v1/follows/${user2.id}/block`)
                .set("Cookie", authCookieUser1);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/already blocked/i);
            expect(response.body.error.code).toBe("BAD_REQUEST");
        });
    });
});
