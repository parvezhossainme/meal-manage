"use client"

import { useState, useEffect } from "react"
import { getDashboardStatsAction } from "@/actions/calculations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PiggyBank,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Banknote,
  ArrowDownToLine,
  Scale,
} from "lucide-react"
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

interface DashboardData {
  currentMonth: string
  currentMonthLabel: string
  sheetId: string
  locked: boolean
  mealRate: number
  mealRateWithDefaults: number
  totalMeals: number
  totalDefaultMeals: number
  totalMealsWithDefaults: number
  totalExpenses: number
  totalFunds: number
  totalOpening: number
  activeMembers: number
  guestMeals: number
  outstandingBalance: number
  extraCostPerMember: number
  extraCostFromEntries: number
  extraCostPerMemberFromEntries: number
  expenseByCategory: Record<string, number>
  members: MemberRow[]
  sheets: Array<{ id: string; label: string; month: number; year: number }>
}

function GiveTakeBadge({ balance }: { balance: number }) {
  if (balance > 0) {
    return (
      <Badge variant="outline" className="gap-1 border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
        
        <span className="font-bold">+ {Math.round(balance)} BDT</span>
      </Badge>
    )
  }
  if (balance < 0) {
    return (
      <Badge variant="outline" className="gap-1 border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
        
        <span className="font-bold">- {Math.round(Math.abs(balance))} BDT</span>
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      Settled
    </Badge>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStatsAction().then((result) => {
      if (result.stats) {
        setData(result.stats as DashboardData)
      }
      setLoading(false)
    })
  }, [])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">No monthly sheet found. Create one to get started.</p>
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
    <div className="space-y-6">
      

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
            <Banknote className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalOpening)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Funds</CardTitle>
            <PiggyBank className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalFunds)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownToLine className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <Scale className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.outstandingBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(data.outstandingBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="sticky top-0 px-3 py-3 text-left font-medium text-muted-foreground">Member</th>
                  <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">Opening</th>
                  <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">Deposit</th>
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
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(member.openingBalance)}</td>
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
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(totalRow.openingBalance)}</td>
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

    </div>
  )
}
