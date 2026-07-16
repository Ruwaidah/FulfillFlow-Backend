import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in your .env file");
}

const adapter = new PrismaPg({
    connectionString,
});

const prisma = new PrismaClient({
    adapter,
});

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type OrderType =
    | "pickup"
    | "delivery"
    | "shipping";

type OrderStatus =
    | "created"
    | "pending"
    | "ready_to_pick"
    | "picking"
    | "ready"
    | "dispensed"
    | "out_for_delivery"
    | "shipped"
    | "delivered"
    | "delayed"
    | "canceled"
    | "expired";

type Priority =
    | "low"
    | "medium"
    | "high";

type PickArea =
    | "ambient"
    | "chilled"
    | "frozen"
    | "oversized";

type PickStatus =
    | "ready_to_pick"
    | "picking"
    | "completed";

// --------------------------------------------------
// ORDER FLOWS
// --------------------------------------------------

const orderFlows: Record<OrderType, OrderStatus[]> = {
    pickup: [
        "created",
        "pending",
        "ready_to_pick",
        "picking",
        "ready",
        "dispensed",
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
    ],

    shipping: [
        "created",
        "pending",
        "ready_to_pick",
        "picking",
        "ready",
        "shipped",
        "delivered",
    ],
};

// --------------------------------------------------
// MOCK CUSTOMER NAMES
// --------------------------------------------------

const customerNames = [
    "James Wilson",
    "Maria Garcia",
    "Robert Miller",
    "Jennifer Anderson",
    "David Martinez",
    "Lisa Thompson",
    "Christopher Lee",
    "Amanda White",
    "Daniel Harris",
    "Jessica Clark",
    "Michael Johnson",
    "Sarah Williams",
    "Anthony Brown",
    "Ashley Davis",
    "Matthew Rodriguez",
    "Emily Hernandez",
    "Andrew Lopez",
    "Samantha Gonzalez",
    "Joshua Perez",
    "Nicole Taylor",
    "Ryan Moore",
    "Rachel Jackson",
    "Brandon Martin",
    "Stephanie Lee",
    "Kevin Thompson",
    "Lauren White",
    "Justin Harris",
    "Megan Clark",
    "Eric Lewis",
    "Brittany Robinson",
    "Jason Walker",
    "Heather Hall",
    "Aaron Allen",
    "Melissa Young",
    "Nathan King",
    "Rebecca Wright",
    "Tyler Scott",
    "Michelle Green",
    "Jonathan Baker",
    "Amber Adams",
    "Charles Nelson",
    "Danielle Carter",
    "Adam Mitchell",
    "Kimberly Roberts",
    "Steven Turner",
    "Christina Phillips",
    "Brian Campbell",
    "Angela Parker",
    "Patrick Evans",
    "Monica Edwards",
];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function getRandomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

function randomNumber(min: number, max: number): number {
    return (
        Math.floor(Math.random() * (max - min + 1)) + min
    );
}

function randomDateWithinLastDays(days: number): Date {
    const now = new Date();

    const milliseconds =
        Math.floor(
            Math.random() *
            days *
            24 *
            60 *
            60 *
            1000
        );

    return new Date(now.getTime() - milliseconds);
}

function getRandomOrderStatus(
    orderType: OrderType
): OrderStatus {
    const flow = orderFlows[orderType];

    const randomValue = Math.random();

    if (randomValue < 0.05) {
        return "canceled";
    }

    if (randomValue < 0.10) {
        return "expired";
    }

    if (randomValue < 0.15) {
        return "delayed";
    }

    return getRandomItem(flow);
}

