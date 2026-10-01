import "dotenv/config";

import { randomUUID } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error(
        "DATABASE_URL is not defined in your .env file"
    );
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
// CONFIG
// --------------------------------------------------

const ORDERS_PER_DAY = 200;

// -7 through +6 = 14 days
const DAY_OFFSETS = [
    -7,
    -6,
    -5,
    -4,
    -3,
    -2,
    -1,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
];

const TOTAL_ORDERS =
    ORDERS_PER_DAY * DAY_OFFSETS.length;

// --------------------------------------------------
// MOCK DATA
// --------------------------------------------------

const firstNames = [
    "James",
    "Maria",
    "Robert",
    "Jennifer",
    "David",
    "Lisa",
    "Christopher",
    "Amanda",
    "Daniel",
    "Jessica",
    "Michael",
    "Sarah",
    "Anthony",
    "Ashley",
    "Matthew",
    "Emily",
    "Andrew",
    "Samantha",
    "Joshua",
    "Nicole",
    "Ryan",
    "Rachel",
    "Brandon",
    "Stephanie",
    "Kevin",
    "Lauren",
    "Justin",
    "Megan",
    "Eric",
    "Brittany",
    "Jason",
    "Heather",
    "Aaron",
    "Melissa",
    "Nathan",
    "Rebecca",
    "Tyler",
    "Michelle",
    "Jonathan",
    "Amber",
];

const lastNames = [
    "Wilson",
    "Garcia",
    "Miller",
    "Anderson",
    "Martinez",
    "Thompson",
    "Lee",
    "White",
    "Harris",
    "Clark",
    "Johnson",
    "Williams",
    "Brown",
    "Davis",
    "Rodriguez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Perez",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lewis",
    "Robinson",
    "Walker",
    "Hall",
    "Allen",
    "Young",
    "King",
    "Wright",
    "Scott",
    "Green",
    "Baker",
    "Adams",
    "Nelson",
    "Carter",
    "Mitchell",
    "Roberts",
    "Turner",
];

const associateNames = [
    "Sarah Johnson",
    "Michael Brown",
    "Emily Davis",
    "Daniel Wilson",
    "Olivia Martinez",
    "Noah Anderson",
    "Sophia Taylor",
    "Liam Thompson",
    "Ava Garcia",
    "Ethan Miller",
    "Mia Rodriguez",
    "Lucas Lee",
    "Isabella Harris",
    "Mason Clark",
    "Charlotte Lewis",
    "Logan Walker",
    "Amelia Hall",
    "Elijah Allen",
    "Harper Young",
    "Benjamin King",
];

const delayReasons = [
    "High order volume",
    "Item availability issue",
    "Picker delay",
    "Customer requested later time",
    "Weather delay",
    "Delivery capacity issue",
    "Inventory verification",
];

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

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function getRandomItem<T>(items: T[]): T {
    return items[
        Math.floor(Math.random() * items.length)
    ];
}

function randomNumber(
    min: number,
    max: number
): number {
    return (
        Math.floor(
            Math.random() * (max - min + 1)
        ) + min
    );
}

function addMinutes(
    date: Date,
    minutes: number
): Date {
    return new Date(
        date.getTime() +
        minutes * 60 * 1000
    );
}

function addHours(
    date: Date,
    hours: number
): Date {
    return new Date(
        date.getTime() +
        hours * 60 * 60 * 1000
    );
}

function addDays(
    date: Date,
    days: number
): Date {
    const result = new Date(date);

    result.setDate(
        result.getDate() + days
    );

    return result;
}

function randomCustomerName(): string {
    return `${getRandomItem(firstNames)} ${getRandomItem(
        lastNames
    )}`;
}

function weightedRandom<T>(
    values: Array<{
        value: T;
        weight: number;
    }>
): T {
    const totalWeight = values.reduce(
        (sum, item) =>
            sum + item.weight,
        0
    );

    let random =
        Math.random() * totalWeight;

    for (const item of values) {
        random -= item.weight;

        if (random <= 0) {
            return item.value;
        }
    }

    return values[
        values.length - 1
    ].value;
}

