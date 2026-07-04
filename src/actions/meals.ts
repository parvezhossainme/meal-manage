"use server"

import { prisma } from "@/lib/db"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { mealCellSchema, guestMealSchema } from "@/schemas/index"
import { revalidatePath } from "next/cache"

export async function getMealEntriesAction(sheetId: string) {
  try {
    await requireAuth()
    const entries = await prisma.mealEntry.findMany({
      where: { monthlySheetId: sheetId },
      include: { items: { include: { member: true } } },
      orderBy: { date: "asc" },
    })
    return { entries }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch meal entries" }
  }
}

export async function getMealGridAction(sheetId: string) {
  try {
    const session = await requireAuth()
    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: sheetId },
      select: { id: true, month: true, year: true },
    })
    if (!sheet) return { error: "Sheet not found" }

    const days = getDaysInMonth(sheet.month, sheet.year)

    const members = await prisma.member.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    })

    const entries = await prisma.mealEntry.findMany({
      where: { monthlySheetId: sheetId },
      include: { items: true },
      orderBy: { date: "asc" },
    })

    // Fetch default meals
    let defaultMap = new Map<string, number>()
    try {
      const defaultMeals = await prisma.defaultMealEntry.findMany({
        where: { monthlySheetId: sheetId },
      })
      defaultMap = new Map(defaultMeals.map((d: { memberId: string; count: number }) => [d.memberId, d.count]))
    } catch (e) {
      // Table may not exist yet (migration not applied) - return empty map
      // P2021: The table does not exist in the database
      if (e instanceof Error && !e.message.includes("P2021")) {
        console.error("Failed to fetch default meals:", e)
      }
    }

    const entryMap = new Map<string, typeof entries[0]>()
    for (const entry of entries) {
      const key = dateToKey(entry.date)
      entryMap.set(key, entry)
    }

    const grid = []
    for (let day = 1; day <= days; day++) {
      const date = new Date(sheet.year, sheet.month - 1, day)
      const key = dateToKey(date)
      const entry = entryMap.get(key)

      const items: Record<string, number | null> = {}
      let total = 0

      for (const member of members) {
        const entryItems = entry?.items ?? []
        const item = entryItems.find((i: { memberId: string; count: number }) => i.memberId === member.id)
        const count = item ? item.count : null
        items[member.id] = count
        total += count ?? 0
      }

      grid.push({
        date,
        day,
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        items,
        entryId: entry?.id,
        total,
      })
    }

    const canEdit = session.role === "SUPER_ADMIN" || session.role === "MANAGER"

    return { grid, members, canEdit, defaultMeals: defaultMap }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch meal grid" }
  }
}

export async function updateMealCellAction(data: { monthlySheetId: string; date: string; memberId: string; count: number; mealEntryId?: string; mealEntryItemId?: string }) {
  try {
    const session = await requireAuth()

    const parsed = mealCellSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: parsed.data.monthlySheetId },
      select: { id: true, locked: true },
    })
    if (!sheet) return { error: "Sheet not found" }
    if (sheet.locked) return { error: "Sheet is locked" }

    if (session.role !== "SUPER_ADMIN" && session.role !== "MANAGER") {
      return { error: "Only admins can edit meals" }
    }

    const dateObj = new Date(parsed.data.date)

    let entry = parsed.data.mealEntryId
      ? await prisma.mealEntry.findUnique({ where: { id: parsed.data.mealEntryId } })
      : await prisma.mealEntry.findUnique({
          where: { monthlySheetId_date: { monthlySheetId: parsed.data.monthlySheetId, date: dateObj } },
        })

    if (!entry) {
      entry = await prisma.mealEntry.create({
        data: {
          monthlySheetId: parsed.data.monthlySheetId,
          date: dateObj,
        },
      })
    }

    const existingItem = parsed.data.mealEntryItemId
      ? await prisma.mealEntryItem.findUnique({ where: { id: parsed.data.mealEntryItemId } })
      : await prisma.mealEntryItem.findUnique({
          where: { mealEntryId_memberId: { mealEntryId: entry.id, memberId: parsed.data.memberId } },
        })

    let item
    if (existingItem) {
      item = await prisma.mealEntryItem.update({
        where: { id: existingItem.id },
        data: { count: parsed.data.count },
      })
    } else {
      item = await prisma.mealEntryItem.create({
        data: {
          mealEntryId: entry.id,
          memberId: parsed.data.memberId,
          monthlySheetId: parsed.data.monthlySheetId,
          count: parsed.data.count,
        },
      })
    }

    revalidatePath("/sheets")
    return { success: true, item }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update meal cell" }
  }
}

