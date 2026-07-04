"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getSheetsAction, getSheetAction } from "@/actions/sheets"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ExternalLink, UtensilsCrossed, Users, DollarSign, PiggyBank, BarChart3 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
// import { toast } from "sonner"

interface SheetDetail {
  id: string
  month: number
  year: number
  label: string
  locked: boolean
  createdAt: Date
  openingBalances: Array<{ id: string; amount: number; member: { id: string; name: string } }>
  guestMeals: Array<{ id: string; guestName: string; hostedBy: string; mealCount: number; date: Date }>
  expenses: Array<{ id: string; title: string; amount: number; date: Date; category: { name: string }; paidBy: { name: string } | null }>
  extraCosts: Array<{ id: string; description: string; totalCost: number; date: Date }>
  fundTxns: Array<{ id: string; amount: number; date: Date; member: { name: string }; reference: string | null }>
  mealEntryItems: Array<{ count: number }>
}

interface SheetListItem {
  id: string
  month: number
  year: number
  label: string
}

export default function SheetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sheetId = params.id as string

  const [sheet, setSheet] = useState<SheetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheets, setSheets] = useState<SheetListItem[]>([])

  useEffect(() => {
    Promise.all([
      getSheetAction(sheetId),
      getSheetsAction(),
    ]).then(([result, sheetsResult]) => {
      if (result.error) {
        setError(result.error)
      } else if (result.sheet) {
        setSheet(result.sheet as unknown as SheetDetail)
      }
      if (sheetsResult.sheets) setSheets(sheetsResult.sheets as SheetListItem[])
      setLoading(false)
    })
  }, [sheetId])

  function handleSheetChange(newId: string) {
    router.push(`/sheets/${newId}`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !sheet) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-destructive">{error || "Sheet not found"}</p>
        <Link href="/sheets"><Button variant="outline">Back to Sheets</Button></Link>
      </div>
    )
  }

  const totalMeals = sheet.mealEntryItems.reduce((sum, item) => sum + item.count, 0)
  const totalExpenses = sheet.expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalExtraCosts = sheet.extraCosts.reduce((sum, ec) => sum + ec.totalCost, 0)
  const totalFunds = sheet.fundTxns.reduce((sum, f) => sum + f.amount, 0)
  const guestMealCount = sheet.guestMeals.reduce((sum, g) => sum + g.mealCount, 0)
  const totalOpening = sheet.openingBalances.reduce((sum, ob) => sum + ob.amount, 0)
  const allExpenses = totalExpenses + totalExtraCosts
  const mealRate = totalMeals > 0 ? allExpenses / totalMeals : 0
  const outstanding = totalOpening + totalFunds - allExpenses

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sheets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{sheet.label}</h1>
          <p className="text-sm text-muted-foreground">
            {sheet.locked ? "Locked" : "Active"} &middot; Created {formatDate(sheet.createdAt)}
          </p>
        </div>
        <Badge variant={sheet.locked ? "secondary" : "outline"}>
          {sheet.locked ? "Locked" : "Active"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Switch Month:</Label>
          <Select value={sheet.id} onValueChange={(v: string | null) => { if (v) handleSheetChange(v) }}>
            <SelectTrigger className="w-44">
              <SelectValue>
                {(value: string | null) => sheets.find(s => s.id === value)?.label || value}
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

      <Tabs defaultValue="meals">
        <TabsList>
          <TabsTrigger value="meals"><UtensilsCrossed className="size-4" /> Meals</TabsTrigger>
          <TabsTrigger value="guests"><Users className="size-4" /> Guest Meals</TabsTrigger>
          <TabsTrigger value="expenses"><DollarSign className="size-4" /> Expenses</TabsTrigger>
          <TabsTrigger value="funds"><PiggyBank className="size-4" /> Funds</TabsTrigger>
          <TabsTrigger value="summary"><BarChart3 className="size-4" /> Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Meal Entries</CardTitle>
              <Link href={`/sheets/${sheet.id}/meals`}>
                <Button>
                  <ExternalLink className="size-4" />
                  Full Meal Grid
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Meals</p>
                  <p className="text-xl font-semibold">{totalMeals.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meal Rate</p>
                  <p className="text-xl font-semibold">{formatCurrency(mealRate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guest Meals</p>
                  <p className="text-xl font-semibold">{guestMealCount.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total (Inc. Guests)</p>
                  <p className="text-xl font-semibold">{(totalMeals + guestMealCount).toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guests" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Guest Meals</CardTitle></CardHeader>
            <CardContent>
              {sheet.guestMeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No guest meals recorded</p>
              ) : (
                <div className="space-y-2">
                  {sheet.guestMeals.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <span className="font-medium">{g.guestName}</span>
                        <span className="text-muted-foreground"> hosted by {g.hostedBy}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{g.mealCount}</span>
                        <span className="text-muted-foreground"> meals</span>
                        <br />
                        <span className="text-xs text-muted-foreground">{formatDate(g.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
            <CardContent>
              {sheet.expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses recorded</p>
              ) : (
                <div className="space-y-2">
                  {sheet.expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <span className="font-medium">{e.title}</span>
                        <span className="text-muted-foreground"> ({e.category?.name})</span>
                        {e.paidBy && <span className="text-muted-foreground"> &middot; Paid by {e.paidBy.name}</span>}
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(e.amount)}</span>
                        <br />
                        <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sheet.extraCosts.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Extra Costs</p>
                  {sheet.extraCosts.map((ec) => (
                    <div key={ec.id} className="flex items-center justify-between rounded-lg border border-dashed p-3 text-sm">
                      <div>
                        <span className="font-medium">{ec.description}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(ec.totalCost)}</span>
                        <br />
                        <span className="text-xs text-muted-foreground">{formatDate(ec.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-between border-t pt-3 text-sm font-medium">
                <span>Total</span>
                <span>{formatCurrency(allExpenses)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funds" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Fund Transactions</CardTitle></CardHeader>
            <CardContent>
              {sheet.fundTxns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fund transactions recorded</p>
              ) : (
                <div className="space-y-2">
                  {sheet.fundTxns.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <span className="font-medium">{f.member?.name}</span>
                        {f.reference && <span className="text-muted-foreground"> ({f.reference})</span>}
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(f.amount)}</span>
                        <br />
                        <span className="text-xs text-muted-foreground">{formatDate(f.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-between border-t pt-3 text-sm font-medium">
                <span>Total</span>
                <span>{formatCurrency(totalFunds)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Monthly Summary</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">Total Meals</dt>
                  <dd className="font-medium">{totalMeals.toFixed(1)}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">Guest Meals</dt>
                  <dd className="font-medium">{guestMealCount.toFixed(1)}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">Total Expenses</dt>
                  <dd className="font-medium">{formatCurrency(allExpenses)}</dd>
                </div>
                {totalExtraCosts > 0 && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground text-xs pl-4">Incl. extra costs</dt>
                    <dd className="font-medium text-xs text-muted-foreground">{formatCurrency(totalExtraCosts)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">Total Funds</dt>
                  <dd className="font-medium">{formatCurrency(totalFunds)}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">Opening Balance</dt>
                  <dd className="font-medium">{formatCurrency(totalOpening)}</dd>
                </div>
                <div className="flex justify-between border-t pt-3 text-sm">
                  <dt className="font-medium">Meal Rate</dt>
                  <dd className="font-semibold">{formatCurrency(mealRate)}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="font-medium">Outstanding</dt>
                  <dd className={`font-semibold ${outstanding >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {formatCurrency(outstanding)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
