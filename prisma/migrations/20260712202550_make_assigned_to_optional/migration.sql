-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_assignedToId_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "assignedToId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
