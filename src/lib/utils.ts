import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " ৳"
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
  }).format(new Date(date))
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
  }).format(new Date(date))
}

export function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  return months[month - 1]
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

export function generateMonthLabel(month: number, year: number): string {
  return `${getMonthName(month)} ${year}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function calculateMealRate(totalExpenses: number, totalMeals: number): number {
  if (totalMeals === 0) return 0
  return totalExpenses / totalMeals
}

export function calculateBalance(
  openingBalance: number,
  deposits: number,
  mealCost: number
): number {
  return openingBalance + deposits - mealCost
}

export function generatePassword(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("")
}
