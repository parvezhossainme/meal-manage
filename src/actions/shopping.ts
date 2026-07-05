"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { shoppingSchema } from "@/schemas/index"
import { revalidatePath } from "next/cache"

export async function getShoppingAction(sheetId: string) {
  try {
    await requireAuth()
    const shopping = await prisma.shopping.findMany({
      where: { monthlySheetId: sheetId },
      include: {
        purchasedBy: true,
      },
      orderBy: { date: "desc" },
    })
    return { shopping }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch shopping" }
  }
}

export async function createShoppingAction(data: {
  monthlySheetId: string
  date: string
  purchasedById: string
  totalCost: number
  details?: string
}) {
  try {
    const session = await requireAuth()

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: data.monthlySheetId },
    })
    if (!sheet) return { error: "Sheet not found" }
    if (sheet.locked) return { error: "Sheet is locked" }

    const parsed = shoppingSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.shopping.create({
        data: {
          monthlySheetId: parsed.data.monthlySheetId,
          date: new Date(parsed.data.date),
          purchasedById: parsed.data.purchasedById,
          totalCost: parsed.data.totalCost,
          details: parsed.data.details || null,
        },
        include: { purchasedBy: true },
      })

      await tx.expense.create({
        data: {
          monthlySheetId: parsed.data.monthlySheetId,
          title: "Bazar",
          categoryId: (await tx.expenseCategory.findFirst({ where: { name: "Main" } }))?.id || "",
          amount: parsed.data.totalCost,
          date: new Date(parsed.data.date),
          recordedById: session.id,
          remarks: `Bazar entry: ${entry.id}`,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE",
          entity: "Shopping",
          entityId: entry.id,
          newValue: JSON.stringify({ totalCost: parsed.data.totalCost }),
        },
      })

      return entry
    })

    revalidatePath("/sheets")
    return { success: true, shopping: result }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create bazar entry" }
  }
}

export async function deleteShoppingAction(id: string) {
  try {
    const session = await requireAuth()
    const existing = await prisma.shopping.findUnique({ where: { id } })
    if (!existing) return { error: "Shopping entry not found" }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: existing.monthlySheetId },
    })
    if (sheet?.locked) return { error: "Sheet is locked" }

    await prisma.$transaction(async (tx) => {
      await tx.shopping.delete({ where: { id } })
      await tx.expense.deleteMany({
        where: {
          monthlySheetId: existing.monthlySheetId,
          remarks: { contains: `Bazar entry: ${id}` },
        },
      })
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "DELETE",
          entity: "Shopping",
          entityId: id,
          oldValue: JSON.stringify(existing),
        },
      })
    })

    revalidatePath("/sheets")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete bazar entry" }
  }
}

export async function getShoppingSummaryAction(sheetId: string) {
  try {
    await requireAuth()
    const shopping = await prisma.shopping.findMany({
      where: { monthlySheetId: sheetId },
      include: { purchasedBy: true },
    })

    const totalShopping = shopping.reduce((sum, s) => sum + s.totalCost, 0)
    const topShopper = shopping.length > 0
      ? shopping.reduce((prev, curr) => (prev.totalCost > curr.totalCost ? prev : curr)).purchasedBy.name
      : "N/A"
    const largestPurchase = shopping.length > 0
      ? Math.max(...shopping.map((s) => s.totalCost))
      : 0
    const avgPurchase = shopping.length > 0 ? totalShopping / shopping.length : 0

    return {
      summary: {
        totalShopping,
        entryCount: shopping.length,
        topShopper,
        largestPurchase,
        avgPurchase: Math.round(avgPurchase * 100) / 100,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch shopping summary" }
  }
}
