"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getShoppingAction, getShoppingSummaryAction, deleteShoppingAction } from "@/actions/shopping"
import { getSheetsListAction } from "@/actions/reports"
import { getCurrentUserAction } from "@/actions/auth"
import { createBazarRequestAction, getMyBazarRequestsAction, getBazarRequestsAction, approveBazarRequestAction, rejectBazarRequestAction } from "@/actions/bazar-requests"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ShoppingCart, Trash2, Store, Plus, FileText, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"
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

interface BazarRequestItem {
  id: string
  date: string
  totalCost: number
  details: string | null
  status: string
  rejectReason: string | null
  createdAt: string
  member: { id: string; name: string }
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
  const [requests, setRequests] = useState<BazarRequestItem[]>([])
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split("T")[0])
  const [requestCost, setRequestCost] = useState("")
  const [requestDetails, setRequestDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejectDialog, setRejectDialog] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejecting, setRejecting] = useState(false)

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

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "MANAGER"

  const fetchRequests = useCallback(async (sheetId: string) => {
    if (isAdmin) {
      const res = await getBazarRequestsAction(sheetId)
      if (res.requests) setRequests(res.requests as unknown as BazarRequestItem[])
    } else {
      const res = await getMyBazarRequestsAction(sheetId)
      if (res.requests) setRequests(res.requests as unknown as BazarRequestItem[])
    }
  }, [isAdmin])

  useEffect(() => {
    fetchUser()
    fetchSheets()
  }, [fetchUser, fetchSheets])

  useEffect(() => {
    if (sheets.length > 0 && !selectedSheetId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedSheetId(sheets[0].id)
    }
  }, [sheets, selectedSheetId])

  useEffect(() => {
    if (selectedSheetId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData(selectedSheetId)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchRequests(selectedSheetId)
    }
  }, [selectedSheetId, fetchData, fetchRequests])

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

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSheetId) return
    setSubmitting(true)
    const result = await createBazarRequestAction({
      monthlySheetId: selectedSheetId,
      date: requestDate,
      totalCost: parseFloat(requestCost),
      details: requestDetails || undefined,
    })
    setSubmitting(false)
    if (result.success) {
      setRequestOpen(false)
      setRequestCost("")
      setRequestDetails("")
      setRequestDate(new Date().toISOString().split("T")[0])
      fetchRequests(selectedSheetId)
    } else {
      alert(result.error || "Failed to submit request")
    }
  }

  const handleApprove = async (id: string) => {
    setApproving(id)
    const result = await approveBazarRequestAction(id)
    setApproving(null)
    if (result.success) {
      if (selectedSheetId) {
        fetchData(selectedSheetId)
        fetchRequests(selectedSheetId)
      }
    } else {
      alert(result.error || "Failed to approve request")
    }
  }

  const handleReject = async () => {
    if (!rejectDialog) return
    setRejecting(true)
    const result = await rejectBazarRequestAction(rejectDialog, rejectReason || undefined)
    setRejecting(false)
    setRejectDialog(null)
    setRejectReason("")
    if (result.success) {
      if (selectedSheetId) fetchRequests(selectedSheetId)
    } else {
      alert(result.error || "Failed to reject request")
    }
  }

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
          {isAdmin ? (
            <Button onClick={() => router.push("/shopping/create")}>
              <Plus className="size-4" />
              Add Entry
            </Button>
          ) : (
            <Button onClick={() => setRequestOpen(true)}>
              <Clock className="size-4" />
              Request Entry
            </Button>
          )}
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

      {/* Pending Requests */}
      {requests.filter((r) => r.status === "PENDING").length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Clock className="size-4" />
              Pending Requests ({requests.filter((r) => r.status === "PENDING").length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {requests.filter((r) => r.status === "PENDING").map((req) => (
                <div key={req.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{req.member.name}</span>
                    <span className="text-muted-foreground ml-2">{formatCurrency(req.totalCost)}</span>
                    {req.details && <span className="text-muted-foreground ml-2 text-xs">— {req.details}</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {isAdmin && (
                      <>
                        <Button size="sm" variant="outline" className="h-8 text-green-600 border-green-300 hover:bg-green-50" disabled={approving === req.id} onClick={() => handleApprove(req.id)}>
                          {approving === req.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-300 hover:bg-red-50" onClick={() => setRejectDialog(req.id)}>
                          <XCircle className="size-3" />
                          Reject
                        </Button>
                      </>
                    )}
                    {!isAdmin && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        <Clock className="size-3 mr-1" /> Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && shopping.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium">No bazar entries</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">No entries found for the selected month.</p>
          {isAdmin ? (
            <Button onClick={() => router.push("/shopping/create")}>
              <Plus className="size-4" />
              Add First Entry
            </Button>
          ) : (
            <Button onClick={() => setRequestOpen(true)}>
              <Clock className="size-4" />
              Request Entry
            </Button>
          )}
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

      {/* Request Entry Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Bazar Entry</DialogTitle>
            <DialogDescription>Submit a bazar entry request for admin approval.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="req-date">Date</Label>
              <Input id="req-date" type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-cost">Total Cost</Label>
              <Input id="req-cost" type="number" step="0.01" min="0.01" value={requestCost} onChange={(e) => setRequestCost(e.target.value)} placeholder="e.g. 500" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-details">Details (optional)</Label>
              <Textarea id="req-details" value={requestDetails} onChange={(e) => setRequestDetails(e.target.value)} placeholder="What was purchased?" rows={2} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => { if (!o) { setRejectDialog(null); setRejectReason("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Optionally provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this being rejected?" rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason("") }}>Cancel</Button>
              <Button variant="destructive" disabled={rejecting} onClick={handleReject}>
                {rejecting ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
