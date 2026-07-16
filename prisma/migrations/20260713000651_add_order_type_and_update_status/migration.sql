-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderType" TEXT NOT NULL DEFAULT 'pickup',
ALTER COLUMN "status" SET DEFAULT 'created';