// --------------------------------------------------
// SCHEDULED DATE
// --------------------------------------------------

function createScheduledDate(
    dayOffset: number
): Date {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    date.setDate(
        date.getDate() + dayOffset
    );

    // Scheduled between 8 AM and 9 PM
    date.setHours(
        randomNumber(8, 20),
        getRandomItem([
            0,
            15,
            30,
            45,
        ]),
        0,
        0
    );

    return date;
}

// --------------------------------------------------
// CREATED DATE
// --------------------------------------------------

function createCreatedDate(
    scheduledFor: Date
): Date {
    const daysBefore =
        randomNumber(1, 5);

    const createdAt =
        addDays(
            scheduledFor,
            -daysBefore
        );

    createdAt.setHours(
        randomNumber(7, 20),
        randomNumber(0, 59),
        0,
        0
    );

    return createdAt;
}

// --------------------------------------------------
// ORDER STATUS
// --------------------------------------------------

function getOrderStatus(
    orderType: OrderType,
    dayOffset: number
): OrderStatus {
    const randomValue =
        Math.random();

    // Rare canceled orders
    if (randomValue < 0.025) {
        return "canceled";
    }

    // Expired should mainly be today/past
    if (
        dayOffset <= 0 &&
        randomValue < 0.045
    ) {
        return "expired";
    }

    // Delays mostly today/past
    if (
        dayOffset <= 1 &&
        randomValue < 0.08
    ) {
        return "delayed";
    }

    // ----------------------------------------------
    // FUTURE: 2-6 days away
    // ----------------------------------------------

    if (dayOffset >= 2) {
        return weightedRandom([
            {
                value: "created",
                weight: 25,
            },
            {
                value: "pending",
                weight: 45,
            },
            {
                value: "ready_to_pick",
                weight: 30,
            },
        ]);
    }

    // ----------------------------------------------
    // TOMORROW
    // ----------------------------------------------

    if (dayOffset === 1) {
        return weightedRandom([
            {
                value: "pending",
                weight: 30,
            },
            {
                value: "ready_to_pick",
                weight: 35,
            },
            {
                value: "picking",
                weight: 20,
            },
            {
                value: "ready",
                weight: 15,
            },
        ]);
    }

    // ----------------------------------------------
    // TODAY
    // ----------------------------------------------

    if (dayOffset === 0) {
        if (orderType === "pickup") {
            return weightedRandom([
                { value: "created", weight: 10 },
                { value: "pending", weight: 15 },
                { value: "ready_to_pick", weight: 20 },
                { value: "picking", weight: 20 },
                { value: "ready", weight: 20 },
                { value: "dispensed", weight: 15 },
            ]);
        }

        if (orderType === "delivery") {
            return weightedRandom([
                { value: "created", weight: 10 },
                { value: "pending", weight: 15 },
                { value: "ready_to_pick", weight: 15 },
                { value: "picking", weight: 20 },
                { value: "ready", weight: 15 },
                { value: "dispensed", weight: 10 },
                { value: "out_for_delivery", weight: 10 },
                { value: "delivered", weight: 5 },
            ]);
        }

        // shipping
        return weightedRandom([
            { value: "created", weight: 10 },
            { value: "pending", weight: 15 },
            { value: "ready_to_pick", weight: 20 },
            { value: "picking", weight: 20 },
            { value: "ready", weight: 15 },
            { value: "shipped", weight: 15 },
            { value: "delivered", weight: 5 },
        ]);
    }

    // ----------------------------------------------
    // PAST
    // ----------------------------------------------

    if (orderType === "pickup") {
        return weightedRandom([
            {
                value: "picking",
                weight: 5,
            },
            {
                value: "ready",
                weight: 10,
            },
            {
                value: "dispensed",
                weight: 85,
            },
        ]);
    }

    if (orderType === "delivery") {
        return weightedRandom([
            {
                value: "ready",
                weight: 5,
            },
            {
                value: "dispensed",
                weight: 10,
            },
            {
                value: "out_for_delivery",
                weight: 15,
            },
            {
                value: "delivered",
                weight: 70,
            },
        ]);
    }

    return weightedRandom([
        {
            value: "ready",
            weight: 5,
        },
        {
            value: "shipped",
            weight: 20,
        },
        {
            value: "delivered",
            weight: 75,
        },
    ]);
}

