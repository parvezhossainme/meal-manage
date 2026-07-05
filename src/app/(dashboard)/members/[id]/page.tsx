"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getMemberDashboardAction } from "@/actions/public";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    RefreshCw,
    ShoppingCart,
    DollarSign,
    ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

interface ShoppingEntry {
    id: string;
    date: string;
    totalCost: number;
    details: string | null;
    purchasedBy: { id: string; name: string };
}

interface ExtraCostEntry {
    id: string;
    date: string;
    description: string;
    totalCost: number;
}

interface MemberStats {
    currentMonthLabel: string;
    sheetId: string;
    memberId: string;
    memberName: string;
    mealRate: number;
    totalMeals: number;
    totalExpenses: number;
    totalFunds: number;
    totalBazar: number;
    totalOpening: number;
    totalAllFunds: number;
    totalExtraCostEntries: number;
    openingBalance: number;
    activeMembers: number;
    guestMeals: number;
    outstandingBalance: number;
    extraCostPerMember: number;
    combinedExtraCostPerMember: number;
    expenseByCategory: Record<string, number>;
    mealCost: number;
    totalCost: number;
    balance: number;
    deposits: number;
}

const COLORS = [
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
];

export default function MemberDashboardPage() {
    const params = useParams();
    const memberId = params.id as string;

    const [stats, setStats] = useState<MemberStats | null>(null);
    const [shopping, setShopping] = useState<ShoppingEntry[] | null>(null);
    const [extraCosts, setExtraCosts] = useState<ExtraCostEntry[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await getMemberDashboardAction(memberId);
        if (result.error) {
            setError(result.error);
        } else if (result.stats) {
            setStats(result.stats as MemberStats);
            setShopping((result.shopping as unknown as ShoppingEntry[]) ?? null);
            setExtraCosts((result.extraCostEntries as unknown as ExtraCostEntry[]) ?? null);
        }
        setLoading(false);
    }, [memberId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    function GiveTakeBadge({ balance }: { balance: number }) {
        if (balance > 0) {
            return (
                <Badge
                    variant="outline"
                    className="gap-1 border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 dark:border-green-800 text-sm px-3 py-1.5"
                >
                    <span className="font-bold">
                        +{formatCurrency(balance)}
                    </span>
                </Badge>
            );
        }
        if (balance < 0) {
            return (
                <Badge
                    variant="outline"
                    className="gap-1 border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400 dark:border-red-800 text-sm px-3 py-1.5"
                >
                    <span className="font-bold">{formatCurrency(balance)}</span>
                </Badge>
            );
        }
        return (
            <Badge variant="secondary" className="gap-1 text-sm px-3 py-1.5">
                Settled
            </Badge>
        );
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="size-9 rounded-full" />
                    <div>
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-32 mt-1" />
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <Skeleton className="h-4 w-20 mb-2" />
                                <Skeleton className="h-7 w-28" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" onClick={loadData}>
                    <RefreshCw className="mr-2 size-4" />
                    Retry
                </Button>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
                <p>No data available</p>
            </div>
        );
    }

    const expenseData = Object.entries(stats.expenseByCategory).map(
        ([name, value]) => ({ name, value }),
    );
    const extraCostTotal = extraCosts?.reduce((sum, c) => sum + c.totalCost, 0) ?? 0;
    const chartData = [
        ...expenseData,
        ...(extraCostTotal > 0 ? [{ name: "Extra Costs", value: extraCostTotal }] : []),
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/members">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="size-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {stats.memberName}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {stats.currentMonthLabel} &middot; Member Dashboard
                    </p>
                </div>
                <Link href="/">
                    <Button variant="outline" size="sm" className="gap-1.5">
                        <ExternalLink className="size-3.5" />
                        Public Dashboard
                    </Button>
                </Link>
                <GiveTakeBadge balance={stats.balance} />
            </div>

            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                <Card>
                    <CardHeader className="pb-1 px-3 pt-3">
                        <CardTitle className="text-[10px] font-medium text-muted-foreground">Meal Rate</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                        <p className="text-lg font-bold">{formatCurrency(stats.mealRate)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 px-3 pt-3">
                        <CardTitle className="text-[10px] font-medium text-muted-foreground">Total Bazar</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                        <p className="text-lg font-bold">{formatCurrency(stats.totalBazar)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 px-3 pt-3">
                        <CardTitle className="text-[10px] font-medium text-muted-foreground">Total Expenses</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                        <p className="text-lg font-bold">{formatCurrency(stats.totalExpenses)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 px-3 pt-3">
                        <CardTitle className="text-[10px] font-medium text-muted-foreground">Total Funds</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                        <p className="text-lg font-bold">{formatCurrency(stats.totalAllFunds)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 px-3 pt-3">
                        <CardTitle className="text-[10px] font-medium text-muted-foreground">Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                        <p className={`text-lg font-bold ${stats.outstandingBalance >= 0 ? "text-green-600" : "text-destructive"}`}>
                            {formatCurrency(stats.outstandingBalance)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <hr className="border-t border-border" />

            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                <Card>
                    <CardHeader className="pb-1 px-3 pt-3">
                        <CardTitle className="text-[10px] font-medium text-muted-foreground">My Meals</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                        <p className="text-lg font-bold">{stats.totalMeals.toFixed(1)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 px-3 pt-3">
                        <CardTitle className="text-[10px] font-medium text-muted-foreground">Meal Cost</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                        <p className="text-lg font-bold">{formatCurrency(stats.mealCost)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 px-3 pt-3">
                        <CardTitle className="text-[10px] font-medium text-muted-foreground">Total Cost</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                        <p className="text-lg font-bold">{formatCurrency(stats.totalCost)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 px-3 pt-3">
                        <CardTitle className="text-[10px] font-medium text-muted-foreground">My Deposits</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                        <p className="text-lg font-bold">{formatCurrency(stats.openingBalance + stats.deposits)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Carried {formatCurrency(stats.openingBalance)} + Deposited {formatCurrency(stats.deposits)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 px-3 pt-3">
                        <CardTitle className="text-[10px] font-medium text-muted-foreground">Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3">
                        <p className={`text-lg font-bold ${stats.balance >= 0 ? "text-green-600" : "text-destructive"}`}>
                            {formatCurrency(stats.balance)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">
                            My Expenses Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {expenseData.map((cat) => (
                                <div
                                    key={cat.name}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span>{cat.name}</span>
                                    <span className="font-medium tabular-nums">
                                        {formatCurrency(cat.value)}
                                    </span>
                                </div>
                            ))}
                            {extraCosts && extraCosts.length > 0 && (
                                <>
                                    <div className="border-t pt-2 mt-2" />
                                    {extraCosts.map((c) => (
                                        <div
                                            key={c.id}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <span className="text-muted-foreground">{c.description}</span>
                                            <span className="font-medium tabular-nums">
                                                {formatCurrency(c.totalCost)}
                                            </span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">
                            Expenses & Extra Costs by Category
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        {chartData.length > 0 ?
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, percent }) =>
                                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                                        }
                                    >
                                        {chartData.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={COLORS[i % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) =>
                                            formatCurrency(Number(value) || 0)
                                        }
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        :   <p className="text-sm text-muted-foreground py-8">
                                No expense data
                            </p>
                        }
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <dt className="text-muted-foreground">My Meals</dt>
                            <dd className="font-medium">
                                {stats.totalMeals.toFixed(1)}
                            </dd>
                        </div>
                        <div className="flex justify-between text-sm">
                            <dt className="text-muted-foreground">
                                Meal Cost (@ {formatCurrency(stats.mealRate)})
                            </dt>
                            <dd className="font-medium">
                                {formatCurrency(stats.mealCost)}
                            </dd>
                        </div>
                        <div className="flex justify-between text-sm">
                            <dt className="text-muted-foreground">
                                Extra Cost (shared)
                            </dt>
                            <dd className="font-medium">
                                {formatCurrency(stats.combinedExtraCostPerMember)}
                            </dd>
                        </div>
                        <div className="flex justify-between text-sm">
                            <dt className="text-muted-foreground">
                                Total Cost
                            </dt>
                            <dd className="font-medium">
                                {formatCurrency(stats.totalCost)}
                            </dd>
                        </div>
                        <div className="flex justify-between text-sm">
                            <dt className="text-muted-foreground">
                                Opening Balance
                            </dt>
                            <dd className="font-medium">
                                {formatCurrency(stats.openingBalance)}
                            </dd>
                        </div>
                        <div className="flex justify-between text-sm">
                            <dt className="text-muted-foreground">
                                Carried + Deposits
                            </dt>
                            <dd className="font-medium">
                                {formatCurrency(stats.openingBalance + stats.deposits)}
                            </dd>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground pl-4">
                            <dt>Carried / Deposited</dt>
                            <dd>{formatCurrency(stats.openingBalance)} / {formatCurrency(stats.deposits)}</dd>
                        </div>
                        <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                            <dt>Balance</dt>
                            <dd
                                className={
                                    stats.balance >= 0 ?
                                        "text-green-600"
                                    :   "text-destructive"
                                }
                            >
                                {formatCurrency(stats.balance)}
                            </dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShoppingCart className="size-4" />
                            Bazar Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {shopping && shopping.length > 0 ?
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-2 py-2 text-left font-medium">Date</th>
                                            <th className="px-2 py-2 text-left font-medium">Items</th>
                                            <th className="px-2 py-2 text-left font-medium">Who</th>
                                            <th className="px-2 py-2 text-right font-medium">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shopping.map((s) => (
                                            <tr key={s.id} className="border-b hover:bg-muted/20">
                                                <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                                                    {formatDateShort(s.date)}
                                                </td>
                                                <td className="px-2 py-1.5 truncate text-muted-foreground" title={s.details ?? ""}>
                                                    {s.details || "—"}
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap">{s.purchasedBy.name}</td>
                                                <td className="px-2 py-1.5 text-right tabular-nums font-medium whitespace-nowrap">
                                                    {Math.round(s.totalCost)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t bg-muted/30 font-medium">
                                            <td className="px-2 py-2" colSpan={3}>Total Bazar</td>
                                            <td className="px-2 py-2 text-right tabular-nums">
                                                {Math.round(shopping.reduce((s, x) => s + x.totalCost, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        :   <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                No bazar entries for this month.
                            </div>
                        }
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <DollarSign className="size-4" />
                            Extra Costs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {extraCosts && extraCosts.length > 0 ?
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-2 py-2 text-left font-medium">Date</th>
                                            <th className="px-2 py-2 text-left font-medium">Description</th>
                                            <th className="px-2 py-2 text-right font-medium">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extraCosts.map((c) => (
                                            <tr key={c.id} className="border-b hover:bg-muted/20">
                                                <td className="px-2 py-1.5 text-muted-foreground">
                                                    {formatDateShort(c.date)}
                                                </td>
                                                <td className="px-2 py-1.5">{c.description}</td>
                                                <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                                                    {formatCurrency(c.totalCost)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t bg-muted/30 font-medium">
                                            <td className="px-2 py-2" colSpan={2}>Total Extra Cost</td>
                                            <td className="px-2 py-2 text-right tabular-nums">
                                                {formatCurrency(extraCosts.reduce((s, x) => s + x.totalCost, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        :   <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                No extra costs for this month.
                            </div>
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
