"use server"

import { prisma, shouldCountDefaultMeals } from "@/lib/db"

const MAIN_CATEGORY_NAME = "Main"

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

function dateToKey(date: Date | string): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export async function getPublicDashboardAction() {
  try {
    const sheet = await prisma.monthlySheet.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })

    if (!sheet) {
      return { stats: null, grid: null, shopping: null, extraCosts: null, funds: null }
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

    const countDefaults = await shouldCountDefaultMeals()
    const calcDefaultMeals = countDefaults
      ? await prisma.defaultMealEntry.findMany({ where: { monthlySheetId: sheet.id } })
      : []
    const totalDefaultMeals = calcDefaultMeals.reduce((sum, d) => sum + d.count, 0)
    const adjustedTotalMeals = totalMeals + totalDefaultMeals

    const expenses = await prisma.expense.findMany({
      where: { monthlySheetId: sheet.id },
      include: { category: true },
    })

    const mainCategory = await prisma.expenseCategory.findFirst({
      where: { name: MAIN_CATEGORY_NAME },
    })

    const mainExpenses = mainCategory
      ? expenses.filter((e) => e.categoryId === mainCategory.id).reduce((sum, e) => sum + e.amount, 0)
      : 0

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    const mealRate = adjustedTotalMeals > 0 ? Math.round((mainExpenses / adjustedTotalMeals) * 100) / 100 : 0

    const fundTxns = await prisma.fundTransaction.findMany({
      where: { monthlySheetId: sheet.id },
      include: { member: true },
      orderBy: { date: "desc" },
    })
    const totalFunds = fundTxns.reduce((sum, f) => sum + f.amount, 0)

    const openingBalances = await prisma.openingBalance.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const totalOpening = openingBalances.reduce((sum, ob) => sum + ob.amount, 0)

    const extraExpenses = mainCategory
      ? expenses.filter((e) => e.categoryId !== mainCategory.id).reduce((sum, e) => sum + e.amount, 0)
      : 0
    const extraCostPerMember = activeMembers.length > 0
      ? Math.round((extraExpenses / activeMembers.length) * 100) / 100
      : 0

    const extraCostEntries = await prisma.extraCost.findMany({
      where: { monthlySheetId: sheet.id },
      orderBy: { date: "desc" },
    })
    const totalExtraCostEntries = extraCostEntries.reduce((sum, e) => sum + e.totalCost, 0)
    const extraCostPerMemberFromEntries = activeMembers.length > 0
      ? Math.round((totalExtraCostEntries / activeMembers.length) * 100) / 100
      : 0
    const combinedExtraCostPerMember = Math.round((extraCostPerMember + extraCostPerMemberFromEntries) * 100) / 100

    const totalAllCosts = totalExpenses + totalExtraCostEntries

    const expenseByCategory: Record<string, number> = {}
    for (const e of expenses) {
      const catName = e.category?.name || "Other"
      expenseByCategory[catName] = (expenseByCategory[catName] || 0) + e.amount
    }

    const calcDefaultMap = new Map(calcDefaultMeals.map((d: { memberId: string; count: number }) => [d.memberId, d.count]))

    const memberResults = activeMembers.map((member) => {
      const memberItems = mealEntryItems.filter((i) => i.memberId === member.id)
      const memberMeals = memberItems.reduce((sum, i) => sum + i.count, 0)
      const memberDefaults = calcDefaultMap.get(member.id) || 0
      const adjustedMemberMeals = memberMeals + memberDefaults
      const mealCost = Math.round(adjustedMemberMeals * mealRate * 100) / 100
      const openingBalance = openingBalances.find((ob) => ob.memberId === member.id)?.amount || 0
      const deposits = fundTxns.filter((f) => f.memberId === member.id).reduce((sum, f) => sum + f.amount, 0)
      const totalCost = Math.round((mealCost + combinedExtraCostPerMember) * 100) / 100
      const balance = Math.round((openingBalance + deposits - totalCost) * 100) / 100

      return {
        memberId: member.id,
        memberName: member.name,
        openingBalance,
        totalMeals: adjustedMemberMeals,
        mealCost,
        extraCost: extraCostPerMember,
        extraCostEntries: extraCostPerMemberFromEntries,
        totalCost,
        deposits,
        balance,
        mealRate,
      }
    })

    const outstandingBalance = Math.round((totalOpening + totalFunds - totalAllCosts) * 100) / 100

    // --- Meal Grid ---
    const days = getDaysInMonth(sheet.month, sheet.year)
    const entries = await prisma.mealEntry.findMany({
      where: { monthlySheetId: sheet.id },
      include: { items: true },
      orderBy: { date: "asc" },
    })

    const defaultMeals = await prisma.defaultMealEntry.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const defaultMap = new Map(defaultMeals.map((d: { memberId: string; count: number }) => [d.memberId, d.count]))

    const entryMap = new Map<string, typeof entries[0]>()
    for (const entry of entries) {
      entryMap.set(dateToKey(entry.date), entry)
    }

    interface GridItem {
      date: string
      day: number
      dayName: string
      items: Record<string, number | null>
      total: number
    }

    const grid: GridItem[] = []
    for (let day = 1; day <= days; day++) {
      const date = new Date(sheet.year, sheet.month - 1, day)
      const key = dateToKey(date)
      const entry = entryMap.get(key)

      const items: Record<string, number | null> = {}
      let total = 0

      for (const member of activeMembers) {
        const entryItems = entry?.items ?? []
        const item = entryItems.find((i: { memberId: string; count: number }) => i.memberId === member.id)
        const count = item ? item.count : null
        items[member.id] = count
        total += count ?? 0
      }

      grid.push({
        date: date.toISOString(),
        day,
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        items,
        total,
      })
    }

    // --- Shopping / Bazar ---
    const shopping = await prisma.shopping.findMany({
      where: { monthlySheetId: sheet.id },
      include: { purchasedBy: true },
      orderBy: { date: "desc" },
    })

    return {
      stats: {
        currentMonthLabel: sheet.label,
        sheetId: sheet.id,
        mealRate,
        totalMeals,
        totalBazar: Math.round(mainExpenses * 100) / 100,
        totalExpenses: Math.round(totalAllCosts * 100) / 100,
        totalFunds: Math.round(totalFunds * 100) / 100,
        totalOpening: Math.round(totalOpening * 100) / 100,
        activeMembers: activeMembers.length,
        guestMeals: totalGuestMeals,
        outstandingBalance,
        extraCostPerMember,
        expenseByCategory,
        members: memberResults,
      },
      grid,
      members: activeMembers.map((m) => ({ id: m.id, name: m.name })),
      defaultMeals: Object.fromEntries(defaultMap),
      shopping,
      extraCosts: extraCostEntries,
      funds: fundTxns,
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

    const allMealItems = await prisma.mealEntryItem.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const totalAllMemberMeals = allMealItems.reduce((sum, item) => sum + item.count, 0)

    const memberMealItems = allMealItems.filter((i) => i.memberId === memberId)
    const totalMemberMeals = memberMealItems.reduce((sum, item) => sum + item.count, 0)

    const guestMeals = await prisma.guestMeal.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const totalGuestMeals = guestMeals.reduce((sum, g) => sum + g.mealCount, 0)

    const countDefaults = await shouldCountDefaultMeals()
    const memberDefaultEntry = countDefaults
      ? await prisma.defaultMealEntry.findUnique({
          where: { monthlySheetId_memberId: { monthlySheetId: sheet.id, memberId } },
        })
      : null
    const memberDefaultMeals = memberDefaultEntry?.count || 0

    const allDefaultEntries = countDefaults
      ? await prisma.defaultMealEntry.findMany({ where: { monthlySheetId: sheet.id } })
      : []
    const totalDefaultMeals = allDefaultEntries.reduce((sum, d) => sum + d.count, 0)

    const totalMeals = totalMemberMeals + totalGuestMeals
    const adjustedTotalMeals = totalMeals + memberDefaultMeals

    const allTotalMeals = totalAllMemberMeals + totalGuestMeals + totalDefaultMeals

    const expenses = await prisma.expense.findMany({
      where: { monthlySheetId: sheet.id },
      include: { category: true },
    })

    const mainCategory = await prisma.expenseCategory.findFirst({
      where: { name: MAIN_CATEGORY_NAME },
    })

    const mainExpenses = mainCategory
      ? expenses.filter((e) => e.categoryId === mainCategory.id).reduce((sum, e) => sum + e.amount, 0)
      : 0

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const mealRate = allTotalMeals > 0 ? Math.round((mainExpenses / allTotalMeals) * 100) / 100 : 0

    const funds = await prisma.fundTransaction.findMany({
      where: { monthlySheetId: sheet.id, memberId },
    })
    const totalFunds = funds.reduce((sum, f) => sum + f.amount, 0)

    const openingBalances = await prisma.openingBalance.findMany({
      where: { monthlySheetId: sheet.id },
    })
    const openingBalance = openingBalances.find((ob) => ob.memberId === memberId)?.amount || 0
    const totalOpening = openingBalances.reduce((sum, ob) => sum + ob.amount, 0)

    const extraExpenses = mainCategory
      ? expenses.filter((e) => e.categoryId !== mainCategory.id).reduce((sum, e) => sum + e.amount, 0)
      : 0
    const activeMembers = await prisma.member.count({ where: { active: true } })
    const extraCostPerMember = activeMembers > 0
      ? Math.round((extraExpenses / activeMembers) * 100) / 100
      : 0

    const extraCostEntries = await prisma.extraCost.findMany({
      where: { monthlySheetId: sheet.id },
      orderBy: { date: "desc" },
    })
    const totalExtraCostEntries = extraCostEntries.reduce((sum, e) => sum + e.totalCost, 0)
    const extraCostPerMemberFromEntries = activeMembers > 0
      ? Math.round((totalExtraCostEntries / activeMembers) * 100) / 100
      : 0
    const combinedExtraCostPerMember = Math.round((extraCostPerMember + extraCostPerMemberFromEntries) * 100) / 100

    const mealCost = Math.round(adjustedTotalMeals * mealRate * 100) / 100
    const totalCost = Math.round((mealCost + combinedExtraCostPerMember) * 100) / 100
    const balance = Math.round((openingBalance + totalFunds - totalCost) * 100) / 100

    const expenseByCategory: Record<string, number> = {}
    for (const e of expenses) {
      const catName = e.category?.name || "Other"
      expenseByCategory[catName] = (expenseByCategory[catName] || 0) + e.amount
    }

    const allFunds = await prisma.fundTransaction.findMany({ where: { monthlySheetId: sheet.id } })
    const totalAllFunds = allFunds.reduce((s, f) => s + f.amount, 0)
    const totalBazar = mainExpenses > 0 ? Math.round(mainExpenses * 100) / 100 : 0
    const outstandingBalance = Math.round((totalOpening + totalAllFunds - totalExpenses - totalExtraCostEntries) * 100) / 100

    const shopping = await prisma.shopping.findMany({
      where: { monthlySheetId: sheet.id },
      include: { purchasedBy: true },
      orderBy: { date: "desc" },
    })

    return {
      stats: {
        currentMonthLabel: sheet.label,
        sheetId: sheet.id,
        memberId: member.id,
        memberName: member.name,
        mealRate,
        totalMeals: adjustedTotalMeals,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalFunds: Math.round(totalFunds * 100) / 100,
        totalBazar,
        totalOpening: Math.round(totalOpening * 100) / 100,
        totalAllFunds: Math.round(totalAllFunds * 100) / 100,
        totalExtraCostEntries: Math.round(totalExtraCostEntries * 100) / 100,
        openingBalance,
        activeMembers,
        guestMeals: totalGuestMeals,
        outstandingBalance,
        extraCostPerMember,
        combinedExtraCostPerMember,
        expenseByCategory,
        mealCost,
        totalCost,
        balance,
        deposits: totalFunds,
      },
      shopping,
      extraCostEntries,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch member dashboard data" }
  }
}
