"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { dailyNoteSchema } from "@/schemas/index"
import { revalidatePath } from "next/cache"

export async function getDailyNotesAction(sheetId: string) {
  try {
    await requireAuth()
    const notes = await prisma.dailyNote.findMany({
      where: { monthlySheetId: sheetId },
      orderBy: { date: "asc" },
    })
    return { notes }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch daily notes" }
  }
}

export async function upsertDailyNoteAction(data: {
  monthlySheetId: string
  date: string
  note: string
}) {
  try {
    const session = await requireAuth()
    const parsed = dailyNoteSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const note = await prisma.dailyNote.upsert({
      where: {
        monthlySheetId_date: {
          monthlySheetId: parsed.data.monthlySheetId,
          date: new Date(parsed.data.date),
        },
      },
      update: { note: parsed.data.note },
      create: {
        monthlySheetId: parsed.data.monthlySheetId,
        date: new Date(parsed.data.date),
        note: parsed.data.note,
      },
    })

    revalidatePath("/sheets")
    return { success: true, note }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save daily note" }
  }
}
