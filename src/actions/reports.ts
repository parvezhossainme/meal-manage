"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { getMonthName } from "@/lib/utils"

export async function getSheetsListAction() {
  try {
    await requireAuth()
    const sheets = await prisma.monthlySheet.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })
    return { sheets: sheets.map(s => ({ id: s.id, label: s.label, month: s.month, year: s.year, locked: s.locked })) }
  } catch (e) {
    return { error: "Failed to fetch sheets" }
  }
}

export async function getMembersListAction() {
  try {
    await requireAuth()
    const members = await prisma.member.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    })
    return { members: members.map(m => ({ id: m.id, name: m.name })) }
  } catch (e) {
    return { error: "Failed to fetch members" }
  }
}

export async function getExpenseCategoriesListAction() {
  try {
    await requireAuth()
    const categories = await prisma.expenseCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    })
    return { categories: categories.map(c => ({ id: c.id, name: c.name })) }
  } catch (e) {
    return { error: "Failed to fetch categories" }
  }
}

export async function getMemberStatementAction(memberId: string) {
  try {
    await requireAuth()

    const member = await prisma.member.findUnique({ where: { id: memberId } })
    if (!member) return { error: "Member not found" }

    const balances = await prisma.openingBalance.findMany({
      where: { memberId },
      include: { monthlySheet: true },
      orderBy: [{ monthlySheet: { year: "desc" } }, { monthlySheet: { month: "desc" } }],
    })

    const sheetIds = balances.map(b => b.monthlySheetId)
    if (sheetIds.length === 0) {
      return { member: { id: member.id, name: member.name }, statements: [] }
    }

    const [fundTxns, mealItems, allExpenses, allGuestMeals, allMealItems, allOpeningBalances] = await Promise.all([
      prisma.fundTransaction.findMany({ where: { memberId } }),
      prisma.mealEntryItem.findMany({ where: { memberId } }),
      prisma.expense.findMany({ where: { monthlySheetId: { in: sheetIds } } }),
      prisma.guestMeal.findMany({ where: { monthlySheetId: { in: sheetIds } } }),
      prisma.mealEntryItem.findMany({ where: { monthlySheetId: { in: sheetIds } } }),
      prisma.openingBalance.findMany({ where: { monthlySheetId: { in: sheetIds } } }),
    ])

    const fundMap = new Map<string, number>()
    for (const f of fundTxns) {
      fundMap.set(f.monthlySheetId, (fundMap.get(f.monthlySheetId) || 0) + f.amount)
    }

    const mealMap = new Map<string, number>()
    for (const m of mealItems) {
      if (m.monthlySheetId) mealMap.set(m.monthlySheetId, (mealMap.get(m.monthlySheetId) || 0) + m.count)
    }

    const expenseMap = new Map<string, number>()
    for (const e of allExpenses) {
      expenseMap.set(e.monthlySheetId, (expenseMap.get(e.monthlySheetId) || 0) + e.amount)
    }

    const guestMealMap = new Map<string, number>()
    for (const g of allGuestMeals) {
      guestMealMap.set(g.monthlySheetId, (guestMealMap.get(g.monthlySheetId) || 0) + g.mealCount)
    }

    const totalMealsMap = new Map<string, number>()
    for (const m of allMealItems) {
      if (m.monthlySheetId) totalMealsMap.set(m.monthlySheetId, (totalMealsMap.get(m.monthlySheetId) || 0) + m.count)
    }

    const memberCountMap = new Map<string, number>()
    for (const ob of allOpeningBalances) {
      memberCountMap.set(ob.monthlySheetId, (memberCountMap.get(ob.monthlySheetId) || 0) + 1)
    }

    const mainCategory = await prisma.expenseCategory.findFirst({ where: { name: "Main" } })

    const allExtraCostEntries = await prisma.extraCost.findMany({ where: { monthlySheetId: { in: sheetIds } } })
    const extraCostMap = new Map<string, number>()
    for (const e of allExtraCostEntries) {
      extraCostMap.set(e.monthlySheetId, (extraCostMap.get(e.monthlySheetId) || 0) + e.totalCost)
    }

    const statements = []
    for (const balance of balances) {
      const sheet = balance.monthlySheet
      const sid = sheet.id
      const totalExpenses = expenseMap.get(sid) || 0
      const totalGuestMeals = guestMealMap.get(sid) || 0
      const totalMemberMeals = totalMealsMap.get(sid) || 0
      const totalMeals = totalMemberMeals + totalGuestMeals
      const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0

      const memberMeals = mealMap.get(sid) || 0
      const mealCost = memberMeals * mealRate

      let extraExpenses = 0
      if (mainCategory) {
        extraExpenses = allExpenses.filter(e => e.monthlySheetId === sid && e.categoryId !== mainCategory.id).reduce((s, e) => s + e.amount, 0)
      }
      const memberCount = memberCountMap.get(sid) || 1
      const extraCostPerMember = extraExpenses / memberCount

      const totalExtraCostEntries = extraCostMap.get(sid) || 0
      const extraCostPerMemberFromEntries = memberCount > 0 ? totalExtraCostEntries / memberCount : 0

      const totalCost = mealCost + extraCostPerMember + extraCostPerMemberFromEntries
      const deposits = fundMap.get(sid) || 0
      const bal = balance.amount + deposits - totalCost

      statements.push({
        sheetId: sid,
        sheetLabel: sheet.label,
        month: sheet.month,
        year: sheet.year,
        locked: sheet.locked,
        openingBalance: balance.amount,
        totalMeals: memberMeals,
        mealCost: Math.round(mealCost * 100) / 100,
        extraCost: Math.round(extraCostPerMember * 100) / 100,
        extraCostEntries: Math.round(extraCostPerMemberFromEntries * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        deposits: Math.round(deposits * 100) / 100,
        balance: Math.round(bal * 100) / 100,
      })
    }

    return { member: { id: member.id, name: member.name }, statements }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch member statement" }
  }
}

export async function getFundLedgerAction(params: { sheetId?: string; memberId?: string }) {
  try {
    await requireAuth()

    const where: Record<string, unknown> = {}
    if (params.sheetId) where.monthlySheetId = params.sheetId
    if (params.memberId) where.memberId = params.memberId

    const funds = await prisma.fundTransaction.findMany({
      where,
      include: { member: true, monthlySheet: true },
      orderBy: { date: "desc" },
    })

    const total = funds.reduce((s, f) => s + f.amount, 0)

    return {
      funds: funds.map(f => ({
        id: f.id,
        date: f.date,
        amount: f.amount,
        memberName: f.member.name,
        sheetLabel: f.monthlySheet.label,
        paymentMethod: f.paymentMethod,
        reference: f.reference,
        remarks: f.remarks,
      })),
      total,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch fund ledger" }
  }
}

export async function getExpenseLedgerAction(params: { sheetId?: string; categoryId?: string }) {
  try {
    await requireAuth()

    const where: Record<string, unknown> = {}
    if (params.sheetId) where.monthlySheetId = params.sheetId
    if (params.categoryId) where.categoryId = params.categoryId

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true, paidBy: true, monthlySheet: true },
      orderBy: { date: "desc" },
    })

    const total = expenses.reduce((s, e) => s + e.amount, 0)

    return {
      expenses: expenses.map(e => ({
        id: e.id,
        date: e.date,
        title: e.title,
        amount: e.amount,
        categoryName: e.category.name,
        paidByName: e.paidBy?.name || null,
        sheetLabel: e.monthlySheet.label,
        vendor: e.vendor,
        remarks: e.remarks,
      })),
      total,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch expense ledger" }
  }
}

