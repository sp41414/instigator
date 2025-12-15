import request from 'supertest'
import app from '../../app'
import prisma from '../../db/prisma'
import bcrypt from 'bcryptjs'

describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
        const hashedPassword = await bcrypt.hash('password123', 10)
        await prisma.user.create({ data: { username: "testuser", password: hashedPassword } })
    })
})
