"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { getGuestReportAction, getSheetsListAction } from "@/actions/reports"

interface GuestRow {
  id: string
  date: Date
  guestName: string
  hostedBy: string
  mealCount: number
  remarks: string | null
  sheetLabel: string
}

export default function GuestReportPage() {
  const router = useRouter()
  const [sheets, setSheets] = useState<{ id: string; label: string }[]>([])
  const [selectedSheet, setSelectedSheet] = useState("all")
  const [guests, setGuests] = useState<GuestRow[]>([])
  const [totalMeals, setTotalMeals] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getSheetsListAction().then(res => {
      if (res.sheets) setSheets(res.sheets)
    })
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const sheetId = selectedSheet !== "all" ? selectedSheet : undefined
    const res = await getGuestReportAction(sheetId)
    setLoading(false)
    if (res.guestMeals) {
      setGuests(res.guestMeals)
      setTotalMeals(res.totalMeals)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [selectedSheet])

  const handleExportCSV = () => {
    const headers = ["Date", "Guest Name", "Hosted By", "Sheet", "Meals", "Remarks"]
    const rows = guests.map(g => [
      formatDate(g.date),
      g.guestName,
      g.hostedBy,
      g.sheetLabel,
      g.mealCount.toFixed(1),
      g.remarks || "",
    ])
    rows.push(["TOTAL", "", "", "", totalMeals.toFixed(1)])
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "guest-report.csv"
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
          <h1 className="text-2xl font-semibold tracking-tight">Guest Report</h1>
          <p className="text-sm text-muted-foreground">Guest meal summary and details</p>
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
          <CardTitle>Filter by Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSheet} onValueChange={(v: string | null) => { if (v) setSelectedSheet(v) }}>
            <SelectTrigger className="w-full sm:w-[300px]">
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
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Guest Visits</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-2xl font-semibold">{guests.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Guest Meals</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-2xl font-semibold">{totalMeals.toFixed(1)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Hosted By</TableHead>
                    <TableHead>Sheet</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Meals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No guest meals found
                      </TableCell>
                    </TableRow>
                  ) : (
                    guests.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>{formatDate(g.date)}</TableCell>
                        <TableCell className="font-medium">{g.guestName}</TableCell>
                        <TableCell>{g.hostedBy}</TableCell>
                        <TableCell>{g.sheetLabel}</TableCell>
                        <TableCell className="text-muted-foreground">{g.remarks || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{g.mealCount.toFixed(1)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {guests.length > 0 && (
                  <TableBody>
                    <TableRow className="border-t-2 font-medium">
                      <TableCell colSpan={5}>TOTAL</TableCell>
                      <TableCell className="text-right">{totalMeals.toFixed(1)}</TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
