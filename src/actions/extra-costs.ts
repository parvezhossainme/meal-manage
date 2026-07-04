"use server"

import { prisma } from "@/lib/db"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { extraCostSchema } from "@/schemas/index"
import { revalidatePath } from "next/cache"

export async function getExtraCostsAction(sheetId: string) {
  try {
    await requireAuth()
    const costs = await prisma.extraCost.findMany({
      where: { monthlySheetId: sheetId },
      orderBy: { date: "desc" },
    })
    return { costs }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch extra costs" }
  }
}

export async function createExtraCostAction(data: {
  monthlySheetId: string
  date: string
  description: string
  totalCost: number
}) {
  try {
    const session = await requireAdmin()
    if (session.role === "MEMBER") return { error: "Only managers can create extra costs" }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: data.monthlySheetId },
    })
    if (!sheet) return { error: "Sheet not found" }
    if (sheet.locked) return { error: "Sheet is locked" }

    const parsed = extraCostSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.extraCost.create({
        data: {
          monthlySheetId: parsed.data.monthlySheetId,
          date: new Date(parsed.data.date),
          description: parsed.data.description,
          totalCost: parsed.data.totalCost,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE",
          entity: "ExtraCost",
          entityId: entry.id,
          newValue: JSON.stringify({ description: parsed.data.description, totalCost: parsed.data.totalCost }),
        },
      })

      return entry
    })

    revalidatePath("/extra-costs")
    return { success: true, cost: result }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create extra cost" }
  }
}

export async function deleteExtraCostAction(id: string) {
  try {
    const session = await requireAdmin()
    const existing = await prisma.extraCost.findUnique({ where: { id } })
    if (!existing) return { error: "Extra cost not found" }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: existing.monthlySheetId },
    })
    if (sheet?.locked) return { error: "Sheet is locked" }

    await prisma.$transaction(async (tx) => {
      await tx.extraCost.delete({ where: { id } })

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "DELETE",
          entity: "ExtraCost",
          entityId: id,
          oldValue: JSON.stringify(existing),
        },
      })
    })

    revalidatePath("/extra-costs")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete extra cost" }
  }
}
