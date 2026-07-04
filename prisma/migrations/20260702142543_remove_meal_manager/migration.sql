/*
  Warnings:

  - You are about to drop the column `mealManagerId` on the `MonthlySheet` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "MonthlySheet" DROP CONSTRAINT "MonthlySheet_mealManagerId_fkey";

-- AlterTable
ALTER TABLE "MonthlySheet" DROP COLUMN "mealManagerId";