export async function getGuestReportAction(sheetId?: string) {
  try {
    await requireAuth()

    const where: Record<string, unknown> = {}
    if (sheetId) where.monthlySheetId = sheetId

    const guestMeals = await prisma.guestMeal.findMany({
      where,
      include: { monthlySheet: true },
      orderBy: { date: "desc" },
    })

    const totalMeals = guestMeals.reduce((s, g) => s + g.mealCount, 0)

    return {
      guestMeals: guestMeals.map(g => ({
        id: g.id,
        date: g.date,
        guestName: g.guestName,
        hostedBy: g.hostedBy,
        mealCount: g.mealCount,
        remarks: g.remarks,
        sheetLabel: g.monthlySheet.label,
      })),
      totalMeals,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch guest report" }
  }
}

export async function getCarryForwardAction(year?: number) {
  try {
    await requireAuth()

    const where: Record<string, unknown> = { carriedForward: true }
    if (year) {
      where.monthlySheet = { year }
    }

    const balances = await prisma.openingBalance.findMany({
      where,
      include: { member: true, monthlySheet: true },
      orderBy: [{ monthlySheet: { year: "desc" } }, { monthlySheet: { month: "desc" } }, { member: { name: "asc" } }],
    })

    const sourceSheetIds = [...new Set(balances.map(b => b.sourceSheetId).filter(Boolean) as string[])]
    const sourceSheets = sourceSheetIds.length > 0
      ? await prisma.monthlySheet.findMany({ where: { id: { in: sourceSheetIds } } })
      : []
    const sourceSheetMap = new Map(sourceSheets.map(s => [s.id, s.label]))

    return {
      balances: balances.map(b => ({
        id: b.id,
        memberName: b.member.name,
        amount: b.amount,
        sheetLabel: b.monthlySheet.label,
        sourceSheetLabel: b.sourceSheetId ? (sourceSheetMap.get(b.sourceSheetId) || "Unknown") : "N/A",
        createdAt: b.createdAt,
      })),
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch carry forward data" }
  }
}

export async function getYearlySummaryAction(year: number) {
  try {
    await requireAuth()

    const summaries = []
    let grandTotalMeals = 0
    let grandTotalGuestMeals = 0
    let grandTotalExpenses = 0
    let grandTotalFunds = 0

    for (let month = 1; month <= 12; month++) {
      const sheet = await prisma.monthlySheet.findUnique({
        where: { month_year: { month, year } },
      })

      if (!sheet) {
        summaries.push({
          month,
          monthLabel: getMonthName(month),
          sheetExists: false,
          totalMeals: 0,
          guestMeals: 0,
          totalExpenses: 0,
          mealRate: 0,
          totalFunds: 0,
          memberCount: 0,
        })
        continue
      }

      const [mealItems, guestMeals, expenses, fundTxns, openingBalances] = await Promise.all([
        prisma.mealEntryItem.findMany({ where: { monthlySheetId: sheet.id } }),
        prisma.guestMeal.findMany({ where: { monthlySheetId: sheet.id } }),
        prisma.expense.findMany({ where: { monthlySheetId: sheet.id } }),
        prisma.fundTransaction.findMany({ where: { monthlySheetId: sheet.id } }),
        prisma.openingBalance.findMany({ where: { monthlySheetId: sheet.id } }),
      ])

      const totalMemberMeals = (mealItems as Array<{ count: number }>).reduce((s, m) => s + m.count, 0)
      const totalGuestMeals = (guestMeals as Array<{ mealCount: number }>).reduce((s, g) => s + g.mealCount, 0)
      const totalMeals = totalMemberMeals + totalGuestMeals
      const totalExpenses = (expenses as Array<{ amount: number }>).reduce((s, e) => s + e.amount, 0)
      const totalFunds = (fundTxns as Array<{ amount: number }>).reduce((s, f) => s + f.amount, 0)
      const mealRate = totalMeals > 0 ? Math.round((totalExpenses / totalMeals) * 100) / 100 : 0

      grandTotalMeals += totalMeals
      grandTotalGuestMeals += totalGuestMeals
      grandTotalExpenses += totalExpenses
      grandTotalFunds += totalFunds

      summaries.push({
        month,
        monthLabel: getMonthName(month),
        sheetExists: true,
        sheetId: sheet.id,
        locked: sheet.locked,
        totalMeals: Math.round(totalMeals * 100) / 100,
        guestMeals: Math.round(totalGuestMeals * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        mealRate,
        totalFunds: Math.round(totalFunds * 100) / 100,
        memberCount: openingBalances.length,
      })
    }

    const overallMealRate = grandTotalMeals > 0 ? Math.round((grandTotalExpenses / grandTotalMeals) * 100) / 100 : 0

    return {
      summaries,
      totals: {
        totalMeals: Math.round(grandTotalMeals * 100) / 100,
        guestMeals: Math.round(grandTotalGuestMeals * 100) / 100,
        totalExpenses: Math.round(grandTotalExpenses * 100) / 100,
        totalFunds: Math.round(grandTotalFunds * 100) / 100,
        mealRate: overallMealRate,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch yearly summary" }
  }
}
