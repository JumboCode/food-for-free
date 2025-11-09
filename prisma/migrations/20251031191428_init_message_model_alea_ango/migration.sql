/*
  Warnings:

  - You are about to drop the `ChangeMe` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."ChangeMe";

-- CreateTable
CREATE TABLE "AleaAngoMessage" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AleaAngoMessage_pkey" PRIMARY KEY ("id")
);
