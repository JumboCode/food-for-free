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
