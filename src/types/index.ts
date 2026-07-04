export type UserRole = "SUPER_ADMIN" | "MANAGER" | "MEMBER"

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  memberId?: string | null
}

export interface MealGridCell {
  date: string
  day: number
  memberId: string
  count: number
  entryId?: string
  itemId?: string
}

export interface MealGridRow {
  date: Date
  day: number
  dayName: string
  items: Record<string, number>
  entryId?: string
  total: number
}

export interface MonthInfo {
  month: number
  year: number
  label: string
  days: number
  locked: boolean
  id: string
}

export interface MemberBalance {
  memberId: string
  memberName: string
  openingBalance: number
  totalMeals: number
  mealCost: number
  extraCost: number
  extraCostEntries: number
  totalCost: number
  deposits: number
  balance: number
}

export interface MonthlySummary {
  totalMeals: number
  guestMeals: number
  totalExpenses: number
  mealRate: number
  extraExpenses: number
  extraCostPerMember: number
  extraCostFromEntries: number
  extraCostPerMemberFromEntries: number
  members: MemberBalance[]
}

export interface DashboardStats {
  currentMonth: string
  mealRate: number
  totalMeals: number
  totalExpenses: number
  totalFunds: number
  activeMembers: number
  guestMeals: number
  outstandingBalance: number
}

export interface ImportPreview {
  type: string
  rows: number
  columns: string[]
  sampleData: Record<string, string>[]
}
