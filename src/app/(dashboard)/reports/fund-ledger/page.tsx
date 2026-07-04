"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { getFundLedgerAction, getSheetsListAction, getMembersListAction } from "@/actions/reports"

interface FundRow {
  id: string
  date: Date
  amount: number
  memberName: string
  sheetLabel: string
  paymentMethod: string | null
  reference: string | null
  remarks: string | null
}

export default function FundLedgerPage() {
  const router = useRouter()
  const [sheets, setSheets] = useState<{ id: string; label: string }[]>([])
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [selectedSheet, setSelectedSheet] = useState("all")
  const [selectedMember, setSelectedMember] = useState("all")
  const [funds, setFunds] = useState<FundRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      getSheetsListAction(),
      getMembersListAction(),
    ]).then(([sRes, mRes]) => {
      if (sRes.sheets) setSheets(sRes.sheets)
      if (mRes.members) setMembers(mRes.members)
    })
  }, [])

  useEffect(() => {
    fetchData()
  }, [selectedSheet, selectedMember])

  const fetchData = async () => {
    setLoading(true)
    const params: { sheetId?: string; memberId?: string } = {}
    if (selectedSheet !== "all") params.sheetId = selectedSheet
    if (selectedMember !== "all") params.memberId = selectedMember
    const res = await getFundLedgerAction(params)
    setLoading(false)
    if (res.funds) {
      setFunds(res.funds)
      setTotal(res.total)
    }
  }

  const handleExportCSV = () => {
    const headers = ["Date", "Member", "Amount", "Sheet", "Payment Method", "Reference", "Remarks"]
    const rows = funds.map(f => [
      formatDate(f.date),
      f.memberName,
      f.amount.toFixed(2),
      f.sheetLabel,
      f.paymentMethod || "",
      f.reference || "",
      f.remarks || "",
    ])
    rows.push(["TOTAL", "", total.toFixed(2)])
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "fund-ledger.csv"
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
          <h1 className="text-2xl font-semibold tracking-tight">Fund Ledger</h1>
          <p className="text-sm text-muted-foreground">Detailed fund transaction history</p>
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
          <div className="flex-1 min-w-[200px]">
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
          <div className="flex-1 min-w-[200px]">
            <Select value={selectedMember} onValueChange={(v: string | null) => { if (v) setSelectedMember(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="All Members">
                  {(value: string | null) => {
                    if (!value) return null
                    if (value === "all") return "All Members"
                    return members.find(m => m.id === value)?.name || value
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
                  <TableHead>Member</TableHead>
                  <TableHead>Sheet</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No fund transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  funds.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{formatDate(f.date)}</TableCell>
                      <TableCell className="font-medium">{f.memberName}</TableCell>
                      <TableCell>{f.sheetLabel}</TableCell>
                      <TableCell>{f.paymentMethod || "-"}</TableCell>
                      <TableCell>{f.reference || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(f.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {funds.length > 0 && (
                <TableBody>
                  <TableRow className="border-t-2 font-medium">
                    <TableCell colSpan={5}>TOTAL</TableCell>
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
