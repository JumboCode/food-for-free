-- DropForeignKey
ALTER TABLE "public"."PackagesByItem" DROP CONSTRAINT "PackagesByItem_productInventoryRecordId18_fkey";

-- DropForeignKey
ALTER TABLE "public"."PackagesByItem" DROP CONSTRAINT "PackagesByItem_productPackageId18_fkey";

-- AlterTable
ALTER TABLE "PackagesByItem" ALTER COLUMN "productInventoryRecordId18" DROP NOT NULL,
ALTER COLUMN "productPackageId18" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "PackagesByItem_productInventoryRecordId18_idx" ON "PackagesByItem"("productInventoryRecordId18");

-- CreateIndex
CREATE INDEX "PackagesByItem_productPackageId18_idx" ON "PackagesByItem"("productPackageId18");
