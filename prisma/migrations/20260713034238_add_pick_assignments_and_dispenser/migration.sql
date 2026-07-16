/*
  Warnings:

  - You are about to drop the column `assignedToId` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_userId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_assignedToId_fkey";

-- AlterTable
ALTER TABLE "Activity" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "assignedToId",
ADD COLUMN     "dispensedAt" TIMESTAMP(3),
ADD COLUMN     "dispenserId" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'associate';

-- CreateTable
CREATE TABLE "PickAssignment" (
    "id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ready_to_pick',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "orderId" TEXT NOT NULL,
    "associateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PickAssignment_orderId_area_sequence_key" ON "PickAssignment"("orderId", "area", "sequence");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_dispenserId_fkey" FOREIGN KEY ("dispenserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickAssignment" ADD CONSTRAINT "PickAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickAssignment" ADD CONSTRAINT "PickAssignment_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
