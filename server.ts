import express from "express";
import cors from "cors";
import ordersRouter from "./routes/orders";

const app = express();

const allowedOrigins = [
    "http://localhost:3000",
    process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.use(express.json());

app.get("/", (_req, res) => {
    res.status(200).json({
        message: "FulfillFlow API is running",
    });
});

app.use("/api/orders", ordersRouter);

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});