export default async () => {
    process.env.NODE_ENV = "test";
    await import("dotenv/config");

    const { PrismaClient } = await import("../../generated/prisma");
    const { PrismaPg } = await import("@prisma/adapter-pg");

    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL_TEST!,
    });

    const prisma = new PrismaClient({ adapter });

    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
};
