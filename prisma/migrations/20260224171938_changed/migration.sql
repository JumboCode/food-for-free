/*
  Warnings:

  - You are about to drop the `AllInventoryTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "AllInventoryTransaction";

-- CreateTable
CREATE TABLE "AllInventoryTransactions" (
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "pantryProductName" TEXT NOT NULL,
    "inventoryType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "productUnitsForDisplay" TEXT,
    "weightLbs" DOUBLE PRECISION,
    "source" TEXT,
    "destination" TEXT,
    "productInventoryRecordId18" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllInventoryTransactions_pkey" PRIMARY KEY ("productInventoryRecordId18")
);
