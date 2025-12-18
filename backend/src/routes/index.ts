import { Router } from "express";
import authRouter from "./authRouter";
import usersRouter from "./usersRouter";
import followRouter from "./followRouter";
import postsRouter from "./postsRouter";

const router = Router();
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/follows", followRouter);
router.use("/posts", postsRouter);

export default router;
