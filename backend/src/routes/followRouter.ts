import { Router } from "express";
import {
    sendFollow,
    updateFollowStatus,
    deleteFollow,
    blockUser,
} from "../controllers/followController";

const followRouter = Router();

// create a new follow request
followRouter.post("/", ...sendFollow);

// accept or refuse the follow request (recipient only)
followRouter.patch("/:followId", ...updateFollowStatus);

// block a user, if there is no follow request, create a new one with status BLOCKED
followRouter.post("/:userId/block", ...blockUser);

// cancel a friend request, unblock a user, or unfriend a user
followRouter.delete("/:followId", ...deleteFollow);

export default followRouter;
