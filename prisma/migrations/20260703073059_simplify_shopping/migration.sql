/*
  Warnings:

  - You are about to drop the column `marketName` on the `Shopping` table. All the data in the column will be lost.
  - You are about to drop the column `receiptImage` on the `Shopping` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `Shopping` table. All the data in the column will be lost.
  - You are about to drop the `ShoppingItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ShoppingItem" DROP CONSTRAINT "ShoppingItem_shoppingId_fkey";

-- AlterTable
ALTER TABLE "Shopping" DROP COLUMN "marketName",
DROP COLUMN "receiptImage",
DROP COLUMN "remarks",
ADD COLUMN     "details" TEXT;

-- DropTable
DROP TABLE "ShoppingItem";
