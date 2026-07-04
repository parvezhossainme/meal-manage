"use server"

import { prisma } from "@/lib/db"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { createMonthSchema } from "@/schemas/index"
import { revalidatePath } from "next/cache"

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

export async function getSheetsAction() {
  try {
    await requireAuth()
    const sheets = await prisma.monthlySheet.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })
    return { sheets }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch sheets" }
  }
}

export async function getSheetAction(id: string) {
  try {
    await requireAuth()
    const sheet = await prisma.monthlySheet.findUnique({
      where: { id },
      include: {
        openingBalances: { include: { member: true } },
        mealEntryItems: { include: { member: true } },
        mealEntries: { include: { items: { include: { member: true } } } },
        guestMeals: true,
        expenses: { include: { category: true, paidBy: true } },
        extraCosts: true,
        fundTxns: { include: { member: true } },
        shopping: { include: { purchasedBy: true } },
      },
    })
    if (!sheet) return { error: "Sheet not found" }
    return { sheet }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch sheet" }
  }
}

export async function getCurrentSheetAction() {
  try {
    await requireAuth()
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const sheet = await prisma.monthlySheet.findUnique({
      where: { month_year: { month, year } },
      include: {
        openingBalances: { include: { member: true } },
        mealEntryItems: { include: { member: true } },
        mealEntries: { include: { items: { include: { member: true } } } },
        guestMeals: true,
        expenses: { include: { category: true, paidBy: true } },
        fundTxns: { include: { member: true } },
      },
    })
    return { sheet }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch current sheet" }
  }
}

export async function getPreviousMonthBalancesAction(memberIds: string[]) {
  try {
    await requireAuth()

    const previousSheet = await prisma.monthlySheet.findFirst({
      where: {},
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        openingBalances: true,
        fundTxns: true,
        mealEntryItems: true,
        expenses: true,
        guestMeals: true,
      },
    })

    if (!previousSheet) return { balances: [] }

    const expenses = previousSheet.expenses.reduce((sum, e) => sum + e.amount, 0)
    const meals = previousSheet.mealEntryItems.reduce((sum, item) => sum + item.count, 0)
    const guestMeals = previousSheet.guestMeals.reduce((sum, g) => sum + g.mealCount, 0)
    const totalMeals = meals + guestMeals
    const mealRate = totalMeals > 0 ? expenses / totalMeals : 0

    const mainCategory = await prisma.expenseCategory.findFirst({ where: { name: "Main" } })
    const extraExpenses = mainCategory
      ? previousSheet.expenses.filter((e) => e.categoryId !== mainCategory.id).reduce((sum, e) => sum + e.amount, 0)
      : 0
    const activeMemberCount = (await prisma.member.count({ where: { active: true } })) || 1
    const extraCostPerMember = extraExpenses / activeMemberCount

    const extraCostEntries = await prisma.extraCost.findMany({ where: { monthlySheetId: previousSheet.id } })
    const totalExtraCostEntries = extraCostEntries.reduce((sum, e) => sum + e.totalCost, 0)
    const extraCostPerMemberFromEntries = activeMemberCount > 0 ? totalExtraCostEntries / activeMemberCount : 0

    const balances = memberIds.map((memberId) => {
      const opening = previousSheet.openingBalances.find((ob) => ob.memberId === memberId)?.amount || 0
      const deposits = previousSheet.fundTxns.filter((f) => f.memberId === memberId).reduce((sum, f) => sum + f.amount, 0)
      const memberMeals = previousSheet.mealEntryItems.filter((i) => i.memberId === memberId).reduce((sum, i) => sum + i.count, 0)
      const mealCost = memberMeals * mealRate
      const totalCost = mealCost + extraCostPerMember + extraCostPerMemberFromEntries
      const balance = Math.round((opening + deposits - totalCost) * 100) / 100

      return { memberId, balance }
    })

    return { balances, fromSheetLabel: previousSheet.label, fromSheetId: previousSheet.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch previous balances" }
  }
}

export async function createSheetAction(data: {
  month: number
  year: number
  memberIds: string[]
  importFromSheetId?: string
  carryForward?: boolean
  balances?: Array<{ memberId: string; amount: number }>
}) {
  try {
    const session = await requireAdmin()
    if (session.role === "MEMBER") return { error: "Only admins can create sheets" }

    const { month, year, memberIds, importFromSheetId, carryForward, balances } = data

    const existing = await prisma.monthlySheet.findUnique({
      where: { month_year: { month, year } },
    })
    if (existing) return { error: "Sheet already exists for this month" }

    const label = `${MONTHS[month]} ${year}`
    const days = getDaysInMonth(month, year)

    const sheet = await prisma.$transaction(async (tx) => {
      const s = await tx.monthlySheet.create({
        data: { month, year, label },
      })

      const effectiveBalances = memberIds.map((memberId) => {
        const manual = balances?.find((b) => b.memberId === memberId)
        return { memberId, amount: manual?.amount ?? 0 }
      })

      await tx.openingBalance.createMany({
        data: effectiveBalances.map((bal) => ({
          monthlySheetId: s.id,
          memberId: bal.memberId,
          amount: bal.amount,
          carriedForward: carryForward || false,
          sourceSheetId: importFromSheetId || null,
        })),
      })

      const mealEntryData = Array.from({ length: days }, (_, i) => ({
        monthlySheetId: s.id,
        date: new Date(year, month - 1, i + 1),
      }))
      await tx.mealEntry.createMany({ data: mealEntryData })

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE",
          entity: "MonthlySheet",
          entityId: s.id,
          newValue: JSON.stringify({ month, year, memberIds, carryForward }),
        },
      })

      return s
    })

    revalidatePath("/sheets")
    return { success: true, sheet }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create sheet" }
  }
}