export async function getGuestMealsAction(sheetId: string) {
  try {
    await requireAuth()
    const guestMeals = await prisma.guestMeal.findMany({
      where: { monthlySheetId: sheetId },
      orderBy: { date: "asc" },
    })
    return { guestMeals }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch guest meals" }
  }
}

export async function createGuestMealAction(data: { monthlySheetId: string; date: string; guestName: string; hostedBy: string; mealCount: number; remarks?: string }) {
  try {
    const session = await requireAuth()

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: data.monthlySheetId },
    })
    if (!sheet) return { error: "Sheet not found" }
    if (sheet.locked) return { error: "Sheet is locked" }

    const parsed = guestMealSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const guestMeal = await prisma.guestMeal.create({
      data: {
        monthlySheetId: parsed.data.monthlySheetId,
        date: new Date(parsed.data.date),
        guestName: parsed.data.guestName,
        hostedBy: parsed.data.hostedBy,
        mealCount: parsed.data.mealCount,
        remarks: parsed.data.remarks || null,
      },
    })

    revalidatePath("/sheets")
    return { success: true, guestMeal }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create guest meal" }
  }
}

export async function updateGuestMealAction(id: string, data: { date?: string; guestName?: string; hostedBy?: string; mealCount?: number; remarks?: string }) {
  try {
    const session = await requireAuth()
    const existing = await prisma.guestMeal.findUnique({ where: { id } })
    if (!existing) return { error: "Guest meal not found" }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: existing.monthlySheetId },
    })
    if (sheet?.locked) return { error: "Sheet is locked" }

    const guestMeal = await prisma.guestMeal.update({
      where: { id },
      data: {
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.guestName !== undefined && { guestName: data.guestName }),
        ...(data.hostedBy !== undefined && { hostedBy: data.hostedBy }),
        ...(data.mealCount !== undefined && { mealCount: data.mealCount }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
      },
    })

    revalidatePath("/sheets")
    return { success: true, guestMeal }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update guest meal" }
  }
}

export async function deleteGuestMealAction(id: string) {
  try {
    const session = await requireAuth()
    const existing = await prisma.guestMeal.findUnique({ where: { id } })
    if (!existing) return { error: "Guest meal not found" }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: existing.monthlySheetId },
    })
    if (sheet?.locked) return { error: "Sheet is locked" }

    await prisma.guestMeal.delete({ where: { id } })
    revalidatePath("/sheets")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete guest meal" }
  }
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

function dateToKey(date: Date | string): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export async function getDefaultMealsAction(sheetId: string) {
  try {
    await requireAuth()
    const defaultMeals = await prisma.defaultMealEntry.findMany({
      where: { monthlySheetId: sheetId },
    })
    return { defaultMeals }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch default meals" }
  }
}

export async function updateDefaultMealAction(data: { monthlySheetId: string; memberId: string; count: number }) {
  try {
    const session = await requireAuth()
    if (session.role !== "SUPER_ADMIN" && session.role !== "MANAGER") {
      return { error: "Only admins can edit default meals" }
    }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: data.monthlySheetId },
      select: { id: true, locked: true },
    })
    if (!sheet) return { error: "Sheet not found" }
    if (sheet.locked) return { error: "Sheet is locked" }

    const defaultMeal = await prisma.defaultMealEntry.upsert({
      where: {
        monthlySheetId_memberId: {
          monthlySheetId: data.monthlySheetId,
          memberId: data.memberId,
        },
      },
      update: { count: data.count },
      create: {
        monthlySheetId: data.monthlySheetId,
        memberId: data.memberId,
        count: data.count,
      },
    })

    revalidatePath("/sheets")
    return { success: true, defaultMeal }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update default meal" }
  }
}

export async function deleteDefaultMealAction(sheetId: string, memberId: string) {
  try {
    const session = await requireAuth()
    if (session.role !== "SUPER_ADMIN" && session.role !== "MANAGER") {
      return { error: "Only admins can delete default meals" }
    }

    const sheet = await prisma.monthlySheet.findUnique({
      where: { id: sheetId },
      select: { id: true, locked: true },
    })
    if (!sheet) return { error: "Sheet not found" }
    if (sheet.locked) return { error: "Sheet is locked" }

    await prisma.defaultMealEntry.delete({
      where: {
        monthlySheetId_memberId: {
          monthlySheetId: sheetId,
          memberId,
        },
      },
    })

    revalidatePath("/sheets")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete default meal" }
  }
}
