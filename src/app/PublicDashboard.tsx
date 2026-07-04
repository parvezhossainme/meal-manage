"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getPublicDashboardAction } from "@/actions/public"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button, buttonVariants } from "@/components/ui/button"
import { UtensilsCrossed, DollarSign, Users, Coffee, PiggyBank, TrendingUp, UserCheck, BarChart3, PieChart as PieChartIcon } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts"

interface MemberRow {
  memberId: string
  memberName: string
  openingBalance: number
  totalMeals: number
  mealCost: number
  extraCost: number
  extraCostEntries: number
  totalCost: number
  deposits: number
  balance: number
  mealRate: number
}

interface PublicStats {
  currentMonthLabel: string
  sheetId: string
  mealRate: number
  totalMeals: number
  totalExpenses: number
  totalFunds: number
  totalOpening: number
  activeMembers: number
  guestMeals: number
  outstandingBalance: number
  extraCostPerMember: number
  expenseByCategory: Record<string, number>
  members: MemberRow[]
}

function GiveTakeBadge({ balance }: { balance: number }) {
  if (balance > 0) {
    return (
      <Badge variant="outline" className="gap-1 border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
        
        <span className="font-bold">+{formatCurrency(balance)}</span>
      </Badge>
    )
  }
  if (balance < 0) {
    return (
      <Badge variant="outline" className="gap-1 border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
        
        <span className="font-bold">{formatCurrency(balance)}</span>
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      Settled
    </Badge>
  )
}

export default function PublicDashboard() {
  const [data, setData] = useState<PublicStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPublicDashboardAction().then((result) => {
      if (result.error) {
        setError(result.error)
      } else if (result.stats) {
        setData(result.stats as PublicStats)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <div className="flex items-center gap-2 font-semibold">
              <UtensilsCrossed className="size-5" />
              <span>Meal Manage</span>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 p-4 pt-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Failed to load dashboard data.</p>
        {error && <p className="max-w-md text-center text-xs text-red-500">{error}</p>}
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <div className="flex items-center gap-2 text-2xl font-semibold">
          <UtensilsCrossed className="size-7" />
          <span>Meal Manage</span>
        </div>
        <p className="text-muted-foreground">No monthly sheet found. The manager needs to create one.</p>
        <div className="flex gap-3">
          <Link href="/login" className={buttonVariants()}>Login</Link>
          <Link href="/register" className={buttonVariants({ variant: "outline" })}>Register</Link>
        </div>
      </div>
    )
  }

  const totalRow = data.members.reduce(
    (acc, m) => ({
      openingBalance: acc.openingBalance + m.openingBalance,
      deposits: acc.deposits + m.deposits,
      totalMeals: acc.totalMeals + m.totalMeals,
      mealCost: acc.mealCost + m.mealCost,
      extraCost: acc.extraCost + m.extraCost + m.extraCostEntries,
      totalCost: acc.totalCost + m.totalCost,
      balance: acc.balance + m.balance,
    }),
    { openingBalance: 0, deposits: 0, totalMeals: 0, mealCost: 0, extraCost: 0, totalCost: 0, balance: 0 }
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <UtensilsCrossed className="size-5" />
            <span>Meal Manage</span>
          </div>
          <div className="flex gap-2">
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>Login</Link>
            <Link href="/register" className={buttonVariants({ size: "sm" })}>Register</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Latest month &mdash; <span className="font-medium">{data.currentMonthLabel}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Meal Rate</CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.mealRate)}</div>
              <p className="text-xs text-muted-foreground">Per meal cost</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Meals</CardTitle>
              <Coffee className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalMeals.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">{data.guestMeals.toFixed(1)} guest meals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Funds</CardTitle>
              <PiggyBank className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.totalFunds)}</div>
              <p className="text-xs text-muted-foreground">Collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
              <UserCheck className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.activeMembers}</div>
              <p className="text-xs text-muted-foreground">Registered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.totalOpening)}</div>
              <p className="text-xs text-muted-foreground">Carried forward</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Guest Meals</CardTitle>
              <UtensilsCrossed className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.guestMeals.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Visitors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.outstandingBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(data.outstandingBalance)}
              </div>
              <p className="text-xs text-muted-foreground">Net balance</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Member Meals</CardTitle>
              <BarChart3 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.members} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="memberName" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v) => (v ? Number(v).toFixed(1) : "0")} />
                  <Bar dataKey="totalMeals" fill="hsl(221.2 83.2% 53.3%)" radius={[0, 4, 4, 0]} name="Meals" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Member Balance</CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.members} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="memberName" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v || 0))} />
                  <Bar dataKey="balance" fill="hsl(142.1 76.2% 36.3%)" radius={[0, 4, 4, 0]} name="Balance" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expenses by Category</CardTitle>
              <PieChartIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={Object.entries(data.expenseByCategory).map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {Object.keys(data.expenseByCategory).map((_, i) => (
                      <Cell key={i} fill={`hsl(${(i * 360) / Object.keys(data.expenseByCategory).length + 200}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v || 0))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {Object.entries(data.expenseByCategory).map(([name]) => (
                  <span key={name} className="truncate">{name}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Member Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="sticky top-0 px-3 py-3 text-left font-medium text-muted-foreground">Member</th>
                    <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">Opening Balance</th>
                    <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">Total Fund</th>
                    <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">Total Meals</th>
                    <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">Meal Cost</th>
                    <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">Extra Cost</th>
                    <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">Total Cost</th>
                    <th className="sticky top-0 px-3 py-3 text-center font-medium text-muted-foreground">Give / Take</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((member) => (
                    <tr key={member.memberId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3 font-medium">{member.memberName}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(member.openingBalance)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(member.deposits)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{member.totalMeals.toFixed(1)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(member.mealCost)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(member.extraCost + member.extraCostEntries)}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{formatCurrency(member.totalCost)}</td>
                      <td className="px-3 py-3 text-center">
                        <GiveTakeBadge balance={member.balance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-medium">
                    <td className="px-3 py-3">Total</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(totalRow.openingBalance)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(totalRow.deposits)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{totalRow.totalMeals.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(totalRow.mealCost)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(totalRow.extraCost)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(totalRow.totalCost)}</td>
                    <td className="px-3 py-3 text-center">
                      <GiveTakeBadge balance={totalRow.balance} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
