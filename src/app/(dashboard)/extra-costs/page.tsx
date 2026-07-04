"use client"

import { useState, useEffect } from "react"
import { getExtraCostsAction, createExtraCostAction, deleteExtraCostAction } from "@/actions/extra-costs"
import { getSheetsListAction } from "@/actions/reports"
import { getDashboardStatsAction } from "@/actions/calculations"
import { getCurrentUserAction } from "@/actions/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CircleDollarSign, Trash2, Plus } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ExtraCostEntry {
  id: string
  date: Date | string
  description: string
  totalCost: number
}

interface SheetOption {
  id: string
  label: string
  month: number
  year: number
}

export default function ExtraCostsPage() {
  const [sheets, setSheets] = useState<SheetOption[]>([])
  const [selectedSheetId, setSelectedSheetId] = useState("")
  const [costs, setCosts] = useState<ExtraCostEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMemberCount, setActiveMemberCount] = useState(0)
  const [userRole, setUserRole] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)

  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [totalCost, setTotalCost] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "MANAGER"

  useEffect(() => {
    getCurrentUserAction().then((r) => {
      if (r.user) setUserRole(r.user.role)
    })
  }, [])

  useEffect(() => {
    async function load() {
      const result = await getSheetsListAction()
      if (result.sheets) {
        setSheets(result.sheets)
        if (result.sheets.length > 0) setSelectedSheetId(result.sheets[0].id)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedSheetId) return
    Promise.all([
      getExtraCostsAction(selectedSheetId),
      getDashboardStatsAction(selectedSheetId),
    ]).then(([costsRes, statsRes]) => {
      setLoading(false)
      if (costsRes.costs) setCosts(costsRes.costs as unknown as ExtraCostEntry[])
      if (statsRes.stats) setActiveMemberCount(statsRes.stats.activeMembers)
    })
  }, [selectedSheetId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSheetId) return

    const cost = parseFloat(totalCost)
    if (!description.trim()) {
      setFormError("Description is required")
      return
    }
    if (isNaN(cost) || cost <= 0) {
      setFormError("Total cost must be positive")
      return
    }

    setSubmitting(true)
    setFormError("")

    const result = await createExtraCostAction({
      monthlySheetId: selectedSheetId,
      date,
      description: description.trim(),
      totalCost: cost,
    })

    if (result.success) {
      setDescription("")
      setTotalCost("")
      setDate(new Date().toISOString().split("T")[0])
      getExtraCostsAction(selectedSheetId).then((res) => {
        if (res.costs) setCosts(res.costs as unknown as ExtraCostEntry[])
      })
    } else {
      setFormError(result.error || "Failed to create extra cost")
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this extra cost?")) return
    setDeleting(id)
    const result = await deleteExtraCostAction(id)
    setDeleting(null)
    if (result.success && selectedSheetId) {
      getExtraCostsAction(selectedSheetId).then((res) => {
        if (res.costs) setCosts(res.costs as unknown as ExtraCostEntry[])
      })
    } else {
      alert(result.error || "Failed to delete entry")
    }
  }

  const totalExtraCosts = costs.reduce((sum, c) => sum + c.totalCost, 0)

  if (loading && costs.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
          <h1 className="text-2xl font-semibold tracking-tight">Extra Costs</h1>
          <p className="text-sm text-muted-foreground">Manage additional costs shared among members</p>
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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Extra Costs</CardTitle>
            <CircleDollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExtraCosts)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <CircleDollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costs.length}</div>
          </CardContent>
        </Card>
        {costs.length > 0 && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Per Person Share</CardTitle>
                <CircleDollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activeMemberCount > 0 ? formatCurrency(totalExtraCosts / activeMemberCount) : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">split among {activeMemberCount} members</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Largest Entry</CardTitle>
                <CircleDollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(Math.max(...costs.map(c => c.totalCost)))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {isAdmin && selectedSheetId && (
        <Card>
          <CardHeader>
            <CardTitle>Add Extra Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description / Items</Label>
                  <Input
                    id="description"
                    placeholder="e.g. Utility bill, Cleaning supplies"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalCost">Total Cost</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
                    <Input
                      id="totalCost"
                      type="number"
                      step="any"
                      min="0"
                      className="pl-7"
                      placeholder="0.00"
                      value={totalCost}
                      onChange={(e) => setTotalCost(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  <Plus className="size-4" />
                  {submitting ? "Adding..." : "Add Extra Cost"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!loading && costs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CircleDollarSign className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium">No extra costs</h3>
          <p className="text-sm text-muted-foreground mt-1">No extra costs recorded for the selected month.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {costs.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{formatDate(entry.date)}</Badge>
                    </div>
                    <p className="text-sm font-medium">{entry.description}</p>
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
