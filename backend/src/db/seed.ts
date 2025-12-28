import "dotenv/config";
import prisma from "./prisma.js";
import bcrypt from "bcryptjs";

async function main() {
    const existingGuest = await prisma.user.findUnique({
        where: {
            id: 1,
        },
    });

    if (existingGuest) {
        console.log("Guest user already exists, skipping...");
        return;
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash("guest", salt);
    // this is an account for many users in one, managed and fetched by the special ID "1"
    const user = await prisma.user.create({
        data: {
            id: 1,
            username: "Guest",
            password: hashedPassword,
        },
    });

    console.log(`Guest user created, username: ${user.username}`);
}

main()
    .catch((e) => {
        console.error("Error seeding script: ", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
