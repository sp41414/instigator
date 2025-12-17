import "dotenv/config";
import request from "supertest";
import app from "../../app";
import { prisma } from "../setup";
import bcrypt from "bcryptjs";

describe("GET /api/v1/follows", () => {
    let authCookie: string;
    let user1: any;
    let user2: any;
    let user3: any;
    let user4: any;
    let user5: any;
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

        user3 = await prisma.user.create({
            data: {
                username: "user3",
                password: hashedPassword,
            },
        });

        user4 = await prisma.user.create({
            data: {
                username: "user4",
                password: hashedPassword,
            },
        });

        user5 = await prisma.user.create({
            data: {
                username: "user5",
                password: hashedPassword,
            },
        });

        const response = await request(app).post("/api/v1/auth/login").send({
            username: "user1",
            password: "password123",
        });

        authCookie = response.headers["set-cookie"][0];
    });

    describe("successfully retrieve follows", () => {
        it("should return correctly categorized and mapped lists", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                    status: "ACCEPTED",
                    acceptedAt: new Date(),
                },
            });

            await prisma.follow.create({
                data: {
                    senderId: user3.id,
                    recipientId: user1.id,
                    status: "ACCEPTED",
                    acceptedAt: new Date(),
                },
            });

            await prisma.follow.create({
                data: {
                    senderId: user4.id,
                    recipientId: user1.id,
                    status: "PENDING",
                },
            });

            await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user5.id,
                    status: "PENDING",
                },
            });

            const response = await request(app)
                .get("/api/v1/follows")
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data.accepted[0]).toBeDefined();
            expect(response.body.data.accepted[1]).toBeDefined();
            expect(response.body.data.accepted[2]).toBeUndefined();

            expect(response.body.data.incoming[0]).toBeDefined();
            expect(response.body.data.incoming[1]).toBeUndefined();

            expect(response.body.data.pending[0]).toBeDefined();
            expect(response.body.data.pending[1]).toBeUndefined();

            const friend1 = response.body.data.accepted.find(
                (f: any) => f.user.username === "user2",
            );
            expect(friend1.user.username).toBe("user2");
            expect(friend1.sender).toBeUndefined();
            expect(friend1.recipient).toBeUndefined();

            const friend2 = response.body.data.accepted.find(
                (f: any) => f.user.username === "user3",
            );
            expect(friend2.user.username).toBe("user3");

            expect(response.body.data.incoming[0].sender.username).toBe(
                "user4",
            );
            expect(response.body.data.pending[0].recipient.username).toBe(
                "user5",
            );
        });

        it("should return blocked users correctly", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                    status: "BLOCKED",
                },
            });

            const response = await request(app)
                .get("/api/v1/follows")
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.data.blocked[0]).toBeDefined();
            expect(response.body.data.blocked[0].recipient.username).toBe(
                "user2",
            );
        });

        it("should return empty lists as undefined indexes if no relationships exist", async () => {
            const response = await request(app)
                .get("/api/v1/follows")
                .set("Cookie", authCookie);

            expect(response.status).toBe(200);
            expect(response.body.data.accepted[0]).toBeUndefined();
            expect(response.body.data.incoming[0]).toBeUndefined();
            expect(response.body.data.pending[0]).toBeUndefined();
            expect(response.body.data.blocked[0]).toBeUndefined();
        });
    });
});
