/*
  Warnings:

  - You are about to alter the column `numberPickedUp` on the `JustEatsBoxes` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `numberDistributed` on the `JustEatsBoxes` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the `InventoryTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PackagesByItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductPackageDestination` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "JustEatsBoxes" ALTER COLUMN "numberPickedUp" SET DATA TYPE INTEGER,
ALTER COLUMN "numberDistributed" SET DATA TYPE INTEGER;

-- DropTable
DROP TABLE "InventoryTransaction";

-- DropTable
DROP TABLE "PackagesByItem";

-- DropTable
DROP TABLE "ProductPackageDestination";
