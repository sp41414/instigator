import { Router } from "express";
import { sendFollow, updateFollowStatus, deleteFollow } from "../controllers/followController"

const followRouter = Router()

followRouter.post("/", ...sendFollow)
followRouter.patch("/:followId", ...updateFollowStatus)
followRouter.delete("/:followId", ...deleteFollow)

export default followRouter
