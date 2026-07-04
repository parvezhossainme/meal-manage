-- AlterTable
ALTER TABLE "MonthlySheet" ADD COLUMN     "mealManagerId" TEXT;

-- AddForeignKey
ALTER TABLE "MonthlySheet" ADD CONSTRAINT "MonthlySheet_mealManagerId_fkey" FOREIGN KEY ("mealManagerId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
