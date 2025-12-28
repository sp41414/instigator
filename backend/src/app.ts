import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import router from "./routes/index.js";
import rateLimit from "express-rate-limit";

const app = express();

app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: [process.env.FRONTEND_URL as string, "http://localhost:5173"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
        exposedHeaders: ["Set-Cookie"],
    }),
);
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
);
app.use(cookieParser(process.env.COOKIE_SECRET!));
// app.use(
//     rateLimit({
//         windowMs: 5 * 60 * 1000,
//         max: 200,
//         message: {
//             success: false,
//             message: ["Too many requests, try again later"],
//             error: {
//                 code: "RATE_LIMIT_EXCEEDED",
//                 timestamp: new Date().toISOString(),
//             },
//         },
//     }),
// );
app.use(passport.initialize());
app.use("/api/v1", router);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({
        success: false,
        message: err.message,
        error: {
            code: err.code || "INTERNAL_SERVER_ERROR",
            timestamp: new Date().toISOString(),
        },
    });
});

export default app;
