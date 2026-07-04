"use server"

import { prisma } from "@/lib/db"

const MAIN_CATEGORY_NAME = "Main"

export async function getPublicDashboardAction() {
  try {
    const sheet = await prisma.monthlySheet.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })

    if (!sheet) {
      return { stats: null }
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

    const mealRate = totalMeals > 0 ? Math.round((totalExpenses / totalMeals) * 100) / 100 : 0

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
      ? expenses.filter((e) => e.categoryId !== mainCategory.id).reduce((sum, e) => sum + e.amount, 0)
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
    const combinedExtraCostPerMember = Math.round((extraCostPerMember + extraCostPerMemberFromEntries) * 100) / 100

    const expenseByCategory: Record<string, number> = {}
    for (const e of expenses) {
      const catName = e.category?.name || "Other"
      expenseByCategory[catName] = (expenseByCategory[catName] || 0) + e.amount
    }

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

    return {
      stats: {
        currentMonthLabel: sheet.label,
        sheetId: sheet.id,
        mealRate,
        totalMeals,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalFunds: Math.round(totalFunds * 100) / 100,
        totalOpening: Math.round(totalOpening * 100) / 100,
        activeMembers: activeMembers.length,
        guestMeals: totalGuestMeals,
        outstandingBalance,
        extraCostPerMember,
        expenseByCategory,
        members: memberResults,
      },
    }
    } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch dashboard data" }
  }
}

export async function getMemberDashboardAction(memberId: string, sheetId?: string) {
  try {
    const sheet = sheetId
      ? await prisma.monthlySheet.findUnique({ where: { id: sheetId } })
      : await prisma.monthlySheet.findFirst({
          orderBy: [{ year: "desc" }, { month: "desc" }],
        })

    if (!sheet) {
      return { stats: null }
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } })
    if (!member) return { error: "Member not found" }

    const memberMealItems = await prisma.mealEntryItem.findMany({
      where: { monthlySheetId: sheet.id, memberId },
    })
    const totalMemberMeals = memberMealItems.reduce((sum, item) => sum + item.count, 0)

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
    const mealRate = totalMeals > 0 ? Math.round((totalExpenses / totalMeals) * 100) / 100 : 0

    const funds = await prisma.fundTransaction.findMany({
      where: { monthlySheetId: sheet.id, memberId },
    })
    const totalFunds = funds.reduce((sum, f) => sum + f.amount, 0)

    const openingBalances = await prisma.openingBalance.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const openingBalance = openingBalances.find((ob) => ob.memberId === memberId)?.amount || 0
    const totalOpening = openingBalances.reduce((sum, ob) => sum + ob.amount, 0)

    const mainCategory = await prisma.expenseCategory.findFirst({
      where: { name: MAIN_CATEGORY_NAME },
    })
    const extraExpenses = mainCategory
      ? expenses.filter((e) => e.categoryId !== mainCategory.id).reduce((sum, e) => sum + e.amount, 0)
      : 0
    const activeMembers = await prisma.member.count({ where: { active: true } })
    const extraCostPerMember = activeMembers > 0
      ? Math.round((extraExpenses / activeMembers) * 100) / 100
      : 0

    const extraCostEntries = await prisma.extraCost.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const totalExtraCostEntries = extraCostEntries.reduce((sum, e) => sum + e.totalCost, 0)
    const extraCostPerMemberFromEntries = activeMembers > 0
      ? Math.round((totalExtraCostEntries / activeMembers) * 100) / 100
      : 0
    const combinedExtraCostPerMember = Math.round((extraCostPerMember + extraCostPerMemberFromEntries) * 100) / 100

    const mealCost = Math.round(totalMemberMeals * mealRate * 100) / 100
    const totalCost = Math.round((mealCost + combinedExtraCostPerMember) * 100) / 100
    const balance = Math.round((openingBalance + totalFunds - totalCost) * 100) / 100

    const expenseByCategory: Record<string, number> = {}
    for (const e of expenses) {
      const catName = e.category?.name || "Other"
      expenseByCategory[catName] = (expenseByCategory[catName] || 0) + e.amount
    }

    const allFunds = await prisma.fundTransaction.findMany({ where: { monthlySheetId: sheet.id } })
    const totalAllFunds = allFunds.reduce((s, f) => s + f.amount, 0)
    const outstandingBalance = Math.round((totalOpening + totalAllFunds - totalExpenses - totalExtraCostEntries) * 100) / 100

    return {
      stats: {
        currentMonthLabel: sheet.label,
        sheetId: sheet.id,
        memberId: member.id,
        memberName: member.name,
        mealRate,
        totalMeals: totalMemberMeals,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalFunds: Math.round(totalFunds * 100) / 100,
        openingBalance,
        activeMembers,
        guestMeals: totalGuestMeals,
        outstandingBalance,
        extraCostPerMember,
        expenseByCategory,
        mealCost,
        totalCost,
        balance,
        deposits: totalFunds,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch member dashboard data" }
  }
}
