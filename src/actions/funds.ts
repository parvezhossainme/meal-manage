"use server"

import { prisma } from "@/lib/db"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { fundTransactionSchema, fundTransactionUpdateSchema } from "@/schemas/index"
import { revalidatePath } from "next/cache"

export async function getFundsAction(sheetId: string) {
  try {
    await requireAuth()
    const funds = await prisma.fundTransaction.findMany({
      where: { monthlySheetId: sheetId },
      include: { member: true },
      orderBy: { date: "desc" },
    })
    return { funds }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch funds" }
  }
}

export async function createFundAction(data: {
  monthlySheetId: string
  memberId: string
  amount: number
  type?: string
  paymentMethod?: string
  reference?: string
  remarks?: string
  date: string
}) {
  try {
    const session = await requireAuth()

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: data.monthlySheetId },
    })
    if (!sheet) return { error: "Sheet not found" }
    if (sheet.locked) return { error: "Sheet is locked" }

    const parsed = fundTransactionSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const fund = await prisma.$transaction(async (tx) => {
      const f = await tx.fundTransaction.create({
        data: {
          monthlySheetId: parsed.data.monthlySheetId,
          memberId: parsed.data.memberId,
          amount: parsed.data.amount,
          type: parsed.data.type,
          paymentMethod: parsed.data.paymentMethod || null,
          reference: parsed.data.reference || null,
          remarks: parsed.data.remarks || null,
          date: new Date(parsed.data.date),
          recordedById: session.id,
        },
        include: { member: true },
      })

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE",
          entity: "FundTransaction",
          entityId: f.id,
          newValue: JSON.stringify({ amount: parsed.data.amount, type: parsed.data.type, memberId: parsed.data.memberId }),
        },
      })

      return f
    })

    revalidatePath("/sheets")
    return { success: true, fund }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create fund transaction" }
  }
}

export async function getFundLedgerByMemberAction(sheetId: string) {
  try {
    await requireAuth()

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: sheetId },
      select: { month: true, year: true },
    })

    const activeMembers = await prisma.member.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        fundTransactions: {
          where: { monthlySheetId: sheetId },
          orderBy: { date: "asc" },
        },
      },
    })

    const prevMonth = sheet ? (sheet.month === 1 ? 12 : sheet.month - 1) : 0
    const prevYear = sheet ? (sheet.month === 1 ? sheet.year - 1 : sheet.year) : 0

    const prevSheet = await prisma.monthlySheet.findUnique({
      where: { month_year: { month: prevMonth, year: prevYear } },
      select: { id: true, label: true },
    })

    const openingBalances = await prisma.openingBalance.findMany({
      where: { monthlySheetId: sheetId, carriedForward: true },
    })

    const ledger = activeMembers.map((m) => {
      let runningTotal = 0
      const transactions = m.fundTransactions.map((t) => {
        runningTotal += t.amount
        return { ...t, runningTotal }
      })

      const openingAmount = openingBalances.find((ob) => ob.memberId === m.id)?.amount || 0
      const depositTotal = transactions.reduce((sum, t) => sum + t.amount, 0)
      const totalFund = openingAmount + depositTotal

      return {
        memberId: m.id,
        memberName: m.name,
        openingBalance: openingAmount,
        totalFund,
        transactions,
      }
    })

    return {
      ledger,
      previousSheet: prevSheet ? { id: prevSheet.id, label: prevSheet.label } : null,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch fund ledger" }
  }
}

export async function updateFundAction(data: {
  id: string
  monthlySheetId: string
  memberId: string
  amount: number
  type?: string
  paymentMethod?: string | null
  reference?: string | null
  remarks?: string | null
  date: string
}) {
  try {
    const session = await requireAdmin()
    const existing = await prisma.fundTransaction.findUnique({ where: { id: data.id } })
    if (!existing) return { error: "Fund transaction not found" }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: existing.monthlySheetId },
    })
    if (sheet?.locked) return { error: "Sheet is locked" }

    const parsed = fundTransactionUpdateSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const oldValue = { ...existing }

    const fund = await prisma.$transaction(async (tx) => {
      const f = await tx.fundTransaction.update({
        where: { id: parsed.data.id },
        data: {
          memberId: parsed.data.memberId,
          amount: parsed.data.amount,
          type: parsed.data.type,
          paymentMethod: parsed.data.paymentMethod ?? null,
          reference: parsed.data.reference ?? null,
          remarks: parsed.data.remarks ?? null,
          date: new Date(parsed.data.date),
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "UPDATE",
          entity: "FundTransaction",
          entityId: f.id,
          oldValue: JSON.stringify(oldValue),
          newValue: JSON.stringify(parsed.data),
        },
      })

      return f
    })

    revalidatePath("/funds")
    return { success: true, fund }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update fund transaction" }
  }
}

export async function deleteFundAction(id: string) {
  try {
    const session = await requireAdmin()
    const existing = await prisma.fundTransaction.findUnique({ where: { id } })
    if (!existing) return { error: "Fund transaction not found" }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: existing.monthlySheetId },
    })
    if (sheet?.locked) return { error: "Sheet is locked" }

    await prisma.$transaction(async (tx) => {
      await tx.fundTransaction.delete({ where: { id } })
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "DELETE",
          entity: "FundTransaction",
          entityId: id,
          oldValue: JSON.stringify(existing),
        },
      })
    })

    revalidatePath("/sheets")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete fund transaction" }
  }
}
