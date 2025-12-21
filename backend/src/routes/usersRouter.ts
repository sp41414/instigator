import { Router } from "express";
import {
    getProfile,
    getUserProfile,
    updateProfile,
    deleteUser,
    updateProfilePicture,
} from "../controllers/usersController";
import multer from "multer";

const usersRouter = Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 8 * 1024 * 1024,
    },
});

usersRouter.get("/me", ...getProfile);
usersRouter.get("/:id", ...getUserProfile);
usersRouter.put("/me", ...updateProfile);
usersRouter.put("/me/avatar", upload.single("file"), ...updateProfilePicture);
usersRouter.delete("/me", ...deleteUser);

export default usersRouter;
