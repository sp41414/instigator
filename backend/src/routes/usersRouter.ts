import { Router } from "express";
import {
    getProfile,
    getUserProfile,
    updateProfile,
    deleteUser,
} from "../controllers/usersController";

const usersRouter = Router();

usersRouter.get("/me", ...getProfile);
usersRouter.get("/:id", ...getUserProfile);
usersRouter.put("/me", ...updateProfile);
usersRouter.delete("/me", ...deleteUser);

export default usersRouter;
