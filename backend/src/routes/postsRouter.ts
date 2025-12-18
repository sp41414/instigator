import { Router } from "express";
import {
    createPost,
    getFeed,
    getPost,
    updatePost,
    deletePost,
    createComment,
    updateComment,
    deleteComment,
} from "../controllers/postsController";

const postsRouter = Router();

postsRouter.post("/", ...createPost);
postsRouter.get("/", ...getFeed);
postsRouter.get("/:postId", ...getPost);
postsRouter.put("/:postId", ...updatePost);
postsRouter.delete("/:postId", ...deletePost);

postsRouter.post("/:postId/comments", ...createComment);
postsRouter.put("/:postId/comments/:commentId", ...updateComment);
postsRouter.delete("/:postId/comments/:commentId", ...deleteComment);

export default postsRouter;
