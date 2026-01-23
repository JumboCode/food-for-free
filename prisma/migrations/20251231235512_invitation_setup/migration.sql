/*
  Warnings:

  - A unique constraint covering the columns `[clerkOrganizationId]` on the table `Partner` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clerkOrganizationId` to the `Partner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "clerkOrganizationId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Partner_clerkOrganizationId_key" ON "Partner"("clerkOrganizationId");
