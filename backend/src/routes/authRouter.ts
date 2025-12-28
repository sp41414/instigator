import { Request, Response, Router } from "express";
import {
    login,
    signup,
    logout,
    setupUsername,
    guestLogin,
} from "../controllers/authController.js";
import passport from "../config/passport.js";
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
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
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
            sameSite: "none",
            maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
            path: "/",
        });

        res.redirect(`${process.env.FRONTEND_URL}/`);
    },
);

// normal login/signup with JWT
authRouter.post("/login", ...login);
authRouter.post("/signup", ...signup);
authRouter.post("/logout", logout);
authRouter.post("/setup-username", ...setupUsername);

// guest login
authRouter.get("/guest-login", guestLogin);

export default authRouter;
