"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getShoppingAction, getShoppingSummaryAction, deleteShoppingAction } from "@/actions/shopping"
import { getSheetsListAction } from "@/actions/reports"
import { getCurrentUserAction } from "@/actions/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ShoppingCart, Trash2, Store, Plus, FileText } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ShoppingEntry {
  id: string
  date: Date | string
  totalCost: number
  details: string | null
  purchasedBy: { name: string } | null
}

interface ShoppingSummary {
  totalShopping: number
  entryCount: number
  topShopper: string
  largestPurchase: number
  avgPurchase: number
}

interface SheetOption {
  id: string
  label: string
  month: number
  year: number
}

export default function BazarListPage() {
  const router = useRouter()
  const [sheets, setSheets] = useState<SheetOption[]>([])
  const [selectedSheetId, setSelectedSheetId] = useState("")
  const [shopping, setShopping] = useState<ShoppingEntry[]>([])
  const [summary, setSummary] = useState<ShoppingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    const result = await getCurrentUserAction()
    if (result.user) {
      setUserRole(result.user.role)
    }
  }, [])

  const fetchSheets = useCallback(async () => {
    const result = await getSheetsListAction()
    if (result.sheets) {
      setSheets(result.sheets)
    }
  }, [])

  const fetchData = useCallback(async (sheetId: string) => {
    setLoading(true)
    const [shoppingRes, summaryRes] = await Promise.all([
      getShoppingAction(sheetId),
      getShoppingSummaryAction(sheetId),
    ])
    if (shoppingRes.shopping) setShopping(shoppingRes.shopping as unknown as ShoppingEntry[])
    if (summaryRes.summary) setSummary(summaryRes.summary as ShoppingSummary)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUser()
    fetchSheets()
  }, [fetchUser, fetchSheets])

  useEffect(() => {
    if (sheets.length > 0 && !selectedSheetId) {
      setSelectedSheetId(sheets[0].id)
    }
  }, [sheets, selectedSheetId])

  useEffect(() => {
    if (selectedSheetId) {
      fetchData(selectedSheetId)
    }
  }, [selectedSheetId, fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bazar entry?")) return
    setDeleting(id)
    const result = await deleteShoppingAction(id)
    setDeleting(null)
    if (result.success) {
      if (selectedSheetId) fetchData(selectedSheetId)
    } else {
      alert(result.error || "Failed to delete entry")
    }
  }

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "MANAGER"

  if (loading && shopping.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bazar List</h1>
          <p className="text-sm text-muted-foreground">Manage monthly bazar entries</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedSheetId} onValueChange={(v: string | null) => { if (v) setSelectedSheetId(v) }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select month">
                {(value: string | null) => value ? (sheets.find(s => s.id === value)?.label || value) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sheets.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => router.push("/shopping/create")}>
            <Plus className="size-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bazar</CardTitle>
              <ShoppingCart className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalShopping)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <ShoppingCart className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.entryCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Shopper</CardTitle>
              <Store className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{summary.topShopper}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Largest Purchase</CardTitle>
              <ShoppingCart className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.largestPurchase)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Purchase</CardTitle>
              <ShoppingCart className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.avgPurchase)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && shopping.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium">No bazar entries</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">No entries found for the selected month.</p>
          <Button onClick={() => router.push("/shopping/create")}>
            <Plus className="size-4" />
            Add First Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {shopping.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{formatDate(entry.date)}</Badge>
                      <Badge variant="outline" className="gap-1">
                        <Store className="size-3" />
                        {entry.purchasedBy?.name || "Unknown"}
                      </Badge>
                    </div>
                    {entry.details && (
                      <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <FileText className="size-3.5 mt-0.5 shrink-0" />
                        <span>{entry.details}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-lg font-semibold tabular-nums">{formatCurrency(entry.totalCost)}</div>
                    {isAdmin && (
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        disabled={deleting === entry.id}
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
