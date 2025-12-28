import { Router } from "express";
import authRouter from "./authRouter.js";
import usersRouter from "./usersRouter.js";
import followRouter from "./followRouter.js";
import postsRouter from "./postsRouter.js";

const router = Router();
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/follows", followRouter);
router.use("/posts", postsRouter);

export default router;
