-- AlterTable
ALTER TABLE "InventoryRecord" ADD COLUMN     "uploadedSheetId" TEXT;

-- CreateTable
CREATE TABLE "UploadedSheet" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedSheet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventoryRecord" ADD CONSTRAINT "InventoryRecord_uploadedSheetId_fkey" FOREIGN KEY ("uploadedSheetId") REFERENCES "UploadedSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
