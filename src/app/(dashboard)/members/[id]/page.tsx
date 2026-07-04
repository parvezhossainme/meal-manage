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
    UtensilsCrossed,
    DollarSign,
    Users,
    Coffee,
    PiggyBank,
    TrendingUp,
    ArrowLeft,
    RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
} from "recharts";

interface MemberStats {
    currentMonthLabel: string;
    sheetId: string;
    memberId: string;
    memberName: string;
    mealRate: number;
    totalMeals: number;
    totalExpenses: number;
    totalFunds: number;
    openingBalance: number;
    activeMembers: number;
    guestMeals: number;
    outstandingBalance: number;
    extraCostPerMember: number;
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
                <GiveTakeBadge balance={stats.balance} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <UtensilsCrossed className="size-3" /> My Meals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold">
                            {stats.totalMeals.toFixed(1)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <DollarSign className="size-3" /> Meal Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.mealCost)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Coffee className="size-3" /> Extra Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.extraCostPerMember)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="size-3" /> Total Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.totalCost)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <PiggyBank className="size-3" /> My Deposits
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.deposits)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Users className="size-3" /> Opening Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.openingBalance)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <DollarSign className="size-3" /> Meal Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold">
                            {formatCurrency(stats.mealRate)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="size-3" /> Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div
                            className={`text-2xl font-bold ${stats.balance >= 0 ? "text-green-600" : "text-destructive"}`}
                        >
                            {formatCurrency(stats.balance)}
                        </div>
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
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">
                            Expenses by Category
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        {expenseData.length > 0 ?
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={expenseData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, percent }) =>
                                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                                        }
                                    >
                                        {expenseData.map((_, i) => (
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
                                {formatCurrency(stats.extraCostPerMember)}
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
                                My Deposits
                            </dt>
                            <dd className="font-medium">
                                {formatCurrency(stats.deposits)}
                            </dd>
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
        </div>
    );
}
