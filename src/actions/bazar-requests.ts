"use server"

import { prisma } from "@/lib/db"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function createBazarRequestAction(data: {
  monthlySheetId: string
  date: string
  totalCost: number
  details?: string
}) {
  try {
    const session = await requireAuth()

    const member = await prisma.member.findUnique({ where: { userId: session.id } })
    if (!member) return { error: "Member profile not found" }

    const sheet = await prisma.monthlySheet.findUnique({ where: { id: data.monthlySheetId } })
    if (!sheet) return { error: "Sheet not found" }
    if (sheet.locked) return { error: "Sheet is locked" }

    if (!data.totalCost || data.totalCost <= 0) return { error: "Invalid amount" }

    const request = await prisma.bazarRequest.create({
      data: {
        monthlySheetId: data.monthlySheetId,
        memberId: member.id,
        date: new Date(data.date),
        totalCost: data.totalCost,
        details: data.details || null,
      },
    })

    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "MANAGER"] }, active: true },
    })

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "Bazar Request",
        message: `${member.name} requested a bazar entry of ${data.totalCost} Tk`,
      })),
    })

    revalidatePath("/shopping")
    return { success: true, request }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create request" }
  }
}

export async function getBazarRequestsAction(sheetId: string) {
  try {
    await requireAdmin()
    const requests = await prisma.bazarRequest.findMany({
      where: { monthlySheetId: sheetId },
      include: { member: true },
      orderBy: { createdAt: "desc" },
    })
    return { requests }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch requests" }
  }
}

export async function getMyBazarRequestsAction(sheetId: string) {
  try {
    const session = await requireAuth()
    const member = await prisma.member.findUnique({ where: { userId: session.id } })
    if (!member) return { requests: [] }

    const requests = await prisma.bazarRequest.findMany({
      where: { monthlySheetId: sheetId, memberId: member.id },
      include: { member: true },
      orderBy: { createdAt: "desc" },
    })
    return { requests }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch requests" }
  }
}

export async function approveBazarRequestAction(id: string) {
  try {
    const session = await requireAdmin()

    const request = await prisma.bazarRequest.findUnique({ where: { id }, include: { member: true } })
    if (!request) return { error: "Request not found" }
    if (request.status !== "PENDING") return { error: "Request already handled" }

    const sheet = await prisma.monthlySheet.findUnique({ where: { id: request.monthlySheetId } })
    if (sheet?.locked) return { error: "Sheet is locked" }

    await prisma.$transaction(async (tx) => {
      await tx.bazarRequest.update({
        where: { id },
        data: { status: "APPROVED", handledById: session.id, handledAt: new Date() },
      })

      const entry = await tx.shopping.create({
        data: {
          monthlySheetId: request.monthlySheetId,
          date: request.date,
          purchasedById: request.memberId,
          totalCost: request.totalCost,
          details: request.details,
        },
      })

      await tx.expense.create({
        data: {
          monthlySheetId: request.monthlySheetId,
          title: "Bazar",
          categoryId: (await tx.expenseCategory.findFirst({ where: { name: "Main" } }))?.id || "",
          amount: request.totalCost,
          date: request.date,
          recordedById: session.id,
          remarks: `Bazar entry: ${entry.id}`,
        },
      })

      await tx.notification.create({
        data: {
          userId: request.member.userId,
          title: "Bazar Request Approved",
          message: `Your bazar request of ${request.totalCost} Tk has been approved`,
        },
      })
    })

    revalidatePath("/shopping")
    revalidatePath("/shopping")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to approve request" }
  }
}

export async function rejectBazarRequestAction(id: string, reason?: string) {
  try {
    const session = await requireAdmin()

    const request = await prisma.bazarRequest.findUnique({ where: { id }, include: { member: true } })
    if (!request) return { error: "Request not found" }
    if (request.status !== "PENDING") return { error: "Request already handled" }

    await prisma.$transaction(async (tx) => {
      await tx.bazarRequest.update({
        where: { id },
        data: { status: "REJECTED", handledById: session.id, handledAt: new Date(), rejectReason: reason || null },
      })

      await tx.notification.create({
        data: {
          userId: request.member.userId,
          title: "Bazar Request Rejected",
          message: reason
            ? `Your bazar request of ${request.totalCost} Tk was rejected: ${reason}`
            : `Your bazar request of ${request.totalCost} Tk was rejected`,
        },
      })
    })

    revalidatePath("/shopping")
    revalidatePath("/shopping")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reject request" }
  }
}

export async function getUnreadNotificationCountAction() {
  try {
    const session = await requireAuth()
    const count = await prisma.notification.count({
      where: { userId: session.id, read: false },
    })
    return { count }
  } catch {
    return { count: 0 }
  }
}

export async function getNotificationsAction() {
  try {
    const session = await requireAuth()
    const notifications = await prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return { notifications }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch notifications" }
  }
}

export async function markNotificationReadAction(id: string) {
  try {
    const session = await requireAuth()
    await prisma.notification.updateMany({
      where: { id, userId: session.id },
      data: { read: true },
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const session = await requireAuth()
    await prisma.notification.updateMany({
      where: { userId: session.id, read: false },
      data: { read: true },
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}
