import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { prisma } from "./db"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret"
const COOKIE_NAME = "session"
const SALT_ROUNDS = 10

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  memberId?: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser
  } catch {
    return null
  }
}

export async function createSession(user: SessionUser) {
  const token = signToken(user)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) redirect("/login")
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth()
  if (user.role === "MEMBER") redirect("/dashboard")
  return user
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAuth()
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard")
  return user
}

export async function loginUser(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) return null

  const valid = await verifyPassword(password, user.password)
  if (!valid) return null

  const member = await prisma.member.findUnique({ where: { userId: user.id } })

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    memberId: member?.id,
  }

  await createSession(sessionUser)
  return sessionUser
}

export async function registerUser(data: {
  email: string
  name: string
  password: string
  role?: string
}): Promise<SessionUser> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new Error("Email already exists")

  const hashed = await hashPassword(data.password)
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashed,
      role: data.role || "MEMBER",
    },
  })

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }

  await createSession(sessionUser)
  return sessionUser
}

export async function logoutUser() {
  await destroySession()
}
