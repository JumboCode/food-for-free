/*
  Warnings:

  - Added the required column `updatedAt` to the `AllInventoryTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AllPackagesByItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AllProductPackageDestinations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AllInventoryTransaction" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "AllPackagesByItem" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "AllProductPackageDestinations" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
