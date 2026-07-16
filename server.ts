import express from "express";
import cors from "cors";
import ordersRouter from "./routes/orders";

const app = express();

app.use(cors());
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