// --------------------------------------------------
// PICK STATUS
// --------------------------------------------------

function getPickStatusForOrder(
    orderStatus: OrderStatus
): PickStatus {
    if (
        orderStatus === "created" ||
        orderStatus === "pending" ||
        orderStatus ===
        "ready_to_pick" ||
        orderStatus === "canceled" ||
        orderStatus === "expired"
    ) {
        return "ready_to_pick";
    }

    if (
        orderStatus === "picking" ||
        orderStatus === "delayed"
    ) {
        return weightedRandom([
            {
                value: "ready_to_pick",
                weight: 25,
            },
            {
                value: "picking",
                weight: 35,
            },
            {
                value: "completed",
                weight: 40,
            },
        ]);
    }

    return "completed";
}

// --------------------------------------------------
// BUILD PICK AREAS
// --------------------------------------------------

function buildPickTasks(): Array<{
    area: PickArea;
    sequence: number;
}> {
    const picks: Array<{
        area: PickArea;
        sequence: number;
    }> = [];

    // Ambient: always
    const ambientCount =
        randomNumber(1, 3);

    for (
        let sequence = 1;
        sequence <= ambientCount;
        sequence++
    ) {
        picks.push({
            area: "ambient",
            sequence,
        });
    }

    // Chilled: 75%
    if (Math.random() < 0.75) {
        const chilledCount =
            randomNumber(1, 2);

        for (
            let sequence = 1;
            sequence <= chilledCount;
            sequence++
        ) {
            picks.push({
                area: "chilled",
                sequence,
            });
        }
    }

    // Frozen: 60%
    if (Math.random() < 0.6) {
        const frozenCount =
            randomNumber(1, 2);

        for (
            let sequence = 1;
            sequence <= frozenCount;
            sequence++
        ) {
            picks.push({
                area: "frozen",
                sequence,
            });
        }
    }

    // Oversized: 30%
    if (Math.random() < 0.3) {
        picks.push({
            area: "oversized",
            sequence: 1,
        });
    }

    return picks;
}

// --------------------------------------------------
// CREATE IN CHUNKS
// --------------------------------------------------

