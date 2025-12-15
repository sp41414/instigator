import { PrismaClient } from "../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
    var prisma: PrismaClient
}

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL_TEST! || process.env.DATABASE_URL!
})

const prisma = new PrismaClient({
    adapter
})

beforeEach(async () => {
    await prisma.comment.deleteMany()
    await prisma.post.deleteMany()
    await prisma.follow.deleteMany()
    await prisma.user.deleteMany()
})

afterAll(async () => {
    await prisma.$disconnect()
})

global.prisma = prisma
