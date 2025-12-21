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
    likePost,
    likeComment,
} from "../controllers/postsController";

const postsRouter = Router();

postsRouter.post("/", ...createPost);
postsRouter.get("/", ...getFeed);
postsRouter.get("/:postId", ...getPost);
postsRouter.put("/:postId", ...updatePost);
postsRouter.delete("/:postId", ...deletePost);

// comments are READ from the getPost route
postsRouter.post("/:postId/comments", ...createComment);
postsRouter.put("/:postId/comments/:commentId", ...updateComment);
postsRouter.delete("/:postId/comments/:commentId", ...deleteComment);

// toggle like unlike single route posts and comments
postsRouter.post("/:postId/like", ...likePost);
postsRouter.post("/:postId/comments/:commentId/like", ...likeComment);

export default postsRouter;
