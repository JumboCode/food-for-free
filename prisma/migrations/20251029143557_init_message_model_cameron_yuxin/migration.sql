-- CreateTable
CREATE TABLE "CameronYuxinMessage" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CameronYuxinMessage_pkey" PRIMARY KEY ("id")
);
