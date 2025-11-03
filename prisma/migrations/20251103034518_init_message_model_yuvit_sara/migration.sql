/*
  Warnings:

  - You are about to drop the `YOUR_MESSAGE_NAME` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `YuvitSaraMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."YOUR_MESSAGE_NAME";

-- DropTable
DROP TABLE "public"."YuvitSaraMessage";

-- CreateTable
CREATE TABLE "ChangeMe" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeMe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SophieJuliaMessage" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SophieJuliaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yuvitSaraMessage" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yuvitSaraMessage_pkey" PRIMARY KEY ("id")
);
