"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const MAIN_CATEGORY_NAME = "Main"

export async function calculateMonthlySummaryAction(sheetId: string) {
  try {
    const session = await requireAuth()

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: sheetId },
    })
    if (!sheet) return { error: "Sheet not found" }

    const activeMembers = await prisma.member.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    })

    const mealEntryItems = await prisma.mealEntryItem.findMany({
      where: { monthlySheetId: sheetId },
    })
    const totalMemberMeals = mealEntryItems.reduce((sum, item) => sum + item.count, 0)

    const guestMeals = await prisma.guestMeal.findMany({
      where: { monthlySheetId: sheetId },
    })
    const totalGuestMeals = guestMeals.reduce((sum, g) => sum + g.mealCount, 0)

    const totalMeals = totalMemberMeals + totalGuestMeals

    const expenses = await prisma.expense.findMany({
      where: { monthlySheetId: sheetId },
      include: { category: true },
    })
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    const mealRate = totalMeals > 0 ? Math.round((totalExpenses / totalMeals) * 100) / 100 : 0

    const mainCategory = await prisma.expenseCategory.findFirst({
      where: { name: MAIN_CATEGORY_NAME },
    })

    const extraExpenses = mainCategory
      ? expenses.filter((e) => e.categoryId !== mainCategory.id).reduce((sum, e) => sum + e.amount, 0)
      : 0

    const extraCostPerMember = activeMembers.length > 0
      ? Math.round((extraExpenses / activeMembers.length) * 100) / 100
      : 0

    const extraCostEntries = await prisma.extraCost.findMany({
      where: { monthlySheetId: sheetId },
    })
    const totalExtraCostEntries = extraCostEntries.reduce((sum, e) => sum + e.totalCost, 0)
    const extraCostPerMemberFromEntries = activeMembers.length > 0
      ? Math.round((totalExtraCostEntries / activeMembers.length) * 100) / 100
      : 0

    const openingBalances = await prisma.openingBalance.findMany({
      where: { monthlySheetId: sheetId },
    })

    const fundTxns = await prisma.fundTransaction.findMany({
      where: { monthlySheetId: sheetId },
    })

    const totalOpening = openingBalances.reduce((sum, ob) => sum + ob.amount, 0)
    const totalFunds = fundTxns.reduce((sum, f) => sum + f.amount, 0)

    const combinedExtraCostPerMember = Math.round((extraCostPerMember + extraCostPerMemberFromEntries) * 100) / 100

    const memberResults = activeMembers.map((member) => {
      const memberItems = mealEntryItems.filter((i) => i.memberId === member.id)
      const memberMeals = memberItems.reduce((sum, i) => sum + i.count, 0)

      const mealCost = Math.round(memberMeals * mealRate * 100) / 100

      const openingBalance = openingBalances.find((ob) => ob.memberId === member.id)?.amount || 0

      const deposits = fundTxns
        .filter((f) => f.memberId === member.id)
        .reduce((sum, f) => sum + f.amount, 0)

      const totalCost = Math.round((mealCost + combinedExtraCostPerMember) * 100) / 100

      const balance = Math.round((openingBalance + deposits - totalCost) * 100) / 100

      return {
        memberId: member.id,
        memberName: member.name,
        openingBalance,
        totalMeals: memberMeals,
        mealCost,
        extraCost: extraCostPerMember,
        extraCostEntries: extraCostPerMemberFromEntries,
        totalCost,
        deposits,
        balance,
        mealRate,
      }
    })

    const result = {
      totalMeals: Math.round(totalMeals * 100) / 100,
      guestMeals: Math.round(totalGuestMeals * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalFunds: Math.round(totalFunds * 100) / 100,
      totalOpening: Math.round(totalOpening * 100) / 100,
      mealRate,
      extraExpenses: Math.round(extraExpenses * 100) / 100,
      extraCostPerMember,
      extraCostFromEntries: Math.round(totalExtraCostEntries * 100) / 100,
      extraCostPerMemberFromEntries,
      members: memberResults,
    }

    revalidatePath("/sheets")
    return { success: true, summary: result }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to calculate summary" }
  }
}

