"use server"

import { prisma } from "@/lib/db"
import { loginSchema, registerSchema } from "@/schemas/index"
import {
  loginUser,
  registerUser,
  logoutUser,
  getSession,
  requireAuth,
  hashPassword,
  verifyPassword,
} from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function loginAction(formData: FormData) {
  try {
    const raw = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    }
    const parsed = loginSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const user = await loginUser(parsed.data.email, parsed.data.password)
    if (!user) {
      return { error: "Invalid email or password" }
    }

    revalidatePath("/", "layout")
    return { success: true, user }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Login failed" }
  }
}

export async function registerAction(formData: FormData) {
  try {
    const raw = {
      email: formData.get("email") as string,
      name: formData.get("name") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    }
    const parsed = registerSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid input" }
    }

    const user = await registerUser(parsed.data)
    revalidatePath("/", "layout")
    return { success: true, user }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Registration failed" }
  }
}

export async function logoutAction() {
  await logoutUser()
  revalidatePath("/", "layout")
  return { success: true }
}

export async function getCurrentUserAction() {
  try {
    const user = await getSession()
    return { user }
  } catch {
    return { user: null }
  }
}

export async function changeMyPasswordAction(currentPassword: string, newPassword: string) {
  try {
    const session = await requireAuth()
    if (!newPassword || newPassword.length < 4) {
      return { error: "New password must be at least 4 characters" }
    }
    if (!currentPassword) {
      return { error: "Current password is required" }
    }
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return { error: "User not found" }
    const valid = await verifyPassword(currentPassword, user.password)
    if (!valid) return { error: "Current password is incorrect" }
    const hashed = await hashPassword(newPassword)
    await prisma.user.update({ where: { id: session.id }, data: { password: hashed } })
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to change password" }
  }
}
