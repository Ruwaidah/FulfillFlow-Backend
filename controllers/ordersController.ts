import { Request, Response } from "express";
import prisma from "../lib/db";


// GET /api/orders
export const getOrders = async (
    req: Request,
    res: Response
) => {
    try {
        const { status, orderType } = req.query;

        const orders = await prisma.order.findMany({
            where: {
                ...(status && {
                    status: String(status),
                }),

                ...(orderType && {
                    orderType: String(orderType),
                }),
            },

            include: {
                activities: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },

                    orderBy: {
                        createdAt: "desc",
                    },
                },

                pickAssignments: {
                    include: {
                        associate: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },

                dispenser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },

            orderBy: {
                createdAt: "desc",
            },
        });

        return res.status(200).json(orders);
    } catch (error) {
        console.error("GET ORDERS ERROR:", error);

        return res.status(500).json({
            error: "Failed to fetch orders",
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error",
        });
    }
};


// GET /api/orders/:id
export const getOrderById = async (
    req: Request,
    res: Response
) => {
    try {
        const orderId = String(req.params.id);

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },

            include: {
                pickAssignments: {
                    include: {
                        associate: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },

                    orderBy: [
                        {
                            area: "asc",
                        },
                        {
                            sequence: "asc",
                        },
                    ],
                },

                dispenser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },

                activities: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },

                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        if (!order) {
            return res.status(404).json({
                error: "Order not found",
            });
        }

        return res.status(200).json(order);

    } catch (error) {
        console.error("GET ORDER ERROR:", error);

        return res.status(500).json({
            error: "Failed to fetch order",
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error",
        });
    }
};


// POST /api/orders
export const createOrder = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            customerName,
            priority = "medium",
            orderType,
        } = req.body;

        if (!customerName || !orderType) {
            return res.status(400).json({
                error: "customerName and orderType are required",
            });
        }

        const validOrderTypes = [
            "pickup",
            "delivery",
            "shipping",
        ];

        if (!validOrderTypes.includes(orderType)) {
            return res.status(400).json({
                error: "Invalid order type",
            });
        }

        const order = await prisma.order.create({
            data: {
                customerName,
                priority,
                orderType,
                status: "created",
            },
        });

        return res.status(201).json(order);

    } catch (error) {
        console.error("CREATE ORDER ERROR:", error);

        return res.status(500).json({
            error: "Failed to create order",
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error",
        });
    }
};


// PATCH /api/orders/:id/status
export const updateOrderStatus = async (
    req: Request,
    res: Response
) => {
    try {
        const orderId = String(req.params.id);
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                error: "status is required",
            });
        }

        const existingOrder = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });

        if (!existingOrder) {
            return res.status(404).json({
                error: "Order not found",
            });
        }

        const statusesByOrderType: Record<string, string[]> = {
            pickup: [
                "created",
                "pending",
                "ready_to_pick",
                "picking",
                "ready",
                "dispensed",
                "delayed",
                "canceled",
                "expired",
            ],

            delivery: [
                "created",
                "pending",
                "ready_to_pick",
                "picking",
                "ready",
                "dispensed",
                "out_for_delivery",
                "delivered",
                "delayed",
                "canceled",
                "expired",
            ],

            shipping: [
                "created",
                "pending",
                "ready_to_pick",
                "picking",
                "ready",
                "shipped",
                "delivered",
                "delayed",
                "canceled",
                "expired",
            ],
        };

        const allowedStatuses =
            statusesByOrderType[existingOrder.orderType];

        if (!allowedStatuses?.includes(status)) {
            return res.status(400).json({
                error: `Status "${status}" is not valid for ${existingOrder.orderType} orders`,
            });
        }

        const order = await prisma.order.update({
            where: {
                id: orderId,
            },

            data: {
                status,
            },

            include: {
                pickAssignments: {
                    include: {
                        associate: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },

                dispenser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return res.status(200).json(order);

    } catch (error) {
        console.error("UPDATE ORDER STATUS ERROR:", error);

        return res.status(500).json({
            error: "Failed to update order status",
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error",
        });
    }
};


// POST /api/orders/:id/picks
export const createPickAssignment = async (
    req: Request,
    res: Response
) => {
    try {
        const orderId = String(req.params.id);
        const { area } = req.body;

        const validAreas = [
            "ambient",
            "chilled",
            "frozen",
            "oversized",
        ];

        if (!area || !validAreas.includes(area)) {
            return res.status(400).json({
                error: "Invalid pick area",
            });
        }

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });

        if (!order) {
            return res.status(404).json({
                error: "Order not found",
            });
        }

        const existingCount =
            await prisma.pickAssignment.count({
                where: {
                    orderId,
                    area,
                },
            });

        const pickAssignment =
            await prisma.pickAssignment.create({
                data: {
                    orderId,
                    area,
                    sequence: existingCount + 1,
                    status: "ready_to_pick",
                    associateId: null,
                },
            });

        return res.status(201).json(pickAssignment);

    } catch (error) {
        console.error("CREATE PICK ERROR:", error);

        return res.status(500).json({
            error: "Failed to create pick assignment",
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error",
        });
    }
};


