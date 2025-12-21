import { Request, Response, Router } from "express";
import {
    login,
    signup,
    logout,
    setupUsername,
} from "../controllers/authController";
import passport from "../config/passport";
import jwt from "jsonwebtoken";
import { loginLimiter, signUpLimiter } from "../middleware/rateLimiter";

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
        const user = req.user as { id: number; username: string };
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

        if (user.username.startsWith("temp_")) {
            return res.json({
                success: false,
                message: "Temporary username, please setup your username",
                data: {
                    needsUsername: true,
                },
            });
        }

        return res.json({
            success: true,
            message: "Logged in successfully",
            data: {
                needsUsername: false,
            },
        });
    },
);

// normal login/signup with JWT
authRouter.post("/login", loginLimiter, ...login);
authRouter.post("/signup", signUpLimiter, ...signup);
authRouter.post("/logout", logout);
authRouter.post("/setup-username", ...setupUsername);

export default authRouter;
