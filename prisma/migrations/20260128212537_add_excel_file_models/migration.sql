-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" SERIAL NOT NULL,
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

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagesByItem" (
    "id" SERIAL NOT NULL,
    "productPackageName" TEXT,
    "pantryProductName" TEXT,
    "lotSourceAccountName" TEXT,
    "lotFoodRescueProgram" TEXT,
    "distributionAmount" INTEGER,
    "pantryProductWeightLbs" DOUBLE PRECISION,
    "distributionCost" DOUBLE PRECISION,
    "productInventoryRecordId18" TEXT NOT NULL,
    "productPackageId18" TEXT NOT NULL,

    CONSTRAINT "PackagesByItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPackageDestination" (
    "id" SERIAL NOT NULL,
    "productPackageName" TEXT NOT NULL,
    "productPackageId18" TEXT NOT NULL,
    "householdName" TEXT NOT NULL,
    "householdId18" TEXT NOT NULL,

    CONSTRAINT "ProductPackageDestination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_productInventoryRecordId18_key" ON "InventoryTransaction"("productInventoryRecordId18");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPackageDestination_productPackageId18_key" ON "ProductPackageDestination"("productPackageId18");

-- AddForeignKey
ALTER TABLE "PackagesByItem" ADD CONSTRAINT "PackagesByItem_productInventoryRecordId18_fkey" FOREIGN KEY ("productInventoryRecordId18") REFERENCES "InventoryTransaction"("productInventoryRecordId18") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagesByItem" ADD CONSTRAINT "PackagesByItem_productPackageId18_fkey" FOREIGN KEY ("productPackageId18") REFERENCES "ProductPackageDestination"("productPackageId18") ON DELETE RESTRICT ON UPDATE CASCADE;
