"use server"

import { prisma } from "@/lib/db"
import { requireAuth, requireAdmin, hashPassword } from "@/lib/auth"
import { memberSchema } from "@/schemas/index"
import { revalidatePath } from "next/cache"

export async function getMembersAction() {
  try {
    await requireAuth()
    const members = await prisma.member.findMany({
      include: { user: { select: { id: true, email: true, role: true, active: true } } },
      orderBy: { name: "asc" },
    })
    return { members }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch members" }
  }
}

export async function getActiveMembersAction() {
  try {
    await requireAuth()
    const members = await prisma.member.findMany({
      where: { active: true },
      include: { user: { select: { id: true, email: true, role: true, active: true } } },
      orderBy: { name: "asc" },
    })
    return { members }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to fetch active members" }
  }
}

export async function createMemberAction(data: { name: string; phone?: string; email?: string; active?: boolean }) {
  try {
    const session = await requireAdmin()
    const parsed = memberSchema.safeParse(data)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const randomPassword = Math.random().toString(36).slice(2, 10) + "A1!"
    const hashed = await hashPassword(randomPassword)

    const member = await prisma.member.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        active: parsed.data.active,
        user: {
          create: {
            email: parsed.data.email || `${parsed.data.name.toLowerCase().replace(/\s+/g, ".")}@meal.app`,
            name: parsed.data.name,
            password: hashed,
            role: "MEMBER",
          },
        },
      },
      include: { user: { select: { id: true, email: true, role: true, active: true } } },
    })

    revalidatePath("/members")
    return { success: true, member, tempPassword: randomPassword }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create member" }
  }
}

export async function updateMemberAction(id: string, data: { name?: string; phone?: string; email?: string; active?: boolean }) {
  try {
    await requireAdmin()
    const member = await prisma.member.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: { user: { select: { id: true, email: true, role: true, active: true } } },
    })

    if (member.userId) {
      if (data.name !== undefined) {
        await prisma.user.update({
          where: { id: member.userId },
          data: { name: member.name },
        })
      }
      if (data.email !== undefined && member.email) {
        await prisma.user.update({
          where: { id: member.userId },
          data: { email: member.email },
        })
      }
    }

    revalidatePath("/members")
    return { success: true, member }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update member" }
  }
}

export async function toggleMemberActiveAction(id: string) {
  try {
    const session = await requireAdmin()
    const member = await prisma.member.findUnique({ where: { id } })
    if (!member) return { error: "Member not found" }

    const updated = await prisma.member.update({
      where: { id },
      data: { active: !member.active },
      include: { user: { select: { id: true, email: true, role: true, active: true } } },
    })

    await prisma.user.update({
      where: { id: member.userId },
      data: { active: updated.active },
    })

    revalidatePath("/members")
    return { success: true, member: updated }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to toggle member status" }
  }
}

export async function deleteMemberAction(id: string) {
  try {
    const session = await requireAdmin()
    const member = await prisma.member.findUnique({ where: { id } })
    if (!member) return { error: "Member not found" }

    const updated = await prisma.member.update({
      where: { id },
      data: { active: false },
    })

    await prisma.user.update({
      where: { id: member.userId },
      data: { active: false },
    })

    revalidatePath("/members")
    return { success: true, member: updated }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete member" }
  }
}
