import { Router } from "express";
import {
    createPost,
    getFeed,
    getPost,
    updatePost,
    deletePost,
} from "../controllers/postsController";

const postsRouter = Router();

postsRouter.post("/", ...createPost);
postsRouter.get("/", ...getFeed);
postsRouter.get("/:postId", ...getPost);
postsRouter.put("/:postId", ...updatePost);
postsRouter.delete("/:postId", ...deletePost);

export default postsRouter;
