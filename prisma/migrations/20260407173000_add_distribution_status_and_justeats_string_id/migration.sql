-- Add Salesforce distribution status (store as freeform string).
ALTER TABLE "AllProductPackageDestinations"
ADD COLUMN "distributionStatus" TEXT;

-- Switch JustEatsBoxes primary key to use the external distribution id.
ALTER TABLE "JustEatsBoxes" ADD COLUMN "distributionId18" TEXT;

UPDATE "JustEatsBoxes"
SET "distributionId18" = "packageDistributionRecordId";

ALTER TABLE "JustEatsBoxes"
ALTER COLUMN "distributionId18" SET NOT NULL;

ALTER TABLE "JustEatsBoxes"
DROP CONSTRAINT "JustEatsBoxes_pkey";

ALTER TABLE "JustEatsBoxes"
DROP COLUMN "id";

ALTER TABLE "JustEatsBoxes"
ADD CONSTRAINT "JustEatsBoxes_pkey" PRIMARY KEY ("distributionId18");