// PATCH /api/orders/:orderId/picks/:pickId/start
export const startPickAssignment = async (
    req: Request,
    res: Response
) => {
    try {
        const orderId = String(req.params.orderId);
        const pickId = String(req.params.pickId);
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: "userId is required",
            });
        }

        const pick = await prisma.pickAssignment.findFirst({
            where: {
                id: pickId,
                orderId,
            },
        });

        if (!pick) {
            return res.status(404).json({
                error: "Pick assignment not found",
            });
        }

        if (pick.status !== "ready_to_pick") {
            return res.status(409).json({
                error: "This pick is not available to start",
            });
        }

        if (pick.associateId) {
            return res.status(409).json({
                error: "This pick is already assigned",
            });
        }

        const updatedPick = await prisma.$transaction(
            async (tx) => {
                const claimed = await tx.pickAssignment.updateMany({
                    where: {
                        id: pickId,
                        orderId,
                        status: "ready_to_pick",
                        associateId: null,
                    },

                    data: {
                        status: "picking",
                        associateId: userId,
                        startedAt: new Date(),
                    },
                });

                if (claimed.count === 0) {
                    throw new Error(
                        "This pick was already started by another associate"
                    );
                }

                await tx.order.update({
                    where: {
                        id: orderId,
                    },

                    data: {
                        status: "picking",
                    },
                });

                await tx.activity.create({
                    data: {
                        action: `Started picking ${pick.area} #${pick.sequence}`,
                        fromStatus: "ready_to_pick",
                        toStatus: "picking",
                        userId,
                        orderId,
                    },
                });

                return tx.pickAssignment.findUnique({
                    where: {
                        id: pickId,
                    },

                    include: {
                        associate: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                });
            }
        );

        return res.status(200).json(updatedPick);

    } catch (error) {
        console.error("START PICK ERROR:", error);

        return res.status(500).json({
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to start pick assignment",
        });
    }
};


// PATCH /api/orders/:orderId/picks/:pickId/complete
export const completePickAssignment = async (
    req: Request,
    res: Response
) => {
    try {
        const orderId = String(req.params.orderId);
        const pickId = String(req.params.pickId);
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: "userId is required",
            });
        }

        const pick = await prisma.pickAssignment.findFirst({
            where: {
                id: pickId,
                orderId,
            },
        });

        if (!pick) {
            return res.status(404).json({
                error: "Pick assignment not found",
            });
        }

        if (pick.associateId !== userId) {
            return res.status(403).json({
                error: "Only the assigned associate can complete this pick",
            });
        }

        if (pick.status !== "picking") {
            return res.status(400).json({
                error: "This pick is not currently being picked",
            });
        }

        const updatedPick = await prisma.$transaction(
            async (tx) => {
                const completed = await tx.pickAssignment.update({
                    where: {
                        id: pickId,
                    },

                    data: {
                        status: "completed",
                        completedAt: new Date(),
                    },

                    include: {
                        associate: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                });

                await tx.activity.create({
                    data: {
                        action: `Completed ${pick.area} #${pick.sequence}`,
                        fromStatus: "picking",
                        toStatus: "completed",
                        userId,
                        orderId,
                    },
                });

                const incompletePicks =
                    await tx.pickAssignment.count({
                        where: {
                            orderId,

                            status: {
                                not: "completed",
                            },
                        },
                    });

                if (incompletePicks === 0) {
                    await tx.order.update({
                        where: {
                            id: orderId,
                        },

                        data: {
                            status: "ready",
                        },
                    });
                }

                return completed;
            }
        );

        return res.status(200).json(updatedPick);

    } catch (error) {
        console.error("COMPLETE PICK ERROR:", error);

        return res.status(500).json({
            error: "Failed to complete pick assignment",
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error",
        });
    }
};


// PATCH /api/orders/:id/dispense
export const dispenseOrder = async (
    req: Request,
    res: Response
) => {
    try {
        const orderId = String(req.params.id);
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: "userId is required",
            });
        }

        const existingOrder = await prisma.order.findUnique({
            where: {
                id: orderId,
            },

            include: {
                pickAssignments: true,
            },
        });

        if (!existingOrder) {
            return res.status(404).json({
                error: "Order not found",
            });
        }

        const hasIncompletePicks =
            existingOrder.pickAssignments.some(
                (pick) => pick.status !== "completed"
            );

        if (hasIncompletePicks) {
            return res.status(400).json({
                error: "All picks must be completed before dispensing",
            });
        }

        if (existingOrder.status !== "ready") {
            return res.status(400).json({
                error: "Only ready orders can be dispensed",
            });
        }

        const order = await prisma.order.update({
            where: {
                id: orderId,
            },

            data: {
                status: "dispensed",
                dispenserId: userId,
                dispensedAt: new Date(),

                activities: {
                    create: {
                        action: "Order dispensed",
                        fromStatus: "ready",
                        toStatus: "dispensed",
                        userId,
                    },
                },
            },

            include: {
                dispenser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },

                pickAssignments: {
                    include: {
                        associate: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },

                activities: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        return res.status(200).json(order);

    } catch (error) {
        console.error("DISPENSE ORDER ERROR:", error);

        return res.status(500).json({
            error: "Failed to dispense order",
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error",
        });
    }
};