export async function getDashboardStatsAction(sheetId?: string) {
  try {
    const session = await requireAuth()
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    let sheet
    if (sheetId) {
      sheet = await prisma.monthlySheet.findUnique({ where: { id: sheetId } })
    } else {
      sheet = await prisma.monthlySheet.findUnique({
        where: { month_year: { month, year } },
      })
    }

    if (!sheet) {
      return {
        stats: {
          currentMonth: `${year}-${String(month).padStart(2, "0")}`,
          currentMonthLabel: "",
          sheetId: "",
          mealRate: 0,
          mealRateWithDefaults: 0,
          totalMeals: 0,
          totalDefaultMeals: 0,
          totalMealsWithDefaults: 0,
          totalExpenses: 0,
          totalFunds: 0,
          totalOpening: 0,
          activeMembers: 0,
          guestMeals: 0,
          outstandingBalance: 0,
          expenseByCategory: {},
          sheets: [],
          members: [],
        },
      }
    }

    const activeMembers = await prisma.member.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    })

    const mealEntryItems = await prisma.mealEntryItem.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const totalMemberMeals = mealEntryItems.reduce((sum, item) => sum + item.count, 0)

    const guestMeals = await prisma.guestMeal.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const totalGuestMeals = guestMeals.reduce((sum, g) => sum + g.mealCount, 0)

    const totalMeals = totalMemberMeals + totalGuestMeals

    const expenses = await prisma.expense.findMany({
      where: { monthlySheetId: sheet.id },
      include: { category: true },
    })
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    const defaultMeals = await prisma.defaultMealEntry.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const totalDefaultMeals = defaultMeals.reduce((sum, d) => sum + d.count, 0)
    const totalMealsWithDefaults = totalMeals + totalDefaultMeals

    const mealRate = totalMeals > 0 ? Math.round((totalExpenses / totalMeals) * 100) / 100 : 0
    const mealRateWithDefaults = totalMealsWithDefaults > 0 ? Math.round((totalExpenses / totalMealsWithDefaults) * 100) / 100 : 0

    const funds = await prisma.fundTransaction.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const totalFunds = funds.reduce((sum, f) => sum + f.amount, 0)

    const openingBalances = await prisma.openingBalance.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const totalOpening = openingBalances.reduce((sum, ob) => sum + ob.amount, 0)

    const mainCategory = await prisma.expenseCategory.findFirst({
      where: { name: MAIN_CATEGORY_NAME },
    })
    const extraExpenses = mainCategory
      ? expenses.filter((e) => e.categoryId !== mainCategory!.id).reduce((sum, e) => sum + e.amount, 0)
      : 0
    const extraCostPerMember = activeMembers.length > 0
      ? Math.round((extraExpenses / activeMembers.length) * 100) / 100
      : 0

    const extraCostEntries = await prisma.extraCost.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const totalExtraCostEntries = extraCostEntries.reduce((sum, e) => sum + e.totalCost, 0)
    const extraCostPerMemberFromEntries = activeMembers.length > 0
      ? Math.round((totalExtraCostEntries / activeMembers.length) * 100) / 100
      : 0

    const expenseByCategory: Record<string, number> = {}
    for (const e of expenses) {
      const catName = e.category?.name || "Other"
      expenseByCategory[catName] = (expenseByCategory[catName] || 0) + e.amount
    }

    const combinedExtraCostPerMember = Math.round((extraCostPerMember + extraCostPerMemberFromEntries) * 100) / 100

    const memberResults = activeMembers.map((member) => {
      const memberItems = mealEntryItems.filter((i) => i.memberId === member.id)
      const memberMeals = memberItems.reduce((sum, i) => sum + i.count, 0)
      const mealCost = Math.round(memberMeals * mealRate * 100) / 100
      const openingBalance = openingBalances.find((ob) => ob.memberId === member.id)?.amount || 0
      const deposits = funds.filter((f) => f.memberId === member.id).reduce((sum, f) => sum + f.amount, 0)
      const totalCost = Math.round((mealCost + combinedExtraCostPerMember) * 100) / 100
      const balance = Math.round((openingBalance + deposits - totalCost) * 100) / 100

      return {
        memberId: member.id,
        memberName: member.name,
        openingBalance,
        totalMeals: memberMeals,
        mealCost,
        extraCost: extraCostPerMember,
        extraCostEntries: extraCostPerMemberFromEntries,
        totalCost,
        deposits,
        balance,
        mealRate,
      }
    })

    const outstandingBalance = Math.round((totalOpening + totalFunds - totalExpenses - totalExtraCostEntries) * 100) / 100

    const stats = {
      currentMonth: sheet.id,
      currentMonthLabel: sheet.label,
      sheetId: sheet.id,
      locked: sheet.locked,
      mealRate,
      mealRateWithDefaults,
      totalMeals,
      totalDefaultMeals,
      totalMealsWithDefaults,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalFunds: Math.round(totalFunds * 100) / 100,
      totalOpening: Math.round(totalOpening * 100) / 100,
      activeMembers: activeMembers.length,
      guestMeals: totalGuestMeals,
      outstandingBalance,
      extraCostPerMember,
      extraCostFromEntries: Math.round(totalExtraCostEntries * 100) / 100,
      extraCostPerMemberFromEntries,
      expenseByCategory: {} as Record<string, number>,
      members: memberResults,
      sheets: [] as Array<{ id: string; label: string; month: number; year: number }>,
    }

    const allSheets = await prisma.monthlySheet.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { id: true, label: true, month: true, year: true },
    })
    stats.sheets = allSheets
    stats.expenseByCategory = expenseByCategory

    return { stats }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch dashboard stats" }
  }
}
