-- AlterTable
ALTER TABLE "FundTransaction" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Deposit';

-- CreateTable
CREATE TABLE "Shopping" (
    "id" TEXT NOT NULL,
    "monthlySheetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchasedById" TEXT NOT NULL,
    "marketName" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "receiptImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shopping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingItem" (
    "id" TEXT NOT NULL,
    "shoppingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "unitPrice" DOUBLE PRECISION,

    CONSTRAINT "ShoppingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyNote" (
    "id" TEXT NOT NULL,
    "monthlySheetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarryForwardHistory" (
    "id" TEXT NOT NULL,
    "fromSheetId" TEXT NOT NULL,
    "toSheetId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "importedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarryForwardHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyNote_monthlySheetId_date_key" ON "DailyNote"("monthlySheetId", "date");

-- AddForeignKey
ALTER TABLE "Shopping" ADD CONSTRAINT "Shopping_monthlySheetId_fkey" FOREIGN KEY ("monthlySheetId") REFERENCES "MonthlySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shopping" ADD CONSTRAINT "Shopping_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_shoppingId_fkey" FOREIGN KEY ("shoppingId") REFERENCES "Shopping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyNote" ADD CONSTRAINT "DailyNote_monthlySheetId_fkey" FOREIGN KEY ("monthlySheetId") REFERENCES "MonthlySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarryForwardHistory" ADD CONSTRAINT "CarryForwardHistory_fromSheetId_fkey" FOREIGN KEY ("fromSheetId") REFERENCES "MonthlySheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarryForwardHistory" ADD CONSTRAINT "CarryForwardHistory_toSheetId_fkey" FOREIGN KEY ("toSheetId") REFERENCES "MonthlySheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarryForwardHistory" ADD CONSTRAINT "CarryForwardHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
