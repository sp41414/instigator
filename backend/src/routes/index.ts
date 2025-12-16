import { Router } from "express";
import authRouter from "./authRouter";
import usersRouter from "./usersRouter";
import followRouter from "./followRouter";

const router = Router()
router.use("/auth", authRouter)
router.use("/users", usersRouter)
router.use("/follows", followRouter)

export default router
