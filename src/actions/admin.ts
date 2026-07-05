"use server"

import { prisma } from "@/lib/db"
import { requireAuth, requireAdmin, requireSuperAdmin, hashPassword } from "@/lib/auth"
import { userSchema, announcementSchema } from "@/schemas/index"
import { revalidatePath } from "next/cache"

export async function getUsersAction() {
  try {
    const session = await requireAdmin()
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
      orderBy: { name: "asc" },
    })
    return { users }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch users" }
  }
}

export async function createUserAction(data: { email: string; name: string; password?: string; role: string }) {
  try {
    const session = await requireAdmin()

    const parsed = userSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (existing) return { error: "Email already exists" }

    const password = parsed.data.password || Math.random().toString(36).slice(2, 10) + "A1!"
    const hashed = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        password: hashed,
        role: parsed.data.role,
      },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    })

    revalidatePath("/admin/users")
    return { success: true, user, tempPassword: password }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create user" }
  }
}

export async function updateUserRoleAction(id: string, role: string) {
  try {
    const session = await requireSuperAdmin()
    if (!["SUPER_ADMIN", "MANAGER", "MEMBER"].includes(role)) {
      return { error: "Invalid role" }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    })

    revalidatePath("/admin/users")
    return { success: true, user }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update user role" }
  }
}

export async function updateUserPasswordAction(id: string, newPassword: string) {
  try {
    const session = await requireSuperAdmin()
    if (!newPassword || newPassword.length < 4) {
      return { error: "Password must be at least 4 characters" }
    }
    const hashed = await hashPassword(newPassword)
    await prisma.user.update({ where: { id }, data: { password: hashed } })
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update password" }
  }
}

export async function getSettingsAction() {
  try {
    const session = await requireAdmin()
    const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } })
    return { settings }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch settings" }
  }
}

export async function updateSettingAction(key: string, value: string) {
  try {
    const session = await requireAdmin()
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
    revalidatePath("/admin/settings")
    return { success: true, setting }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update setting" }
  }
}

export async function getAuditLogsAction() {
  try {
    const session = await requireAdmin()
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return { logs }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch audit logs" }
  }
}

export async function createAuditLogAction(
  action: string,
  entity: string,
  entityId?: string,
  oldValue?: string,
  newValue?: string,
  reason?: string
) {
  try {
    const session = await requireAuth()
    const log = await prisma.auditLog.create({
      data: {
        userId: session.id,
        action,
        entity,
        entityId: entityId || null,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        reason: reason || null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    return { success: true, log }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create audit log" }
  }
}

export async function getAnnouncementsAction() {
  try {
    await requireAuth()
    const announcements = await prisma.announcement.findMany({
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    })
    return { announcements }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch announcements" }
  }
}

export async function createAnnouncementAction(data: { title: string; content: string; active?: boolean }) {
  try {
    const session = await requireAdmin()
    const parsed = announcementSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        active: parsed.data.active,
        createdById: session.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    })

    revalidatePath("/announcements")
    return { success: true, announcement }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create announcement" }
  }
}

export async function deleteAnnouncementAction(id: string) {
  try {
    const session = await requireAdmin()
    await prisma.announcement.delete({ where: { id } })
    revalidatePath("/announcements")
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete announcement" }
  }
}
