import "dotenv/config"
import request from "supertest"
import app from "../../app"
import { prisma } from "../setup"
import bcrypt from "bcryptjs"

describe("POST /api/v1/follows", () => {
    let authCookie: string
    let user1: any
    let user2: any
    let user3: any

    beforeEach(async () => {
        const hashedPassword = await bcrypt.hash("password123", 10)

        user1 = await prisma.user.create({
            data: {
                username: 'user1',
                password: hashedPassword
            }
        })

        user2 = await prisma.user.create({
            data: {
                username: 'user2',
                password: hashedPassword
            }
        })

        user3 = await prisma.user.create({
            data: {
                username: 'user3',
                password: hashedPassword
            }
        })

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send({
                username: 'user1',
                password: 'password123'
            })

        authCookie = response.headers['set-cookie'][0]
    })

    describe("successful follow request", () => {
        it("should create a new PENDING follow request", async () => {
            const response = await request(app)
                .post("/api/v1/follows")
                .set("cookie", authCookie)
                .send({ recipientId: user2.id })

            expect(response.status).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toMatch(/Followed user/i)
            expect(response.body.data.follow.status).toBe("PENDING")
            expect(response.body.data.follow.sender.username).toBe("user1")
            expect(response.body.data.follow.recipient.username).toBe("user2")

            const follow = await prisma.follow.findFirst({
                where: {
                    senderId: user1.id,
                    recipientId: user2.id
                }
            })

            expect(follow).toBeDefined()
            expect(follow?.status).toBe("PENDING")
        })

        it("should auto-accept when recipient sends request back", async () => {
            // user1 -> user2 PENDING
            await request(app)
                .post('/api/v1/follows')
                .set('Cookie', authCookie)
                .send({ recipientId: user2.id })

            // login as user2
            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    username: 'user2',
                    password: 'password123'
                })
            const user2Cookie = loginResponse.headers['set-cookie'][0]

            // user2 -> user1 (ACCEPTED)
            const response = await request(app)
                .post('/api/v1/follows')
                .set('Cookie', user2Cookie)
                .send({ recipientId: user1.id })

            expect(response.status).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toMatch(/Accepted friend request/i)
            expect(response.body.data.follow.status).toBe("ACCEPTED")
            expect(response.body.data.follow.acceptedAt).toBeDefined()

            const follow = await prisma.follow.findFirst({
                where: {
                    OR: [
                        { senderId: user1.id, recipientId: user2.id },
                        { senderId: user2.id, recipientId: user1.id }
                    ]
                }
            })
            expect(follow?.status).toBe("ACCEPTED")
        })
    })

    describe("validation errors", () => {
        it("should reject request without recipientId", async () => {
            const response = await request(app)
                .post('/api/v1/follows')
                .set('Cookie', authCookie)
                .send({})

            expect(response.status).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.error.code).toBe("BAD_REQUEST")
        })

        it("should reject request with invalid recipientId type", async () => {
            const response = await request(app)
                .post('/api/v1/follows')
                .set('Cookie', authCookie)
                .send({ recipientId: "not-a-number" })

            expect(response.status).toBe(400)
            expect(response.body.success).toBe(false)
        })

        it("should reject request to follow yourself", async () => {
            const response = await request(app)
                .post('/api/v1/follows')
                .set('Cookie', authCookie)
                .send({ recipientId: user1.id })

            expect(response.status).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.message[0]).toMatch(/Cannot follow yourself/i)
        })

        it("should reject request to non-existent user", async () => {
            const response = await request(app)
                .post('/api/v1/follows')
                .set('Cookie', authCookie)
                .send({ recipientId: 123890 })

            expect(response.status).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.message[0]).toMatch(/Recipient user not found/i)
        })

        it("should reject request without auth cookie", async () => {
            const response = await request(app)
                .post('/api/v1/follows')
                .send({ recipientId: user2.id })

            expect(response.status).toBe(401)
        })
    })

    describe("duplicate follow requests", () => {
        it("should reject duplicate PENDING request", async () => {
            await request(app)
                .post("/api/v1/follows")
                .set("Cookie", authCookie)
                .send({
                    recipientId: user2.id
                })

            const response = await request(app)
                .post("/api/v1/follows")
                .set("Cookie", authCookie)
                .send({
                    recipientId: user2.id
                })

            expect(response.status).toBe(409)
            expect(response.body.success).toBe(false)
            expect(response.body.message[0]).toMatch(/already sent a follow request/i)
        })

        it("should reject request when already ACCEPTED", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                    status: "ACCEPTED",
                    acceptedAt: new Date()
                }
            })


            const response = await request(app)
                .post('/api/v1/follows')
                .set('Cookie', authCookie)
                .send({ recipientId: user2.id })

            expect(response.status).toBe(409)
            expect(response.body.success).toBe(false)
            expect(response.body.message[0]).toMatch(/already following/i)
        })
    })

    describe("REFUSED status handling", () => {
        it("should allow sender to try after REFUSED", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                    status: "REFUSED"
                }
            })

            const response = await request(app)
                .post('/api/v1/follows')
                .set('Cookie', authCookie)
                .send({ recipientId: user2.id })

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.follow.status).toBe("PENDING")

            const follow = await prisma.follow.findFirst({
                where: {
                    senderId: user1.id,
                    recipientId: user2.id
                }
            })
            expect(follow?.status).toBe("PENDING")
        })

        it("should allow recipient to send request after refusing", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                    status: "REFUSED"
                }
            })

            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    username: 'user2',
                    password: 'password123'
                })
            const user2Cookie = loginResponse.headers['set-cookie'][0]

            const response = await request(app)
                .post('/api/v1/follows')
                .set('Cookie', user2Cookie)
                .send({ recipientId: user1.id })

            expect(response.status).toBe(201)
            expect(response.body.success).toBe(true)
            expect(response.body.data.follow.status).toBe("PENDING")
            expect(response.body.data.follow.sender.username).toBe("user2")
            expect(response.body.data.follow.recipient.username).toBe("user1")
        })
    })

    describe("BLOCKED status handling", () => {
        it("should reject request when sender is blocked", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user2.id,
                    recipientId: user1.id,
                    status: "BLOCKED"
                }
            })

            const response = await request(app)
                .post('/api/v1/follows')
                .set('Cookie', authCookie)
                .send({ recipientId: user2.id })

            expect(response.status).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message[0]).toMatch(/blocked by this user/i)
        })

        it("should reject request when sender blocked recipient", async () => {
            await prisma.follow.create({
                data: {
                    senderId: user1.id,
                    recipientId: user2.id,
                    status: "BLOCKED"
                }
            })

            const response = await request(app)
                .post('/api/v1/follows')
                .set('Cookie', authCookie)
                .send({ recipientId: user2.id })

            expect(response.status).toBe(403)
            expect(response.body.success).toBe(false)
            expect(response.body.message[0]).toMatch(/You have blocked this user/i)
        })
    })
})