function getPickStatusForOrder(
    orderStatus: OrderStatus
): PickStatus {
    if (
        orderStatus === "created" ||
        orderStatus === "pending" ||
        orderStatus === "ready_to_pick" ||
        orderStatus === "canceled" ||
        orderStatus === "expired"
    ) {
        return "ready_to_pick";
    }

    if (orderStatus === "picking") {
        return getRandomItem<PickStatus>([
            "ready_to_pick",
            "picking",
            "completed",
        ]);
    }

    return "completed";
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
    console.log("Starting FulfillFlow database seed...");

    // --------------------------------------------------
    // DELETE OLD DATA
    // --------------------------------------------------

    console.log("Deleting old data...");

    await prisma.activity.deleteMany();
    await prisma.pickAssignment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();

    console.log("Old activities deleted");
    console.log("Old pick assignments deleted");
    console.log("Old orders deleted");
    console.log("Old users deleted");

    // --------------------------------------------------
    // CREATE USERS
    // --------------------------------------------------

    console.log("Creating users...");

    const teamLead = await prisma.user.create({
        data: {
            name: "Alex Morgan",
            email: "alex@fulfillflow.com",
            passwordHash: "mock-password",
            role: "team_lead",
        },
    });

    const sarah = await prisma.user.create({
        data: {
            name: "Sarah Johnson",
            email: "sarah@fulfillflow.com",
            passwordHash: "mock-password",
            role: "associate",
        },
    });

    const michael = await prisma.user.create({
        data: {
            name: "Michael Brown",
            email: "michael@fulfillflow.com",
            passwordHash: "mock-password",
            role: "associate",
        },
    });

    const emily = await prisma.user.create({
        data: {
            name: "Emily Davis",
            email: "emily@fulfillflow.com",
            passwordHash: "mock-password",
            role: "associate",
        },
    });

    const daniel = await prisma.user.create({
        data: {
            name: "Daniel Wilson",
            email: "daniel@fulfillflow.com",
            passwordHash: "mock-password",
            role: "associate",
        },
    });

    const olivia = await prisma.user.create({
        data: {
            name: "Olivia Martinez",
            email: "olivia@fulfillflow.com",
            passwordHash: "mock-password",
            role: "associate",
        },
    });

    const associates = [
        sarah,
        michael,
        emily,
        daniel,
        olivia,
    ];

    console.log(`${associates.length + 1} users created`);

    // --------------------------------------------------
    // CREATE 50 ORDERS
    // --------------------------------------------------

    console.log("Creating 50 orders...");

    const orderTypes: OrderType[] = [
        "pickup",
        "delivery",
        "shipping",
    ];

    const priorities: Priority[] = [
        "low",
        "medium",
        "high",
    ];

    for (let index = 0; index < 50; index++) {
        const orderType =
            getRandomItem(orderTypes);

        const status =
            getRandomOrderStatus(orderType);

        const priority =
            getRandomItem(priorities);

        const createdAt =
            randomDateWithinLastDays(30);

        // Only dispensed pickup/delivery orders get a dispenser.
        const dispenser =
            status === "dispensed"
                ? getRandomItem(associates)
                : null;

        const dispensedAt =
            dispenser
                ? new Date(
                    createdAt.getTime() +
                    randomNumber(60, 360) *
                    60 *
                    1000
                )
                : null;

        const order = await prisma.order.create({
            data: {
                customerName:
                    customerNames[index],

                orderType,
                status,
                priority,
                createdAt,

                dispenserId:
                    dispenser?.id ?? null,

                dispensedAt,
            },
        });

        // --------------------------------------------------
        // CREATE ORDER CREATED ACTIVITY
        // --------------------------------------------------

        await prisma.activity.create({
            data: {
                action: "Order created",
                fromStatus: null,
                toStatus: "created",
                createdAt,

                userId: teamLead.id,
                orderId: order.id,
            },
        });

        // --------------------------------------------------
        // BUILD PICK TASKS
        // --------------------------------------------------

        const picksToCreate: {
            area: PickArea;
            sequence: number;
        }[] = [];

        // 1-3 ambient picks
        const ambientCount =
            randomNumber(1, 3);

        for (
            let sequence = 1;
            sequence <= ambientCount;
            sequence++
        ) {
            picksToCreate.push({
                area: "ambient",
                sequence,
            });
        }

        // 75% chance of chilled picks
        if (Math.random() < 0.75) {
            const chilledCount =
                randomNumber(1, 2);

            for (
                let sequence = 1;
                sequence <= chilledCount;
                sequence++
            ) {
                picksToCreate.push({
                    area: "chilled",
                    sequence,
                });
            }
        }

        // 60% chance of frozen picks
        if (Math.random() < 0.6) {
            const frozenCount =
                randomNumber(1, 2);

            for (
                let sequence = 1;
                sequence <= frozenCount;
                sequence++
            ) {
                picksToCreate.push({
                    area: "frozen",
                    sequence,
                });
            }
        }

        // 30% chance of oversized
        if (Math.random() < 0.3) {
            picksToCreate.push({
                area: "oversized",
                sequence: 1,
            });
        }

        // --------------------------------------------------
        // CREATE PICK ASSIGNMENTS
        // --------------------------------------------------

        for (const pickData of picksToCreate) {
            const pickStatus =
                getPickStatusForOrder(status);

            // No associate until pick actually starts.
            const associate =
                pickStatus === "ready_to_pick"
                    ? null
                    : getRandomItem(associates);

            const startedAt =
                pickStatus === "picking" ||
                    pickStatus === "completed"
                    ? new Date(
                        createdAt.getTime() +
                        randomNumber(
                            15,
                            180
                        ) *
                        60 *
                        1000
                    )
                    : null;

            const completedAt =
                pickStatus === "completed" &&
                    startedAt
                    ? new Date(
                        startedAt.getTime() +
                        randomNumber(
                            10,
                            60
                        ) *
                        60 *
                        1000
                    )
                    : null;

            const pick =
                await prisma.pickAssignment.create({
                    data: {
                        orderId: order.id,

                        area: pickData.area,
                        sequence:
                            pickData.sequence,

                        status: pickStatus,

                        associateId:
                            associate?.id ?? null,

                        startedAt,
                        completedAt,
                    },
                });

            // --------------------------------------------------
            // CREATE PICK ACTIVITY
            // --------------------------------------------------

            if (
                associate &&
                startedAt &&
                pickStatus === "picking"
            ) {
                await prisma.activity.create({
                    data: {
                        action:
                            `Started picking ${pick.area} #${pick.sequence}`,

                        fromStatus:
                            "ready_to_pick",

                        toStatus:
                            "picking",

                        createdAt:
                            startedAt,

                        userId:
                            associate.id,

                        orderId:
                            order.id,
                    },
                });
            }

            if (
                associate &&
                startedAt &&
                completedAt &&
                pickStatus === "completed"
            ) {
                await prisma.activity.createMany({
                    data: [
                        {
                            action:
                                `Started picking ${pick.area} #${pick.sequence}`,

                            fromStatus:
                                "ready_to_pick",

                            toStatus:
                                "picking",

                            createdAt:
                                startedAt,

                            userId:
                                associate.id,

                            orderId:
                                order.id,
                        },

                        {
                            action:
                                `Completed ${pick.area} #${pick.sequence}`,

                            fromStatus:
                                "picking",

                            toStatus:
                                "completed",

                            createdAt:
                                completedAt,

                            userId:
                                associate.id,

                            orderId:
                                order.id,
                        },
                    ],
                });
            }
        }

        // --------------------------------------------------
        // DISPENSE ACTIVITY
        // --------------------------------------------------

        if (
            dispenser &&
            dispensedAt
        ) {
            await prisma.activity.create({
                data: {
                    action: "Order dispensed",
                    fromStatus: "ready",
                    toStatus: "dispensed",

                    createdAt:
                        dispensedAt,

                    userId:
                        dispenser.id,

                    orderId:
                        order.id,
                },
            });
        }
    }

    // --------------------------------------------------
    // COUNTS
    // --------------------------------------------------

    const userCount =
        await prisma.user.count();

    const orderCount =
        await prisma.order.count();

    const pickCount =
        await prisma.pickAssignment.count();

    const activityCount =
        await prisma.activity.count();

    console.log("");
    console.log(
        "Database seeded successfully!"
    );

    console.log(
        "--------------------------------"
    );

    console.log(`Users: ${userCount}`);
    console.log(`Orders: ${orderCount}`);
    console.log(
        `Pick assignments: ${pickCount}`
    );
    console.log(
        `Activities: ${activityCount}`
    );

    // --------------------------------------------------
    // ORDER STATUS SUMMARY
    // --------------------------------------------------

    const ordersByStatus =
        await prisma.order.groupBy({
            by: ["status"],

            _count: {
                status: true,
            },
        });

    console.log("");
    console.log("Orders by status:");

    for (const item of ordersByStatus) {
        console.log(
            `   ${item.status}: ${item._count.status}`
        );
    }

    // --------------------------------------------------
    // ORDER TYPE SUMMARY
    // --------------------------------------------------

    const ordersByType =
        await prisma.order.groupBy({
            by: ["orderType"],

            _count: {
                orderType: true,
            },
        });

    console.log("");
    console.log("Orders by type:");

    for (const item of ordersByType) {
        console.log(
            `   ${item.orderType}: ${item._count.orderType}`
        );
    }

    // --------------------------------------------------
    // PICK AREA SUMMARY
    // --------------------------------------------------

    const picksByArea =
        await prisma.pickAssignment.groupBy({
            by: ["area"],

            _count: {
                area: true,
            },
        });

    console.log("");
    console.log("Pick assignments by area:");

    for (const item of picksByArea) {
        console.log(
            `   ${item.area}: ${item._count.area}`
        );
    }
}

// --------------------------------------------------
// RUN
// --------------------------------------------------

main()
    .catch((error) => {
        console.error("Seed failed:");
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });