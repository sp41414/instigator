import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import { Response } from "express"
import passport from "./config/passport"
import router from "./routes"

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({
    origin: [process.env.FRONTEND_URL as string, "http://localhost:5173"],
    credentials: true
}))
app.use(helmet())
app.use(cookieParser(process.env.COOKIE_SECRET!))
app.use(passport.initialize())
app.use("/api/v1", router)
app.use((err, req, res: Response, next) => {
    console.error(err.stack)
    res.status(500).json({
        success: false,
        message: err.message,
        error: {
            code: err.code || "INTERNAL_SERVER_ERROR",
            timestamp: new Date().toISOString()
        }
    })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`App listening on port ${PORT}`)
})