async function createInChunks<T>(
    rows: T[],
    chunkSize: number,
    create: (chunk: T[]) => Promise<unknown>
) {
    for (
        let index = 0;
        index < rows.length;
        index += chunkSize
    ) {
        const chunk = rows.slice(
            index,
            index + chunkSize
        );

        await create(chunk);
    }
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
    console.log("");
    console.log(
        "Starting FulfillFlow database seed..."
    );

    // --------------------------------------------------
    // DELETE OLD DATA
    // --------------------------------------------------

    console.log(
        "Deleting old data..."
    );

    await prisma.activity.deleteMany();
    await prisma.pickAssignment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();

    console.log(
        "Old data deleted."
    );

    // --------------------------------------------------
    // USERS
    // --------------------------------------------------

    console.log(
        "Creating users..."
    );

    const teamLeadId =
        randomUUID();

    await prisma.user.create({
        data: {
            id: teamLeadId,
            name: "Alex Morgan",
            email:
                "alex@fulfillflow.com",
            passwordHash:
                "mock-password",
            role: "team_lead",
        },
    });

    const associateRows =
        associateNames.map(
            (name, index) => ({
                id: randomUUID(),
                name,

                email: `associate${index + 1}@fulfillflow.com`,

                passwordHash:
                    "mock-password",

                role: "associate",
            })
        );

    await prisma.user.createMany({
        data: associateRows,
    });

    const associateIds =
        associateRows.map(
            (associate) =>
                associate.id
        );

    console.log(
        `${associateRows.length + 1} users created`
    );

    // --------------------------------------------------
    // ARRAYS FOR BULK INSERT
    // --------------------------------------------------

    const ordersToCreate: any[] = [];
    const picksToCreate: any[] = [];
    const activitiesToCreate: any[] =
        [];

    // --------------------------------------------------
    // CREATE ORDERS
    // --------------------------------------------------

    console.log(
        `Building ${TOTAL_ORDERS} orders...`
    );

    for (const dayOffset of DAY_OFFSETS) {
        for (
            let index = 0;
            index < ORDERS_PER_DAY;
            index++
        ) {
            const orderId =
                randomUUID();

            const orderType: OrderType =
                index % 3 === 0
                    ? "pickup"
                    : index % 3 === 1
                        ? "delivery"
                        : "shipping";

            const status =
                getOrderStatus(
                    orderType,
                    dayOffset
                );

            const priority =
                weightedRandom([
                    {
                        value:
                            "low" as Priority,
                        weight: 25,
                    },
                    {
                        value:
                            "medium" as Priority,
                        weight: 55,
                    },
                    {
                        value:
                            "high" as Priority,
                        weight: 20,
                    },
                ]);

            const scheduledFor =
                orderType === "pickup" ||
                    orderType === "delivery"
                    ? createScheduledDate(dayOffset)
                    : null;

            const createdAt =
                scheduledFor
                    ? createCreatedDate(scheduledFor)
                    : createCreatedDate(new Date());

            const shipBy =
                orderType === "shipping"
                    ? createScheduledDate(dayOffset)
                    : null;

            // Use scheduled time for pickup/delivery.
            // Shipping gets an operational date after the order was created.
            const operationalDate =
                scheduledFor ??
                addHours(
                    createdAt,
                    randomNumber(12, 48)
                );

            const delayReason =
                status === "delayed"
                    ? getRandomItem(
                        delayReasons
                    )
                    : null;

            // --------------------------------------------------
            // DISPENSER
            // --------------------------------------------------

            const shouldHaveDispenser =
                orderType ===
                    "pickup" &&
                    status ===
                    "dispensed"
                    ? true
                    : orderType ===
                    "delivery" &&
                    [
                        "dispensed",
                        "out_for_delivery",
                        "delivered",
                    ].includes(
                        status
                    );

            const dispenserId =
                shouldHaveDispenser
                    ? getRandomItem(
                        associateIds
                    )
                    : null;

            let dispensedAt:
                | Date
                | null = null;

            if (dispenserId) {
                dispensedAt =
                    addMinutes(
                        operationalDate,
                        randomNumber(
                            -30,
                            30
                        )
                    );
            }

            ordersToCreate.push({
                id: orderId,
                customerName: randomCustomerName(),
                orderType,
                status,
                priority,
                createdAt,
                scheduledFor,
                shipBy,
                dispenserId,
                dispensedAt,
                delayReason,
            });

            // --------------------------------------------------
            // ORDER CREATED ACTIVITY
            // --------------------------------------------------

            activitiesToCreate.push({
                id: randomUUID(),

                action:
                    "Order created",

                fromStatus: null,

                toStatus: "created",

                createdAt,

                userId:
                    teamLeadId,

                orderId,
            });

            // --------------------------------------------------
            // PICK ASSIGNMENTS
            // --------------------------------------------------

            const pickTasks =
                buildPickTasks();

            let latestPickTime =
                createdAt;

            for (
                const pickTask of pickTasks
            ) {
                const pickId =
                    randomUUID();

                const pickStatus =
                    getPickStatusForOrder(
                        status
                    );

                let associateId:
                    | string
                    | null = null;

                let startedAt:
                    | Date
                    | null = null;

                let completedAt:
                    | Date
                    | null = null;

                if (
                    pickStatus ===
                    "picking" ||
                    pickStatus ===
                    "completed"
                ) {
                    associateId =
                        getRandomItem(
                            associateIds
                        );

                    startedAt =
                        addMinutes(
                            createdAt,
                            randomNumber(
                                30,
                                360
                            )
                        );

                    if (
                        startedAt >
                        operationalDate
                    ) {
                        startedAt =
                            addMinutes(
                                operationalDate,
                                -randomNumber(
                                    30,
                                    120
                                )
                            );
                    }

                    latestPickTime =
                        startedAt;
                }

                if (
                    pickStatus ===
                    "completed" &&
                    startedAt
                ) {
                    completedAt =
                        addMinutes(
                            startedAt,
                            randomNumber(
                                10,
                                75
                            )
                        );

                    latestPickTime =
                        completedAt;
                }

                picksToCreate.push({
                    id: pickId,

                    orderId,

                    area:
                        pickTask.area,

                    sequence:
                        pickTask.sequence,

                    status:
                        pickStatus,

                    associateId,

                    startedAt,

                    completedAt,
                });

                // --------------------------------------------------
                // PICK ACTIVITIES
                // --------------------------------------------------

                if (
                    associateId &&
                    startedAt
                ) {
                    activitiesToCreate.push(
                        {
                            id: randomUUID(),

                            action: `Started picking ${pickTask.area} #${pickTask.sequence}`,

                            fromStatus:
                                "ready_to_pick",

                            toStatus:
                                "picking",

                            createdAt:
                                startedAt,

                            userId:
                                associateId,

                            orderId,
                        }
                    );
                }

                if (
                    associateId &&
                    completedAt
                ) {
                    activitiesToCreate.push(
                        {
                            id: randomUUID(),

                            action: `Completed ${pickTask.area} #${pickTask.sequence}`,

                            fromStatus:
                                "picking",

                            toStatus:
                                "completed",

                            createdAt:
                                completedAt,

                            userId:
                                associateId,

                            orderId,
                        }
                    );
                }
            }

            // --------------------------------------------------
            // SPECIAL STATUS ACTIVITIES
            // --------------------------------------------------

            if (
                status === "delayed"
            ) {
                activitiesToCreate.push({
                    id: randomUUID(),

                    action:
                        "Order delayed",

                    fromStatus:
                        "picking",

                    toStatus:
                        "delayed",

                    createdAt:
                        addMinutes(
                            operationalDate,
                            -20
                        ),

                    userId:
                        teamLeadId,

                    orderId,
                });
            }

            if (
                status === "canceled"
            ) {
                activitiesToCreate.push({
                    id: randomUUID(),

                    action:
                        "Order canceled",

                    fromStatus:
                        "pending",

                    toStatus:
                        "canceled",

                    createdAt:
                        addHours(
                            createdAt,
                            randomNumber(
                                1,
                                12
                            )
                        ),

                    userId:
                        teamLeadId,

                    orderId,
                });
            }

            if (
                status === "expired"
            ) {
                activitiesToCreate.push({
                    id: randomUUID(),

                    action:
                        "Order expired",

                    fromStatus:
                        "ready",

                    toStatus:
                        "expired",

                    createdAt:
                        addMinutes(
                            operationalDate,
                            60
                        ),

                    userId:
                        teamLeadId,

                    orderId,
                });
            }

            // --------------------------------------------------
            // DISPENSING ACTIVITY
            // --------------------------------------------------

            if (
                dispenserId &&
                dispensedAt
            ) {
                activitiesToCreate.push({
                    id: randomUUID(),

                    action:
                        "Order dispensed",

                    fromStatus:
                        "ready",

                    toStatus:
                        "dispensed",

                    createdAt:
                        dispensedAt,

                    userId:
                        dispenserId,

                    orderId,
                });
            }

            // --------------------------------------------------
            // DELIVERY ACTIVITIES
            // --------------------------------------------------

            if (
                orderType ===
                "delivery" &&
                (
                    status ===
                    "out_for_delivery" ||
                    status ===
                    "delivered"
                )
            ) {
                const outForDeliveryAt =
                    dispensedAt
                        ? addMinutes(
                            dispensedAt,
                            randomNumber(
                                10,
                                30
                            )
                        )
                        : addMinutes(
                            operationalDate,
                            -30
                        );

                activitiesToCreate.push({
                    id: randomUUID(),

                    action:
                        "Order out for delivery",

                    fromStatus:
                        "dispensed",

                    toStatus:
                        "out_for_delivery",

                    createdAt:
                        outForDeliveryAt,

                    userId:
                        dispenserId,

                    orderId,
                });

                if (
                    status ===
                    "delivered"
                ) {
                    activitiesToCreate.push(
                        {
                            id: randomUUID(),

                            action:
                                "Order delivered",

                            fromStatus:
                                "out_for_delivery",

                            toStatus:
                                "delivered",

                            createdAt:
                                addMinutes(
                                    outForDeliveryAt,
                                    randomNumber(
                                        30,
                                        120
                                    )
                                ),

                            userId:
                                dispenserId,

                            orderId,
                        }
                    );
                }
            }

            // --------------------------------------------------
            // SHIPPING ACTIVITIES
            // --------------------------------------------------

            if (
                orderType ===
                "shipping" &&
                (
                    status ===
                    "shipped" ||
                    status ===
                    "delivered"
                )
            ) {
                const shippedAt =
                    addMinutes(
                        operationalDate,
                        -randomNumber(
                            30,
                            180
                        )
                    );

                activitiesToCreate.push({
                    id: randomUUID(),

                    action:
                        "Order shipped",

                    fromStatus:
                        "ready",

                    toStatus:
                        "shipped",

                    createdAt:
                        shippedAt,

                    userId:
                        teamLeadId,

                    orderId,
                });

                if (
                    status ===
                    "delivered"
                ) {
                    activitiesToCreate.push(
                        {
                            id: randomUUID(),

                            action:
                                "Order delivered",

                            fromStatus:
                                "shipped",

                            toStatus:
                                "delivered",

                            createdAt:
                                addHours(
                                    shippedAt,
                                    randomNumber(
                                        12,
                                        72
                                    )
                                ),

                            userId:
                                teamLeadId,

                            orderId,
                        }
                    );
                }
            }
        }
    }

    // --------------------------------------------------
    // DATABASE INSERTS
    // --------------------------------------------------

    console.log(
        `Creating ${ordersToCreate.length} orders...`
    );

    await createInChunks(
        ordersToCreate,
        500,
        async (chunk) => {
            await prisma.order.createMany({
                data: chunk,
            });
        }
    );

    console.log(
        `${ordersToCreate.length} orders created`
    );

    console.log(
        `Creating ${picksToCreate.length} pick assignments...`
    );

    await createInChunks(
        picksToCreate,
        500,
        async (chunk) => {
            await prisma.pickAssignment.createMany(
                {
                    data: chunk,
                }
            );
        }
    );

    console.log(
        `${picksToCreate.length} pick assignments created`
    );

    console.log(
        `Creating ${activitiesToCreate.length} activities...`
    );

    await createInChunks(
        activitiesToCreate,
        500,
        async (chunk) => {
            await prisma.activity.createMany({
                data: chunk,
            });
        }
    );

    console.log(
        `${activitiesToCreate.length} activities created`
    );

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

    console.log(
        `Users: ${userCount}`
    );

    console.log(
        `Orders: ${orderCount}`
    );

    console.log(
        `Pick assignments: ${pickCount}`
    );

    console.log(
        `Activities: ${activityCount}`
    );

    // --------------------------------------------------
    // ORDERS BY DATE
    // --------------------------------------------------

    console.log("");
    console.log(
        "Schedule coverage:"
    );

    console.log(
        "7 days ago -> today -> 6 days ahead"
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
    console.log(
        "Orders by status:"
    );

    for (
        const item of ordersByStatus
    ) {
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
    console.log(
        "Orders by type:"
    );

    for (
        const item of ordersByType
    ) {
        console.log(
            `   ${item.orderType}: ${item._count.orderType}`
        );
    }

    // --------------------------------------------------
    // PICK AREA SUMMARY
    // --------------------------------------------------

    const picksByArea =
        await prisma.pickAssignment.groupBy(
            {
                by: ["area"],

                _count: {
                    area: true,
                },
            }
        );

    console.log("");
    console.log(
        "Pick assignments by area:"
    );

    for (
        const item of picksByArea
    ) {
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
        console.error("");
        console.error(
            "Seed failed:"
        );

        console.error(error);

        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });