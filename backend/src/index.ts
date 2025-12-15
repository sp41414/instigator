import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import { Request, Response, NextFunction } from "express"

const app = express()

app.use(cors({
    origin: [process.env.FRONTEND_URL as string, "http://localhost:5173"],
    credentials: true
}))
app.use(helmet())
app.use(cookieParser())
app.use((err, req: Request, res: Response, next: NextFunction) => {
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

const PORT = parseInt(process.env.PORT || "8000", 10)

app.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`App listening on port ${PORT}`)
})
