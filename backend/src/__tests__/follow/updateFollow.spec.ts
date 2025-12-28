import "dotenv/config";
import request from "supertest";
import app from "../../app.js";
import { prisma } from "../setup.js";
import bcrypt from "bcryptjs";

describe("PATCH /api/v1/follows/:followId", () => {
    let authCookie: string;
    let user1: any;
    let user2: any;
    let follow: any;
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

        // PENDING follow request (user2 -> user1)
        follow = await prisma.follow.create({
            data: {
                senderId: user2.id,
                recipientId: user1.id,
            },
        });

        const response = await request(app).post("/api/v1/auth/login").send({
            username: "user1",
            password: "password123",
        });

        authCookie = response.headers["set-cookie"][0];
    });

    describe("should successfully update", () => {
        it("should successfully update to ACCEPTED", async () => {
            const response = await request(app)
                .patch(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie)
                .send({ status: "ACCEPTED" });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toMatch(/status updated/i);
            expect(response.body.data.follow.status).toBe("ACCEPTED");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("ACCEPTED");
        });

        it("should successfully update to REFUSED", async () => {
            const response = await request(app)
                .patch(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie)
                .send({ status: "REFUSED" });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toMatch(/status updated/i);
            expect(response.body.data.follow.status).toBe("REFUSED");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("REFUSED");
        });
    });

    describe("sender tries to accept/refuse the follow request", () => {
        it("should fail when sender tries to REFUSE the follow request", async () => {
            // invert sender and recipients so the test tries to REFUSE the follow request as the sender
            await prisma.follow.update({
                where: {
                    id: follow.id,
                },
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                },
            });

            const response = await request(app)
                .patch(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie)
                .send({ status: "REFUSED" });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/Only the recipient/i);
            expect(response.body.error.code).toBe("FORBIDDEN");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("PENDING");
            expect(updatedFollow?.recipientId).toBe(user2.id);
            expect(updatedFollow?.senderId).toBe(user1.id);
        });

        it("should fail when the sender tries to ACCEPT the follow request", async () => {
            await prisma.follow.update({
                where: {
                    id: follow.id,
                },
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                },
            });

            const response = await request(app)
                .patch(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie)
                .send({ status: "ACCEPTED" });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/Only the recipient/i);
            expect(response.body.error.code).toBe("FORBIDDEN");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("PENDING");
            expect(updatedFollow?.recipientId).toBe(user2.id);
            expect(updatedFollow?.senderId).toBe(user1.id);
        });
    });

    describe("status validation", () => {
        it("should fail when the input status is non-existent", async () => {
            const response = await request(app)
                .patch(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie)
                .send({ status: "NON-EXISTENT" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(
                /ACCEPTED or REFUSED/i,
            );
            expect(response.body.error.code).toBe("BAD_REQUEST");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).not.toBe("NON-EXISTENT");
            expect(updatedFollow?.senderId).toBe(user2.id);
            expect(updatedFollow?.recipientId).toBe(user1.id);
        });

        it("should fail when the input status is PENDING", async () => {
            // there is a validation for ACCEPTED or REFUSED and another validation for if the status is still PENDING somehow
            // then it'll fail with message "Cannot go back to pending status"
            // but this should never happen
            let response = await request(app)
                .patch(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie)
                .send({ status: "PENDING" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(
                /ACCEPTED or REFUSED/i,
            );
            expect(response.body.error.code).toBe("BAD_REQUEST");

            await prisma.follow.update({
                where: {
                    id: follow.id,
                },
                data: {
                    status: "ACCEPTED",
                },
            });

            // if the status changes to ACCEPTED, not PENDING
            response = await request(app)
                .patch(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie)
                .send({ status: "PENDING" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(
                /ACCEPTED or REFUSED/i,
            );
            expect(response.body.error.code).toBe("BAD_REQUEST");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).not.toBe("PENDING");
            expect(updatedFollow?.senderId).toBe(user2.id);
            expect(updatedFollow?.recipientId).toBe(user1.id);
        });

        it("should fail when the current status is BLOCKED", async () => {
            await prisma.follow.update({
                where: {
                    id: follow.id,
                },
                data: {
                    status: "BLOCKED",
                },
            });

            const response = await request(app)
                .patch(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie)
                .send({
                    status: "ACCEPTED",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/update blocked/i);
            expect(response.body.error.code).toBe("BAD_REQUEST");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).not.toBe("ACCEPTED");
            expect(updatedFollow?.senderId).toBe(user2.id);
            expect(updatedFollow?.recipientId).toBe(user1.id);
        });

        it("should fail when the status is REFUSED and the input status is REFUSED", async () => {
            await prisma.follow.update({
                where: {
                    id: follow.id,
                },
                data: {
                    status: "REFUSED",
                },
            });

            const response = await request(app)
                .patch(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie)
                .send({
                    status: "REFUSED",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/is already REFUSED/i);
            expect(response.body.error.code).toBe("BAD_REQUEST");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("REFUSED");
            expect(updatedFollow?.senderId).toBe(user2.id);
            expect(updatedFollow?.recipientId).toBe(user1.id);
        });

        it("should fail when the status is ACCEPTED and the input status is ACCEPTED", async () => {
            await prisma.follow.update({
                where: {
                    id: follow.id,
                },
                data: {
                    status: "ACCEPTED",
                },
            });

            const response = await request(app)
                .patch(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie)
                .send({
                    status: "ACCEPTED",
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/is already ACCEPTED/i);
            expect(response.body.error.code).toBe("BAD_REQUEST");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("ACCEPTED");
            expect(updatedFollow?.senderId).toBe(user2.id);
            expect(updatedFollow?.recipientId).toBe(user1.id);
        });
    });

    describe("followId validation", () => {
        it("should fail when the followId is not a UUID", async () => {
            const response = await request(app)
                .patch(`/api/v1/follows/asd1`)
                .set("Cookie", authCookie)
                .send({ status: "ACCEPTED" });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(/a valid UUID/i);
            expect(response.body.error.code).toBe("BAD_REQUEST");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("PENDING");
            expect(updatedFollow?.senderId).toBe(user2.id);
            expect(updatedFollow?.recipientId).toBe(user1.id);
        });

        it("should fail when the follow is not found", async () => {
            const response = await request(app)
                .patch(`/api/v1/follows/${crypto.randomUUID()}`)
                .set("Cookie", authCookie)
                .send({ status: "ACCEPTED" });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0]).toMatch(/not found/i);
            expect(response.body.error.code).toBe("NOT_FOUND");

            const updatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(updatedFollow?.status).toBe("PENDING");
            expect(updatedFollow?.senderId).toBe(user2.id);
            expect(updatedFollow?.recipientId).toBe(user1.id);
        });
    });
});
