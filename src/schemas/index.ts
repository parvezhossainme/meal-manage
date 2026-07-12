import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const createMonthSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  memberIds: z.array(z.string()).min(1, "Select at least one member"),
  importFromSheetId: z.string().optional(),
  carryForward: z.boolean().default(false),
})

export const mealEntrySchema = z.object({
  monthlySheetId: z.string(),
  date: z.string(),
  items: z.array(z.object({
    memberId: z.string(),
    count: z.number().min(0).max(3),
  })),
})

export const mealCellSchema = z.object({
  mealEntryItemId: z.string().optional(),
  mealEntryId: z.string().optional(),
  monthlySheetId: z.string(),
  date: z.string(),
  memberId: z.string(),
  count: z.number().min(0).max(3).multipleOf(0.5),
})

export const guestMealSchema = z.object({
  monthlySheetId: z.string(),
  date: z.string(),
  guestName: z.string().min(1, "Guest name is required"),
  hostedBy: z.string().min(1, "Host is required"),
  mealCount: z.number().min(0.5).max(10).multipleOf(0.5),
  remarks: z.string().optional(),
})

export const fundTransactionSchema = z.object({
  monthlySheetId: z.string(),
  memberId: z.string().min(1, "Member is required"),
  amount: z.number(),
  type: z.enum(["Deposit", "CarryForward", "Adjustment"]).default("Deposit"),
  paymentMethod: z.enum(["Cash", "Bkash", "Nagad", "Bank"]).optional(),
  reference: z.string().optional(),
  remarks: z.string().optional(),
  date: z.string(),
}).superRefine((data, ctx) => {
  if (data.amount === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount cannot be zero", path: ["amount"] })
  }
  if (data.type !== "Adjustment" && data.type !== "CarryForward" && data.amount < 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be positive", path: ["amount"] })
  }
})

export const shoppingSchema = z.object({
  monthlySheetId: z.string(),
  date: z.string(),
  purchasedById: z.string().min(1, "Purchased by is required"),
  totalCost: z.number().positive("Total cost must be positive"),
  details: z.string().optional(),
})

export const dailyNoteSchema = z.object({
  monthlySheetId: z.string(),
  date: z.string(),
  note: z.string().min(1, "Note is required"),
})

export const expenseSchema = z.object({
  monthlySheetId: z.string(),
  title: z.string().min(1, "Title is required"),
  categoryId: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be positive"),
  paidByMemberId: z.string().optional(),
  vendor: z.string().optional(),
  receipt: z.string().optional(),
  remarks: z.string().optional(),
  date: z.string(),
})

export const memberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  active: z.boolean().default(true),
})

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6).optional(),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "MEMBER"]),
})

export const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  active: z.boolean().default(true),
})

export const openingBalanceSchema = z.object({
  monthlySheetId: z.string(),
  balances: z.array(z.object({
    memberId: z.string(),
    amount: z.number(),
  })),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateMonthInput = z.infer<typeof createMonthSchema>
export type MealEntryInput = z.infer<typeof mealEntrySchema>
export type MealCellInput = z.infer<typeof mealCellSchema>
export type GuestMealInput = z.infer<typeof guestMealSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type MemberInput = z.infer<typeof memberSchema>
export type UserInput = z.infer<typeof userSchema>
export type AnnouncementInput = z.infer<typeof announcementSchema>
export type OpeningBalanceInput = z.infer<typeof openingBalanceSchema>
export type FundTransactionInput = z.infer<typeof fundTransactionSchema>
export type ShoppingInput = z.infer<typeof shoppingSchema>
export const fundTransactionUpdateSchema = z.object({
  id: z.string(),
  monthlySheetId: z.string(),
  memberId: z.string().min(1, "Member is required"),
  amount: z.number(),
  type: z.enum(["Deposit", "CarryForward", "Adjustment"]).default("Deposit"),
  paymentMethod: z.enum(["Cash", "Bkash", "Nagad", "Bank"]).nullable().optional(),
  reference: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  date: z.string(),
}).superRefine((data, ctx) => {
  if (data.amount === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount cannot be zero", path: ["amount"] })
  }
  if (data.type !== "Adjustment" && data.type !== "CarryForward" && data.amount < 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be positive", path: ["amount"] })
  }
})

export const extraCostSchema = z.object({
  monthlySheetId: z.string(),
  date: z.string(),
  description: z.string().min(1, "Description is required"),
  totalCost: z.number().refine(val => val !== 0, "Total cost cannot be zero"),
})

export type DailyNoteInput = z.infer<typeof dailyNoteSchema>
export type ExtraCostInput = z.infer<typeof extraCostSchema>
