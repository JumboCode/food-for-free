/*
  Warnings:

  - You are about to drop the `InventoryRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UploadedSheet` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('DAIRY', 'DRY_GOODS', 'BAKERY', 'FROZEN_MEAT', 'MISC_COLD', 'NON_FOOD', 'PRODUCE');

-- DropForeignKey
ALTER TABLE "InventoryRecord" DROP CONSTRAINT "InventoryRecord_uploadedSheetId_fkey";

-- AlterTable
ALTER TABLE "AllInventoryTransactions" ADD COLUMN     "minimallyProcessedFood" BOOLEAN,
ADD COLUMN     "productType" "ProductType";

-- DropTable
DROP TABLE "InventoryRecord";

-- DropTable
DROP TABLE "UploadedSheet";
