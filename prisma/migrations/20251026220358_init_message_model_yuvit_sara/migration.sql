/*
  Warnings:

  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."Message";

-- CreateTable
CREATE TABLE "YOUR_MESSAGE_NAME" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YOUR_MESSAGE_NAME_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YuvitSaraMessage" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YuvitSaraMessage_pkey" PRIMARY KEY ("id")
);
