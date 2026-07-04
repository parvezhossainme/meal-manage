-- CreateTable
CREATE TABLE "ExtraCost" (
    "id" TEXT NOT NULL,
    "monthlySheetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtraCost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExtraCost" ADD CONSTRAINT "ExtraCost_monthlySheetId_fkey" FOREIGN KEY ("monthlySheetId") REFERENCES "MonthlySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
