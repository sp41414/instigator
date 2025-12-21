import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "./config/passport";
import router from "./routes";
import morgan from "morgan";
import logger from "./utils/logger";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: [process.env.FRONTEND_URL as string, "http://localhost:5173"],
        credentials: true,
    }),
);
app.use(helmet());
app.use(cookieParser(process.env.COOKIE_SECRET!));
app.use(
    morgan("combined", {
        stream: {
            write: (message) => logger.info(message.trim()),
        },
    }),
);
app.use(passport.initialize());
app.use("/api/v1", router);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error("Unhandled error", {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
    });

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
