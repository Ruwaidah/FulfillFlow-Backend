import { Router } from "express";

import {
    getOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    createPickAssignment,
    startPickAssignment,
    completePickAssignment,
    dispenseOrder,
} from "../controllers/ordersController";

const router = Router();

router.get("/", getOrders);
router.get("/:id", getOrderById);

router.post("/", createOrder);
router.post("/:id/picks", createPickAssignment);

router.patch("/:id/status", updateOrderStatus);

router.patch(
    "/:orderId/picks/:pickId/start",
    startPickAssignment
);

router.patch(
    "/:orderId/picks/:pickId/complete",
    completePickAssignment
);

router.patch("/:id/dispense", dispenseOrder);

export default router;