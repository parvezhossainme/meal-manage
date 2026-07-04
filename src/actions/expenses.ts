"use server"

import { prisma } from "@/lib/db"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { expenseSchema } from "@/schemas/index"
import { revalidatePath } from "next/cache"

export async function getExpensesAction(sheetId: string) {
  try {
    await requireAuth()
    const expenses = await prisma.expense.findMany({
      where: { monthlySheetId: sheetId },
      include: { category: true, paidBy: true },
      orderBy: { date: "desc" },
    })
    return { expenses }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch expenses" }
  }
}

export async function getExpenseCategoriesAction() {
  try {
    await requireAuth()
    const categories = await prisma.expenseCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    })
    return { categories }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch categories" }
  }
}

export async function createExpenseCategoryAction(name: string) {
  try {
    const session = await requireAdmin()
    const existing = await prisma.expenseCategory.findUnique({ where: { name } })
    if (existing) return { error: "Category already exists" }

    const category = await prisma.expenseCategory.create({
      data: { name },
    })

    revalidatePath("/expenses")
    return { success: true, category }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create category" }
  }
}

export async function createExpenseAction(data: {
  monthlySheetId: string
  title: string
  categoryId: string
  amount: number
  paidByMemberId?: string
  vendor?: string
  receipt?: string
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

    const parsed = expenseSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const expense = await prisma.expense.create({
      data: {
        monthlySheetId: parsed.data.monthlySheetId,
        title: parsed.data.title,
        categoryId: parsed.data.categoryId,
        amount: parsed.data.amount,
        paidByMemberId: parsed.data.paidByMemberId || null,
        vendor: parsed.data.vendor || null,
        receipt: parsed.data.receipt || null,
        remarks: parsed.data.remarks || null,
        date: new Date(parsed.data.date),
        recordedById: session.id,
      },
      include: { category: true, paidBy: true },
    })

    revalidatePath("/sheets")
    return { success: true, expense }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create expense" }
  }
}

export async function updateExpenseAction(id: string, data: {
  title?: string
  categoryId?: string
  amount?: number
  paidByMemberId?: string
  vendor?: string
  receipt?: string
  remarks?: string
  date?: string
}) {
  try {
    const session = await requireAuth()
    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) return { error: "Expense not found" }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: existing.monthlySheetId },
    })
    if (sheet?.locked) return { error: "Sheet is locked" }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.paidByMemberId !== undefined && { paidByMemberId: data.paidByMemberId || null }),
        ...(data.vendor !== undefined && { vendor: data.vendor || null }),
        ...(data.receipt !== undefined && { receipt: data.receipt || null }),
        ...(data.remarks !== undefined && { remarks: data.remarks || null }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
      },
      include: { category: true, paidBy: true },
    })

    revalidatePath("/sheets")
    return { success: true, expense }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update expense" }
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    const session = await requireAuth()
    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) return { error: "Expense not found" }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: existing.monthlySheetId },
    })
    if (sheet?.locked) return { error: "Sheet is locked" }

    await prisma.expense.delete({ where: { id } })
    revalidatePath("/sheets")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete expense" }
  }
}
