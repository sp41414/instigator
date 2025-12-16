import "dotenv/config"
import request from "supertest"
import app from "../../app"
import { prisma } from "../setup"
import bcrypt from "bcryptjs"

describe("user routes", () => {
    let authCookie: string;
    let user1;
    let user2;

    beforeEach(async () => {
        const hashedPassword = await bcrypt.hash('password123', 10)
        user1 = await prisma.user.create({
            data: {
                username: 'testuser',
                password: hashedPassword
            }
        })

        user2 = await prisma.user.create({
            data: {
                username: "testuser1",
                password: hashedPassword
            }
        })

        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                username: 'testuser',
                password: 'password123'
            })

        authCookie = loginResponse.headers['set-cookie'][0]
    })

    describe("GET /api/v1/users/me", () => {
        it("should return a user profile with all the fields", async () => {
            const response = await request(app)
                .get("/api/v1/users/me")
                .set("Cookie", authCookie)


            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.user.password).toBeUndefined()
            expect(response.body.data.user.username).toBe("testuser")
            expect(response.body.data.user.email).toBeNull()
            expect(response.body.data.user.profile_picture_url).toBeNull()
            expect(response.body.data.user.aboutMe).toBeNull()
            expect(response.body.data.user._count.posts).toBe(0)
            expect(response.body.data.user._count.sentFollows).toBe(0)
            expect(response.body.data.user._count.receivedFollows).toBe(0)
        })


        it("should reject request without auth cookie", async () => {
            const response = await request(app)
                .get("/api/v1/users/me")

            expect(response.status).toBe(401)
        })
    })

    describe("GET /api/v1/users/:id", () => {
        it("should return another user's profile with all the fields", async () => {
            const response = await request(app)
                .get(`/api/v1/users/${user2!.id}`)
                .set("Cookie", authCookie)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.user.password).toBeUndefined()
            expect(response.body.data.user.username).toBe("testuser1")
            expect(response.body.data.user.email).toBeUndefined()
            expect(response.body.data.user.profile_picture_url).toBeNull()
            expect(response.body.data.user.aboutMe).toBeNull()
            expect(response.body.data.user._count.posts).toBe(0)
            expect(response.body.data.user._count.sentFollows).toBe(0)
            expect(response.body.data.user._count.receivedFollows).toBe(0)
        })

        it("should return 400 for invalid ID", async () => {
            const response = await request(app)
                .get("/api/v1/users/asdkjlf")
                .set("Cookie", authCookie)

            expect(response.status).toBe(400)
            expect(response.body.success).toBe(false)
            expect(response.body.data).toBeUndefined()
        })

        it("should return 404 for non-existent user", async () => {
            const response = await request(app)
                .get("/api/v1/users/112181")
                .set("Cookie", authCookie)

            expect(response.status).toBe(404)
            expect(response.body.success).toBe(false)
            expect(response.body.data).toBeUndefined()
        })
    })

    describe("PUT /api/v1/users/me", () => {
        test.todo("should update authenticated user's profile")
        test.todo("should update without password field")
        test.todo("should update without email field")
        test.todo("should update without about field")
        test.todo("should reject invalid username length")
        test.todo("should reject nonexistent username")
        test.todo("should reject invalid username characters")
        test.todo("should reject without auth cookie")
        test.todo("should return 409 with duplicate usernames")
    })

    describe("DELETE /api/v1/users/me", () => {
        test.todo("should delete authenticated user's profile")
        test.todo("should reject without auth cookie")
    })
})