export async function getCloseMonthSummaryAction(id: string) {
  try {
    await requireAuth()

    const sheet = await prisma.monthlySheet.findUnique({ where: { id } })
    if (!sheet) return { error: "Sheet not found" }

    const mealEntryItems = await prisma.mealEntryItem.findMany({ where: { monthlySheetId: id } })
    const totalMeals = mealEntryItems.reduce((sum, i) => sum + i.count, 0)

    const guestMeals = await prisma.guestMeal.findMany({ where: { monthlySheetId: id } })
    const totalGuestMeals = guestMeals.reduce((sum, g) => sum + g.mealCount, 0)
    const combinedMeals = totalMeals + totalGuestMeals

    const expenses = await prisma.expense.findMany({ where: { monthlySheetId: id } })
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    const mealRate = combinedMeals > 0 ? Math.round((totalExpenses / combinedMeals) * 100) / 100 : 0

    const funds = await prisma.fundTransaction.findMany({ where: { monthlySheetId: id } })
    const totalFunds = funds.reduce((sum, f) => sum + f.amount, 0)

    const openingBalances = await prisma.openingBalance.findMany({ where: { monthlySheetId: id }, include: { member: true } })
    const totalOpening = openingBalances.reduce((sum, ob) => sum + ob.amount, 0)

    const shopping = await prisma.shopping.findMany({ where: { monthlySheetId: id } })
    const totalShopping = shopping.reduce((sum, s) => sum + s.totalCost, 0)

    const members = await prisma.member.findMany({ where: { active: true }, orderBy: { name: "asc" } })
    const mainCategory = await prisma.expenseCategory.findFirst({ where: { name: "Main" } })
    const extraExpenses = mainCategory
      ? expenses.filter((e) => e.categoryId !== mainCategory.id).reduce((sum, e) => sum + e.amount, 0)
      : 0
    const extraCostPerMember = members.length > 0 ? Math.round((extraExpenses / members.length) * 100) / 100 : 0

    const extraCostEntries = await prisma.extraCost.findMany({ where: { monthlySheetId: id } })
    const totalExtraCostEntries = extraCostEntries.reduce((sum, e) => sum + e.totalCost, 0)
    const extraCostPerMemberFromEntries = members.length > 0 ? Math.round((totalExtraCostEntries / members.length) * 100) / 100 : 0
    const combinedExtraCostPerMember = Math.round((extraCostPerMember + extraCostPerMemberFromEntries) * 100) / 100

    const memberSummaries = members.map((member) => {
      const memberMeals = mealEntryItems.filter((i) => i.memberId === member.id).reduce((sum, i) => sum + i.count, 0)
      const mealCost = Math.round(memberMeals * mealRate * 100) / 100
      const opening = openingBalances.find((ob) => ob.memberId === member.id)?.amount || 0
      const deposits = funds.filter((f) => f.memberId === member.id).reduce((sum, f) => sum + f.amount, 0)
      const totalCost = Math.round((mealCost + combinedExtraCostPerMember) * 100) / 100
      const balance = Math.round((opening + deposits - totalCost) * 100) / 100

      return { memberName: member.name, opening, deposits, memberMeals, mealCost, extraCost: combinedExtraCostPerMember, totalCost, balance }
    })

    return {
      summary: {
        sheetLabel: sheet.label,
        mealRate,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalMeals,
        totalGuestMeals,
        combinedMeals,
        totalFunds: Math.round(totalFunds * 100) / 100,
        totalOpening: Math.round(totalOpening * 100) / 100,
        totalShopping: Math.round(totalShopping * 100) / 100,
        members: memberSummaries,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to get close summary" }
  }
}

export async function lockSheetAction(id: string) {
  try {
    const session = await requireAdmin()
    const sheet = await prisma.monthlySheet.update({
      where: { id },
      data: { locked: true },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "LOCK",
        entity: "MonthlySheet",
        entityId: id,
      },
    })

    revalidatePath("/sheets")
    return { success: true, sheet }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to lock sheet" }
  }
}

export async function closeMonthAction(id: string, carryForwardNow: boolean) {
  try {
    const session = await requireAdmin()

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id },
      include: { openingBalances: true },
    })
    if (!sheet) return { error: "Sheet not found" }
    if (sheet.locked) return { error: "Sheet is already locked" }

    await prisma.$transaction(async (tx) => {
      await tx.monthlySheet.update({
        where: { id },
        data: { locked: true },
      })

      if (carryForwardNow) {
        const nextMonth = sheet.month === 12 ? 1 : sheet.month + 1
        const nextYear = sheet.month === 12 ? sheet.year + 1 : sheet.year

        let nextSheet = await tx.monthlySheet.findUnique({
          where: { month_year: { month: nextMonth, year: nextYear } },
        })

          if (!nextSheet) {
            const label = `${MONTHS[nextMonth]} ${nextYear}`
            const days = getDaysInMonth(nextMonth, nextYear)
            nextSheet = await tx.monthlySheet.create({
              data: { month: nextMonth, year: nextYear, label },
            })

            const mealEntryData = Array.from({ length: days }, (_, i) => ({
              monthlySheetId: nextSheet!.id,
              date: new Date(nextYear, nextMonth - 1, i + 1),
            }))
            await tx.mealEntry.createMany({ data: mealEntryData })
          }

        const members = await prisma.member.findMany({ where: { active: true } })

        for (const member of members) {
          const existingOpening = await tx.openingBalance.findUnique({
            where: {
              monthlySheetId_memberId: {
                monthlySheetId: nextSheet.id,
                memberId: member.id,
              },
            },
          })

          const openingFromSheet = sheet.openingBalances.find((ob) => ob.memberId === member.id)?.amount || 0
          const fundTxns = await tx.fundTransaction.findMany({ where: { monthlySheetId: id, memberId: member.id } })
          const deposits = fundTxns.reduce((sum, f) => sum + f.amount, 0)
          const mealItems = await tx.mealEntryItem.findMany({ where: { monthlySheetId: id, memberId: member.id } })
          const memberMeals = mealItems.reduce((sum, i) => sum + i.count, 0)
          const guestMeals = await tx.guestMeal.findMany({ where: { monthlySheetId: id } })
          const totalGuestMeals = guestMeals.reduce((sum, g) => sum + g.mealCount, 0)
          const expenses = await tx.expense.findMany({ where: { monthlySheetId: id } })
          const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
          const combinedMeals = memberMeals + totalGuestMeals
          const mealRate = combinedMeals > 0 ? totalExpenses / combinedMeals : 0
          const mealCost = memberMeals * mealRate

          const mainCategory = await tx.expenseCategory.findFirst({ where: { name: "Main" } })
          const extraExpenses = mainCategory
            ? expenses.filter((e) => e.categoryId !== mainCategory.id).reduce((sum, e) => sum + e.amount, 0)
            : 0
          const memberCount = await prisma.member.count({ where: { active: true } })
          const extraCostPerMember = memberCount > 0 ? extraExpenses / memberCount : 0

          const extraCostEntries = await tx.extraCost.findMany({ where: { monthlySheetId: id } })
          const totalExtraCostEntries = extraCostEntries.reduce((sum, e) => sum + e.totalCost, 0)
          const extraCostPerMemberFromEntries = memberCount > 0 ? totalExtraCostEntries / memberCount : 0

          const totalCost = mealCost + extraCostPerMember + extraCostPerMemberFromEntries
          const balance = Math.round((openingFromSheet + deposits - totalCost) * 100) / 100

          const data: { monthlySheetId: string; memberId: string; amount: number; carriedForward: boolean; sourceSheetId?: string } = {
            monthlySheetId: nextSheet.id,
            memberId: member.id,
            amount: balance,
            carriedForward: true,
            sourceSheetId: id,
          }

          if (existingOpening) {
            await tx.openingBalance.update({
              where: { id: existingOpening.id },
              data: { amount: balance },
            })
          } else {
            await tx.openingBalance.create({ data })
          }

          await tx.carryForwardHistory.create({
            data: {
              fromSheetId: id,
              toSheetId: nextSheet.id,
              memberId: member.id,
              importedBalance: openingFromSheet,
              adjustment: 0,
              finalBalance: balance,
            },
          })
        }
      }

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CLOSE",
          entity: "MonthlySheet",
          entityId: id,
          newValue: JSON.stringify({ carryForwardNow }),
        },
      })
    })

    revalidatePath("/sheets")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to close month" }
  }
}

export async function unlockSheetAction(id: string) {
  try {
    const session = await requireAdmin()
    const sheet = await prisma.monthlySheet.update({
      where: { id },
      data: { locked: false },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "UNLOCK",
        entity: "MonthlySheet",
        entityId: id,
      },
    })

    revalidatePath("/sheets")
    return { success: true, sheet }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to unlock sheet" }
  }
}

export async function deleteSheetAction(id: string) {
  try {
    const session = await requireAdmin()
    await prisma.monthlySheet.delete({ where: { id } })
    revalidatePath("/sheets")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete sheet" }
  }
}

