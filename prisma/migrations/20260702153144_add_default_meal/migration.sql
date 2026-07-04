-- CreateTable
CREATE TABLE "DefaultMealEntry" (
    "id" TEXT NOT NULL,
    "monthlySheetId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "count" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefaultMealEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DefaultMealEntry_monthlySheetId_memberId_key" ON "DefaultMealEntry"("monthlySheetId", "memberId");

-- AddForeignKey
ALTER TABLE "DefaultMealEntry" ADD CONSTRAINT "DefaultMealEntry_monthlySheetId_fkey" FOREIGN KEY ("monthlySheetId") REFERENCES "MonthlySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultMealEntry" ADD CONSTRAINT "DefaultMealEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
