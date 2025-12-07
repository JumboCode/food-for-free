-- CreateTable
CREATE TABLE "InventoryRecord" (
    "id" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "inventoryType" TEXT,
    "amount" INTEGER,
    "units" TEXT,
    "weightLbs" DOUBLE PRECISION,
    "source" TEXT,
    "destination" TEXT,
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryRecord_pkey" PRIMARY KEY ("id")
);
