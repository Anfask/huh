-- CreateEnum
CREATE TYPE "BehaviorType" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateTable
CREATE TABLE "Behavior" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "point" INTEGER NOT NULL,
    "isNegative" BOOLEAN NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Behavior_pkey" PRIMARY KEY ("id")
);
