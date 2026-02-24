-- AlterTable
ALTER TABLE "AllInventoryTransaction" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "AllPackagesByItem" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "AllProductPackageDestinations" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
