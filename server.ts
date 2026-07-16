import express from "express";
import cors from "cors";
import ordersRouter from "./routes/orders";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/orders", ordersRouter);

const PORT = process.env.PORT || 5001;
console.log(PORT)

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});