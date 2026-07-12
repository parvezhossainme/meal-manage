"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { getCarryForwardAction } from "@/actions/reports"

interface CarryRow {
  id: string
  memberName: string
  amount: number
  sheetLabel: string
  sourceSheetLabel: string
  createdAt: Date
}

export default function CarryForwardPage() {
  const router = useRouter()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [balances, setBalances] = useState<CarryRow[]>([])
  const [loading, setLoading] = useState(false)

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  const fetchData = async () => {
    setLoading(true)
    const res = await getCarryForwardAction(selectedYear ? parseInt(selectedYear) : undefined)
    setLoading(false)
    if (res.balances) setBalances(res.balances)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [selectedYear])

  const totalAmount = balances.reduce((s, b) => s + b.amount, 0)

  const handleExportCSV = () => {
    const headers = ["Member", "Amount", "Sheet", "Carried From", "Date"]
    const rows = balances.map(b => [
      b.memberName,
      b.amount.toFixed(2),
      b.sheetLabel,
      b.sourceSheetLabel,
      formatDate(b.createdAt),
    ])
    rows.push(["TOTAL", totalAmount.toFixed(2)])
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "carry-forward.csv"
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
          <h1 className="text-2xl font-semibold tracking-tight">Carry Forward Report</h1>
          <p className="text-sm text-muted-foreground">Opening balances carried between months</p>
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
          <CardTitle>Filter by Year</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedYear} onValueChange={(v: string | null) => { if (v) setSelectedYear(v) }}>
            <SelectTrigger className="w-full sm:w-50">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!loading && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Sheet</TableHead>
                  <TableHead>Carried From</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No carry forward records found
                    </TableCell>
                  </TableRow>
                ) : (
                  balances.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.memberName}</TableCell>
                      <TableCell>{b.sheetLabel}</TableCell>
                      <TableCell>{b.sourceSheetLabel}</TableCell>
                      <TableCell>{formatDate(b.createdAt)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(b.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {balances.length > 0 && (
                <TableBody>
                  <TableRow className="border-t-2 font-medium">
                    <TableCell colSpan={4}>TOTAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
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
