"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { getYearlySummaryAction } from "@/actions/reports"

interface MonthSummary {
  month: number
  monthLabel: string
  sheetExists: boolean
  sheetId?: string
  locked?: boolean
  totalMeals: number
  guestMeals: number
  mainExpenses: number
  mealRate: number
  totalFunds: number
  memberCount: number
}

export default function YearlySummaryPage() {
  const router = useRouter()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [summaries, setSummaries] = useState<MonthSummary[]>([])
  const [totals, setTotals] = useState({ totalMeals: 0, guestMeals: 0, mainExpenses: 0, totalFunds: 0, mealRate: 0 })
  const [loading, setLoading] = useState(false)

  const years = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i),
  [])

  const fetchData = async () => {
    setLoading(true)
    const res = await getYearlySummaryAction(parseInt(selectedYear))
    setLoading(false)
    if (res.summaries) {
      setSummaries(res.summaries)
      setTotals(res.totals)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [selectedYear])

  const handleExportCSV = () => {
    const headers = ["Month", "Members", "Total Meals", "Guest Meals", "Main Expenses", "Meal Rate", "Total Funds"]
    const rows = summaries.map(s => [
      s.monthLabel,
      s.memberCount.toString(),
      s.totalMeals.toFixed(1),
      s.guestMeals.toFixed(1),
      s.mainExpenses.toFixed(2),
      s.mealRate.toFixed(2),
      s.totalFunds.toFixed(2),
    ])
    rows.push(["TOTAL", "", totals.totalMeals.toFixed(1), totals.guestMeals.toFixed(1), totals.mainExpenses.toFixed(2), totals.mealRate.toFixed(2), totals.totalFunds.toFixed(2)])
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `yearly-summary-${selectedYear}.csv`
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
          <h1 className="text-2xl font-semibold tracking-tight">Yearly Summary</h1>
          <p className="text-sm text-muted-foreground">Yearly aggregation and statistics</p>
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
          <CardTitle>Select Year</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedYear} onValueChange={(v: string | null) => { if (v) setSelectedYear(v) }}>
            <SelectTrigger className="w-full sm:w-50">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Meals</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-2xl font-semibold">{totals.totalMeals.toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Guest Meals</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-2xl font-semibold">{totals.guestMeals.toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Main Expenses</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-2xl font-semibold">{formatCurrency(totals.mainExpenses)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Funds</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-2xl font-semibold">{formatCurrency(totals.totalFunds)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Meal Rate</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-2xl font-semibold">{formatCurrency(totals.mealRate)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Total Meals</TableHead>
                    <TableHead className="text-right">Guest Meals</TableHead>
                    <TableHead className="text-right">Main Expenses</TableHead>
                    <TableHead className="text-right">Meal Rate</TableHead>
                    <TableHead className="text-right">Total Funds</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((s) => (
                    <TableRow key={s.month} className={!s.sheetExists ? "text-muted-foreground" : ""}>
                      <TableCell>
                        <span className="font-medium">{s.monthLabel}</span>
                        {s.locked && <Badge variant="secondary" className="ml-2 text-xs">Locked</Badge>}
                        {!s.sheetExists && <Badge variant="outline" className="ml-2 text-xs">No sheet</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{s.sheetExists ? s.memberCount : "-"}</TableCell>
                      <TableCell className="text-right">{s.sheetExists ? s.totalMeals.toFixed(1) : "-"}</TableCell>
                      <TableCell className="text-right">{s.sheetExists ? s.guestMeals.toFixed(1) : "-"}</TableCell>
                      <TableCell className="text-right">{s.sheetExists ? formatCurrency(s.mainExpenses) : "-"}</TableCell>
                      <TableCell className="text-right">{s.sheetExists ? formatCurrency(s.mealRate) : "-"}</TableCell>
                      <TableCell className="text-right">{s.sheetExists ? formatCurrency(s.totalFunds) : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableBody>
                  <TableRow className="border-t-2 font-medium">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right"></TableCell>
                    <TableCell className="text-right">{totals.totalMeals.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{totals.guestMeals.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.mainExpenses)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.mealRate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.totalFunds)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
