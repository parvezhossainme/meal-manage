"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { getMemberStatementAction, getMembersListAction } from "@/actions/reports"

interface Statement {
  sheetId: string
  sheetLabel: string
  month: number
  year: number
  locked: boolean
  openingBalance: number
  totalMeals: number
  mealCost: number
  extraCost: number
  totalCost: number
  deposits: number
  balance: number
}

export default function MemberStatementPage() {
  const router = useRouter()
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [selectedMember, setSelectedMember] = useState("")
  const [statements, setStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getMembersListAction().then(res => {
      if (res.members) setMembers(res.members)
    })
  }, [])

  const fetchStatement = useCallback(async (memberId: string) => {
    setLoading(true)
    const res = await getMemberStatementAction(memberId)
    setLoading(false)
    if (res.statements) setStatements(res.statements)
  }, [])

  useEffect(() => {
    if (selectedMember) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchStatement(selectedMember)
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatements([])
    }
  }, [selectedMember, fetchStatement])

  const totals = {
    openingBalance: statements.reduce((s, r) => s + r.openingBalance, 0),
    totalMeals: statements.reduce((s, r) => s + r.totalMeals, 0),
    mealCost: statements.reduce((s, r) => s + r.mealCost, 0),
    extraCost: statements.reduce((s, r) => s + r.extraCost, 0),
    totalCost: statements.reduce((s, r) => s + r.totalCost, 0),
    deposits: statements.reduce((s, r) => s + r.deposits, 0),
    balance: statements.reduce((s, r) => s + r.balance, 0),
  }

  const handleExportCSV = () => {
    const headers = ["Month", "Opening Balance", "Total Meals", "Meal Cost", "Extra Cost", "Total Cost", "Deposits", "Balance"]
    const rows = statements.map(r => [
      r.sheetLabel,
      r.openingBalance.toFixed(2),
      r.totalMeals.toFixed(1),
      r.mealCost.toFixed(2),
      r.extraCost.toFixed(2),
      r.totalCost.toFixed(2),
      r.deposits.toFixed(2),
      r.balance.toFixed(2),
    ])
    rows.push(["TOTAL", totals.openingBalance.toFixed(2), totals.totalMeals.toFixed(1), totals.mealCost.toFixed(2), totals.extraCost.toFixed(2), totals.totalCost.toFixed(2), totals.deposits.toFixed(2), totals.balance.toFixed(2)])
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `member-statement-${selectedMember}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/reports")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Member Statement</h1>
          <p className="text-sm text-muted-foreground">Individual member balances and statements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={!selectedMember}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={!selectedMember}>
            <Download className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Member</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedMember} onValueChange={(v: string | null) => { if (v) setSelectedMember(v) }}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Choose a member...">
                {(value: string | null) => value ? (members.find(m => m.id === value)?.name || value) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {members.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {selectedMember && statements.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Meals</TableHead>
                  <TableHead className="text-right">Meal Cost</TableHead>
                  <TableHead className="text-right">Extra Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Deposits</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((r) => (
                  <TableRow key={r.sheetId}>
                    <TableCell>
                      <span className="font-medium">{r.sheetLabel}</span>
                      {r.locked && <Badge variant="secondary" className="ml-2 text-xs">Locked</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.openingBalance)}</TableCell>
                    <TableCell className="text-right">{r.totalMeals.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.mealCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.extraCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.totalCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.deposits)}</TableCell>
                    <TableCell className={`text-right font-medium ${r.balance >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {formatCurrency(r.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-medium">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.openingBalance)}</TableCell>
                  <TableCell className="text-right">{totals.totalMeals.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.mealCost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.extraCost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.totalCost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.deposits)}</TableCell>
                  <TableCell className={`text-right ${totals.balance >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {formatCurrency(totals.balance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedMember && !loading && statements.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No statements found for this member
          </CardContent>
        </Card>
      )}
    </div>
  )
}
