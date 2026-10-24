import cors from "cors"
import "dotenv/config"
import express from "express"
import authroutes from "./routes/auth.routes.js"
import entryRoutes from "./routes/entry.routes.js"


const app = express()


const allowedOrigins = [
    process.env.CLIENT_URL?.trim().replace(/\/+$/, ""),
    "https://klip-client.vercel.app",
    "http://localhost:5173",
].filter(Boolean)

app.set("trust proxy", 1)
app.use(cors({
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
}))

app.use(express.json())
app.use('/api/auth', authroutes)
app.use('/api/entry', entryRoutes)


const port = process.env.PORT || 3000



app.listen(port, (req, res) => {
    console.log(`app is listening on ${port}`)
})
export default app