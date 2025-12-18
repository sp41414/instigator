import { Request, Response, Router } from "express";
import { login, signup, logout } from "../controllers/authController";
import passport from "../config/passport";
import jwt from "jsonwebtoken";

const authRouter = Router();

// google OAuth
authRouter.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false,
    }),
);
authRouter.get(
    "/google/callback",
    passport.authenticate("google", {
        failureMessage: "Failed to authenticate with Google",
        session: false,
    }),
    (req: Request, res: Response) => {
        const user = req.user as { id: number };
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
            expiresIn: "2d",
        });
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
            signed: true,
        });

        return res.json({
            success: true,
            message: "Logged in successfully",
        });
    },
);

// normal login/signup with JWT
authRouter.post("/login", ...login);
authRouter.post("/signup", ...signup);
authRouter.post("/logout", logout);

export default authRouter;
