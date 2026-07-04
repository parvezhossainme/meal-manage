"use server"

import { loginSchema, registerSchema } from "@/schemas/index"
import {
  loginUser,
  registerUser,
  logoutUser,
  getSession,
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
