import { Router } from "express";
import authRouter from "./authRouter";
import usersRouter from "./usersRouter";

const router = Router()
router.use("/auth", authRouter)
router.use("/users", usersRouter)

export default router
