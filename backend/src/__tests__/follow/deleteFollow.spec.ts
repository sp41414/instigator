import "dotenv/config";
import request from "supertest";
import app from "../../app.js";
import { prisma } from "../setup.js";
import bcrypt from "bcryptjs";

describe("DELETE /api/v1/follows/:followId", () => {
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

    describe("successfully delete follow", () => {
        it("successfully deletes accepted/refused follow; unfollows", async () => {
            await prisma.follow.update({
                where: {
                    id: follow.id,
                },
                data: {
                    status: "ACCEPTED",
                },
            });

            let response = await request(app)
                .delete(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message[0]).toMatch(/unfollowed user/i);
            expect(response.body.data.follow).toBeDefined();

            let deletedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(deletedFollow).toBeNull();

            const refusedFollow = await prisma.follow.create({
                data: {
                    status: "REFUSED",
                    senderId: user1.id,
                    recipientId: user2.id,
                },
            });

            response = await request(app)
                .delete(`/api/v1/follows/${refusedFollow?.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message[0]).toMatch(/unfollowed user/i);
            expect(response.body.data.follow).toBeDefined();

            deletedFollow = await prisma.follow.findUnique({
                where: {
                    id: refusedFollow.id,
                },
            });

            expect(deletedFollow).toBeNull();
        });

        it("successfully deletes blocked follow; unblocks", async () => {
            await prisma.follow.update({
                where: {
                    id: follow.id,
                },
                data: {
                    status: "BLOCKED",
                },
            });

            const response = await request(app)
                .delete(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message[0]).toMatch(/unblocked user/i);
            expect(response.body.data.follow).toBeDefined();

            const deletedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(deletedFollow).toBeNull();
        });

        it("successfully deletes pending follow; cancels follow request", async () => {
            const response = await request(app)
                .delete(`/api/v1/follows/${follow.id}`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message[0]).toMatch(/cancelled request/i);
            expect(response.body.data.follow).toBeDefined();

            const deletedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(deletedFollow).toBeNull();
        });

        it("successfully deletes as the recipient", async () => {
            const authResponse = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    username: "user2",
                    password: "password123",
                });

            const user2Cookie = authResponse.headers["set-cookie"][0];

            const response = await request(app)
                .delete(`/api/v1/follows/${follow.id}`)
                .set("Cookie", user2Cookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message[0]).toMatch(/cancelled request/i);
            expect(response.body.data.follow).toBeDefined();

            const deletedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(deletedFollow).toBeNull();
        });
    });

    describe("follow error validation", () => {
        it("checks if the follow ID is a valid UUID", async () => {
            const response = await request(app)
                .delete(`/api/v1/follows/1ak1`)
                .set("Cookie", authCookie);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message[0].msg).toMatch(
                /must be a valid UUID/i,
            );
            expect(response.body.error.code).toBe("BAD_REQUEST");

            const nonUpdatedFollow = await prisma.follow.findUnique({
                where: {
                    id: follow.id,
                },
            });

            expect(nonUpdatedFollow).not.toBeNull();
        });
    });

    it("checks if the follow exists or not", async () => {
        const response = await request(app)
            .delete(`/api/v1/follows/${crypto.randomUUID()}`)
            .set("Cookie", authCookie);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message[0]).toMatch(/currently not following/i);
        expect(response.body.error.code).toBe("NOT_FOUND");

        const nonUpdatedFollow = await prisma.follow.findUnique({
            where: {
                id: follow.id,
            },
        });

        expect(nonUpdatedFollow).not.toBeNull();
    });

    it("checks if the user is authorized to delete the relationship", async () => {
        const user3 = await prisma.user.create({
            data: {
                username: "user3",
                password: hashedPassword,
            },
        });

        const responseLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                username: "user3",
                password: "password123",
            });

        const user3Cookie = responseLogin.headers["set-cookie"][0];

        const response = await request(app)
            .delete(`/api/v1/follows/${follow.id}`)
            .set("Cookie", user3Cookie);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message[0]).toMatch(/not authorized to delete/i);
        expect(response.body.error.code).toBe("FORBIDDEN");

        const nonUpdatedFollow = await prisma.follow.findUnique({
            where: {
                id: follow.id,
            },
        });

        expect(nonUpdatedFollow).not.toBeNull();
    });
});
