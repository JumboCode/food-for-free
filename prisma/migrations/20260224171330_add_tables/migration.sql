-- CreateTable
CREATE TABLE "AllInventoryTransaction" (
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT NOT NULL,
    "pantryProductName" TEXT NOT NULL,
    "inventoryType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "productUnitsForDisplay" TEXT,
    "weightLbs" DOUBLE PRECISION,
    "source" TEXT,
    "destination" TEXT,
    "productInventoryRecordId18" TEXT NOT NULL,

    CONSTRAINT "AllInventoryTransaction_pkey" PRIMARY KEY ("productInventoryRecordId18")
);

-- CreateTable
CREATE TABLE "AllPackagesByItem" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productPackageName" TEXT,
    "pantryProductName" TEXT,
    "lotSourceAccountName" TEXT,
    "lotFoodRescueProgram" TEXT,
    "distributionAmount" INTEGER,
    "pantryProductWeightLbs" DOUBLE PRECISION,
    "distributionCost" DOUBLE PRECISION,
    "productInventoryRecordId18" TEXT NOT NULL,
    "productPackageId18" TEXT,

    CONSTRAINT "AllPackagesByItem_pkey" PRIMARY KEY ("productInventoryRecordId18")
);

-- CreateTable
CREATE TABLE "AllProductPackageDestinations" (
    "productPackageName" TEXT NOT NULL,
    "productPackageId18" TEXT NOT NULL,
    "householdName" TEXT NOT NULL,
    "pantryVisitId18" TEXT NOT NULL DEFAULT '##################',
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllProductPackageDestinations_pkey" PRIMARY KEY ("pantryVisitId18")
);

-- CreateIndex
CREATE INDEX "AllPackagesByItem_productInventoryRecordId18_idx" ON "AllPackagesByItem"("productInventoryRecordId18");

-- CreateIndex
CREATE INDEX "AllPackagesByItem_productPackageId18_idx" ON "AllPackagesByItem"("productPackageId18");

-- CreateIndex
CREATE UNIQUE INDEX "AllProductPackageDestinations_productPackageId18_key" ON "AllProductPackageDestinations"("productPackageId18");
