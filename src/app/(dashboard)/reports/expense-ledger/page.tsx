"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { getExpenseLedgerAction, getSheetsListAction, getExpenseCategoriesListAction } from "@/actions/reports"

interface ExpenseRow {
  id: string
  date: Date
  title: string
  amount: number
  categoryName: string
  paidByName: string | null
  sheetLabel: string
  vendor: string | null
  remarks: string | null
}

export default function ExpenseLedgerPage() {
  const router = useRouter()
  const [sheets, setSheets] = useState<{ id: string; label: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [selectedSheet, setSelectedSheet] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      getSheetsListAction(),
      getExpenseCategoriesListAction(),
    ]).then(([sRes, cRes]) => {
      if (sRes.sheets) setSheets(sRes.sheets)
      if (cRes.categories) setCategories(cRes.categories)
    })
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const params: { sheetId?: string; categoryId?: string } = {}
    if (selectedSheet !== "all") params.sheetId = selectedSheet
    if (selectedCategory !== "all") params.categoryId = selectedCategory
    const res = await getExpenseLedgerAction(params)
    setLoading(false)
    if (res.expenses) {
      setExpenses(res.expenses)
      setTotal(res.total)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [selectedSheet, selectedCategory])

  const handleExportCSV = () => {
    const headers = ["Date", "Title", "Category", "Amount", "Sheet", "Paid By", "Vendor", "Remarks"]
    const rows = expenses.map(e => [
      formatDate(e.date),
      e.title,
      e.categoryName,
      e.amount.toFixed(2),
      e.sheetLabel,
      e.paidByName || "",
      e.vendor || "",
      e.remarks || "",
    ])
    rows.push(["TOTAL", "", "", total.toFixed(2)])
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "expense-ledger.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/reports")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Expense Ledger</h1>
          <p className="text-sm text-muted-foreground">Detailed expense transaction history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-50">
            <Select value={selectedSheet} onValueChange={(v: string | null) => { if (v) setSelectedSheet(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="All Sheets">
                  {(value: string | null) => {
                    if (!value) return null
                    if (value === "all") return "All Sheets"
                    return sheets.find(s => s.id === value)?.label || value
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sheets</SelectItem>
                {sheets.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-50">
            <Select value={selectedCategory} onValueChange={(v: string | null) => { if (v) setSelectedCategory(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories">
                  {(value: string | null) => {
                    if (!value) return null
                    if (value === "all") return "All Categories"
                    return categories.find(c => c.id === value)?.name || value
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!loading && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Sheet</TableHead>
                  <TableHead>Paid By</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{formatDate(e.date)}</TableCell>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>{e.categoryName}</TableCell>
                      <TableCell>{e.sheetLabel}</TableCell>
                      <TableCell>{e.paidByName || "-"}</TableCell>
                      <TableCell>{e.vendor || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {expenses.length > 0 && (
                <TableBody>
                  <TableRow className="border-t-2 font-medium">
                    <TableCell colSpan={6}>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                  </TableRow>
                </TableBody>
              )}
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
