# Instigator

Instigator is a Full Stack Microblogging Social Media Website

<div align="center"> <img src="/frontend/public/logo.png" alt="logo" width="200" /> </div>

---

## Features

It includes:
- **Authorization:** with **Passport.js** JWT and google OAuth (commented out, ready for ocnfig) and a Guest login (seed script as user ID 1)
- **Social functionality**: User follow, unfollow, follow back, block functionality
- **Customizable Profiles:** A profile with customization in user profile picture, about me, email, and password. The user profile contains the user's posts, post count, following count, followers count, username, profile picture and about me.
- **Content Management:** Creating, updating, deleting, liking, and commenting on posts, same functionality for comments (Creating, updating, deleting, and liking), with the ability to upload any file as a post embed up to 4 with a 4.5MB vercel limit
- **User Settings:** Settings with the ability to customize light/dark/system mode, logout, and delete the account

## Tech Stack

### **Backend**
- Node.js + TypeScript
- Prisma ORM
- Passport.js
- Jest + Supertest

### **Frontend**
- React + Vite
- TypeScript
- Tailwind CSS

## Steps

1. **Clone the repository:**
```bash
git clone https://github.com/sp41414/messaging-app
```
2. **Install dependencies in both directories:**
```bash
pnpm install
```
3. **Copy the .env.template to .env in both directories:**
```bash
cp ./backend/.env.template ./backend/.env && cp ./frontend/.env.template ./frontend.env
```
4. **Setup the .env file by filling in the values, you can implement google OAuth but it is currently commented out as a feature.**
5. **In the backend directory, run:**
```bash
pnpm prisma:generate
pnpm prisma:migrate
```
> [!IMPORTANT]
> Fill in your database URL and secrets in `./backend/.env` before proceeding.
6. **Start your app in both directories:**
```bash
pnpm dev
```
or **build** it:
```bash
pnpm build
```

---

Have Fun!
