CREATE TABLE "JustEatsBoxes" (
    "id" SERIAL NOT NULL,
    "productPackageName" TEXT NOT NULL,
    "productPackageRecordId" TEXT NOT NULL,
    "numberPickedUp" DOUBLE PRECISION,
    "numberDistributed" DOUBLE PRECISION,
    "pounds" DOUBLE PRECISION,
    "poundsDroppedOff" DOUBLE PRECISION,
    "poundsLost" DOUBLE PRECISION,
    "packageDistributionRecordId" TEXT NOT NULL,
    "packageDistributionCreatedDate" TIMESTAMP(3) NOT NULL,
    "packageDistributionLastModifiedDate" TIMESTAMP(3) NOT NULL,
    "householdName" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "pantryVisitDateTime" TIMESTAMP(3) NOT NULL,
    "pantryVisitId" TEXT NOT NULL,
    "pantryVisitCreatedDate" TIMESTAMP(3) NOT NULL,
    "pantryVisitLastModifiedDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JustEatsBoxes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JustEatsBoxes_productPackageRecordId_idx" ON "JustEatsBoxes"("productPackageRecordId");
CREATE INDEX "JustEatsBoxes_packageDistributionRecordId_idx" ON "JustEatsBoxes"("packageDistributionRecordId");
CREATE INDEX "JustEatsBoxes_householdId_idx" ON "JustEatsBoxes"("householdId");
CREATE INDEX "JustEatsBoxes_pantryVisitId_idx" ON "JustEatsBoxes"("pantryVisitId");
