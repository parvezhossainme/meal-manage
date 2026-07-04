import ExcelJS from "exceljs"
import type { MonthlySummary } from "@/types"

export interface ExportOptions {
  sheetName?: string
  fileName?: string
}

export async function exportMonthlySheet(summary: MonthlySummary, options: ExportOptions = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(options.sheetName || "Summary")

  sheet.columns = [
    { header: "Member", key: "memberName", width: 20 },
    { header: "Opening Balance", key: "openingBalance", width: 15 },
    { header: "Total Meals", key: "totalMeals", width: 12 },
    { header: "Meal Cost", key: "mealCost", width: 12 },
    { header: "Extra Cost", key: "extraCost", width: 12 },
    { header: "Total Cost", key: "totalCost", width: 12 },
    { header: "Deposits", key: "deposits", width: 12 },
    { header: "Balance", key: "balance", width: 12 },
  ]

  const rows = summary.members.map((m) => ({
    memberName: m.memberName,
    openingBalance: m.openingBalance,
    totalMeals: m.totalMeals,
    mealCost: m.mealCost,
    extraCost: m.extraCost,
    totalCost: m.totalCost,
    deposits: m.deposits,
    balance: m.balance,
  }))

  sheet.addRows(rows)

  sheet.addRow({})
  sheet.addRow({
    memberName: "Totals",
    totalMeals: summary.totalMeals,
    mealCost: summary.members.reduce((s, m) => s + m.mealCost, 0),
    extraCost: summary.members.reduce((s, m) => s + m.extraCost, 0),
    totalCost: summary.members.reduce((s, m) => s + m.totalCost, 0),
    deposits: summary.members.reduce((s, m) => s + m.deposits, 0),
    balance: summary.members.reduce((s, m) => s + m.balance, 0),
  })
  sheet.addRow({})
  sheet.addRow({ memberName: `Meal Rate: ${summary.mealRate.toFixed(2)}` })
  sheet.addRow({ memberName: `Total Meals: ${summary.totalMeals}` })
  sheet.addRow({ memberName: `Guest Meals: ${summary.guestMeals}` })
  sheet.addRow({ memberName: `Total Expenses: ${summary.totalExpenses.toFixed(2)}` })

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }

  const buf = await workbook.xlsx.writeBuffer()
  return Buffer.from(buf)
}

export function exportToCSV(data: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(",")
  const rows = data.map((row: Record<string, unknown>) =>
    columns.map((col: string) => {
      const val = row[col]
      if (typeof val === "string" && val.includes(",")) return `"${val}"`
      return String(val ?? "")
    }).join(",")
  )
  return [header, ...rows].join("\n")
}
