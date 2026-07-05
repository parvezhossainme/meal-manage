"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPublicDashboardAction } from "@/actions/public";
import { getActiveAnnouncementsAction } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
    UtensilsCrossed,
    DollarSign,
    Coffee,
    ShoppingCart,
    Wallet,
    Megaphone,
} from "lucide-react";
import { formatCurrency, formatDateShort } from "@/lib/utils";

interface MemberRow {
    memberId: string;
    memberName: string;
    openingBalance: number;
    totalMeals: number;
    mealCost: number;
    extraCost: number;
    extraCostEntries: number;
    totalCost: number;
    deposits: number;
    balance: number;
    mealRate: number;
}

interface PublicStats {
    currentMonthLabel: string;
    sheetId: string;
    mealRate: number;
    totalMeals: number;
    totalBazar: number;
    totalExpenses: number;
    totalFunds: number;
    totalOpening: number;
    activeMembers: number;
    guestMeals: number;
    outstandingBalance: number;
    extraCostPerMember: number;
    expenseByCategory: Record<string, number>;
    members: MemberRow[];
}

interface GridItem {
    date: string;
    day: number;
    dayName: string;
    items: Record<string, number | null>;
    total: number;
}

interface GridMember {
    id: string;
    name: string;
}

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

interface FundEntry {
    id: string;
    date: string;
    amount: number;
    type: string;
    remarks: string | null;
    member: { id: string; name: string };
}

function GiveTakeBadge({ balance }: { balance: number }) {
    if (balance > 0) {
        return (
            <Badge
                variant="outline"
                className="gap-1 border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
            >
                <span className="font-bold">+ {Math.round(balance)} BDT</span>
            </Badge>
        );
    }
    if (balance < 0) {
        return (
            <Badge
                variant="outline"
                className="gap-1 border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
            >
                <span className="font-bold">{Math.round(balance)} BDT</span>
            </Badge>
        );
    }
    return (
        <Badge variant="secondary" className="gap-1">
            Settled
        </Badge>
    );
}

function renderGridTable(
    rows: GridItem[],
    members: GridMember[],
    defaultMeals: Record<string, number>,
    label: string,
    showDefault?: boolean,
) {
    const memberTotals: Record<string, number> = {};
    let grandTotal = 0;
    for (const m of members) memberTotals[m.id] = 0;
    for (const row of rows) {
        grandTotal += row.total;
        for (const m of members) {
            memberTotals[m.id] += row.items[m.id] ?? 0;
        }
    }
    let defaultGrandTotal = 0;
    if (showDefault) {
        for (const m of members) {
            const def = defaultMeals[m.id] ?? 0;
            memberTotals[m.id] += def;
            defaultGrandTotal += def;
        }
        grandTotal += defaultGrandTotal;
    }

    return (
        <div className="overflow-x-auto">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
                {label}
            </p>
            <table className="w-full border-collapse text-xs">
                <thead>
                    <tr className="border-b bg-muted/50">
                        <th className="w-7 border-r px-0.5 py-1.5 text-center font-medium text-[10px]">
                            D
                        </th>
                        {members.map((m) => (
                            <th
                                key={m.id}
                                className="w-10 px-0.5 py-1.5 text-center font-medium text-[10px]"
                            >
                                <span className="block truncate" title={m.name}>
                                    {m.name.split(" ")[0]}
                                </span>
                            </th>
                        ))}
                        <th className="w-7 px-0.5 py-1.5 text-center font-medium text-[10px]">
                            T
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {showDefault && (
                        <tr className="bg-amber-50/50 hover:bg-amber-50/80">
                            <td className="border-b border-r bg-amber-50/50 px-0.5 py-1.5 text-center font-medium text-[10px] text-amber-700">
                                Default
                            </td>
                            {members.map((m) => {
                                const val = defaultMeals[m.id];
                                return (
                                    <td
                                        key={m.id}
                                        className="border-b px-0.5 py-1.5 text-center tabular-nums"
                                    >
                                        {val === undefined ?
                                            <span className="text-muted-foreground/30">
                                                -
                                            </span>
                                        : val > 0 ?
                                            <span className="font-medium text-amber-700">
                                                {val}
                                            </span>
                                        :   <span className="text-muted-foreground/50">
                                                0
                                            </span>
                                        }
                                    </td>
                                );
                            })}
                            <td className="border-b bg-amber-50/50 px-0.5 py-1.5 text-center font-medium text-amber-700">
                                {defaultGrandTotal.toFixed(1)}
                            </td>
                        </tr>
                    )}
                    {rows.map((row) => (
                        <tr
                            key={row.day}
                            className="border-b hover:bg-muted/20"
                        >
                            <td className="border-r px-0.5 py-1 text-center font-medium text-[10px] text-muted-foreground">
                                {row.day}
                            </td>
                            {members.map((m) => {
                                const val = row.items[m.id];
                                return (
                                    <td
                                        key={m.id}
                                        className="px-0.5 py-1 text-center tabular-nums"
                                    >
                                        {val === null ?
                                            <span className="text-muted-foreground/30">
                                                -
                                            </span>
                                        : val > 0 ?
                                            <span className="font-medium">
                                                {val}
                                            </span>
                                        :   <span className="text-muted-foreground/50">
                                                0
                                            </span>
                                        }
                                    </td>
                                );
                            })}
                            <td className="px-0.5 py-1 text-center font-medium">
                                {row.total.toFixed(1)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t bg-muted/30 font-medium text-[10px]">
                        <td className="border-r px-0.5 py-1.5 text-center text-muted-foreground">
                            T
                        </td>
                        {members.map((m) => (
                            <td
                                key={m.id}
                                className="px-0.5 py-1.5 text-center tabular-nums font-semibold"
                            >
                                {memberTotals[m.id].toFixed(1)}
                            </td>
                        ))}
                        <td className="px-0.5 py-1.5 text-center font-bold">
                            {grandTotal.toFixed(1)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

export default function PublicDashboard({
    isLoggedIn,
    userRole,
    userMemberId,
}: {
    isLoggedIn?: boolean;
    userRole?: string | null;
    userMemberId?: string | null;
}) {
    const [data, setData] = useState<{
        stats: PublicStats | null;
        grid: GridItem[] | null;
        members: GridMember[];
        defaultMeals: Record<string, number>;
        shopping: ShoppingEntry[] | null;
        extraCosts: ExtraCostEntry[] | null;
        funds: FundEntry[] | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; content: string; createdAt: Date }>>([]);
    const [announcementOpen, setAnnouncementOpen] = useState(false);

    useEffect(() => {
        getPublicDashboardAction().then((result: Record<string, unknown>) => {
            if (result.error) {
                setError(result.error as string);
            } else {
                setData({
                    stats: (result.stats as PublicStats) ?? null,
                    grid: (result.grid as GridItem[]) ?? null,
                    members: (result.members as GridMember[]) ?? [],
                    defaultMeals:
                        (result.defaultMeals as Record<string, number>) ?? {},
                    shopping: (result.shopping as ShoppingEntry[]) ?? null,
                    extraCosts: (result.extraCosts as ExtraCostEntry[]) ?? null,
                    funds: (result.funds as FundEntry[]) ?? null,
                });
            }
            setLoading(false);
        });
        getActiveAnnouncementsAction().then((result) => {
            if (result.announcements) {
                setAnnouncements(result.announcements as Array<{ id: string; title: string; content: string; createdAt: Date }>);
                if (result.announcements.length > 0) {
                    const dismissed = sessionStorage.getItem("announcements-dismissed")
                    if (dismissed !== "true") {
                        setAnnouncementOpen(true)
                    }
                }
            }
        });
    }, []);

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
                            <Card key={i}>
                                <CardContent className="p-6">
                                    <Skeleton className="h-12 w-full" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Skeleton className="h-64 w-full" />
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">
                    Failed to load dashboard data.
                </p>
                {error && (
                    <p className="max-w-md text-center text-xs text-red-500">
                        {error}
                    </p>
                )}
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    if (!data || !data.stats) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
                <div className="flex items-center gap-2 text-2xl font-semibold">
                    <UtensilsCrossed className="size-7" />
                    <span>Meal Manage</span>
                </div>
                <p className="text-muted-foreground">
                    No monthly sheet found. The manager needs to create one.
                </p>
                <div className="flex gap-3">
                    <Link href="/login" className={buttonVariants()}>
                        Login
                    </Link>
                    <Link
                        href="/register"
                        className={buttonVariants({ variant: "outline" })}
                    >
                        Register
                    </Link>
                </div>
            </div>
        );
    }

    const { stats, grid, members, defaultMeals, shopping, extraCosts, funds } =
        data;

    const totalRow = stats.members.reduce(
        (acc, m) => ({
            openingBalance: acc.openingBalance + m.openingBalance,
            deposits: acc.deposits + m.deposits,
            totalMeals: acc.totalMeals + m.totalMeals,
            mealCost: acc.mealCost + m.mealCost,
            extraCost: acc.extraCost + m.extraCost + m.extraCostEntries,
            totalCost: acc.totalCost + m.totalCost,
            balance: acc.balance + m.balance,
        }),
        {
            openingBalance: 0,
            deposits: 0,
            totalMeals: 0,
            mealCost: 0,
            extraCost: 0,
            totalCost: 0,
            balance: 0,
        },
    );

    const midDay = 15;
    const firstHalf = (grid ?? []).filter((r) => r.day <= midDay);
    const secondHalf = (grid ?? []).filter((r) => r.day > midDay);

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
                    <div className="flex items-center gap-2 font-semibold">
                        <UtensilsCrossed className="size-5" />
                        <span>Meal Manage</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                            Latest month
                        </span>
                        <span>&mdash;</span>
                        <span>{stats.currentMonthLabel}</span>
                    </div>
                    <div className="flex gap-2">
                        {isLoggedIn ?
                            userRole === "MEMBER" && userMemberId ?
                                <Link
                                    href={`/members/${userMemberId}`}
                                    className={buttonVariants({ size: "sm" })}
                                >
                                    My Dashboard
                                </Link>
                            :   <Link
                                    href="/dashboard"
                                    className={buttonVariants({ size: "sm" })}
                                >
                                    Dashboard
                                </Link>
                        :   <>
                                <Link
                                    href="/login"
                                    className={buttonVariants({
                                        variant: "outline",
                                        size: "sm",
                                    })}
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className={buttonVariants({ size: "sm" })}
                                >
                                    Register
                                </Link>
                            </>
                        }
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl space-y-6 p-4 pt-8">
                {/* Summary Cards */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">
                                Meal Rate
                            </p>
                            <p className="text-xl font-bold">
                                {formatCurrency(stats.mealRate)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Per meal cost
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">
                                Total Bazar
                            </p>
                            <p className="text-xl font-bold">
                                {formatCurrency(stats.totalBazar)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Main category
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">
                                Total Expenses
                            </p>
                            <p className="text-xl font-bold">
                                {formatCurrency(stats.totalExpenses)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                This month
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">
                                Total Funds
                            </p>
                            <p className="text-xl font-bold">
                                {formatCurrency(stats.totalFunds)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Collected
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">
                                Outstanding
                            </p>
                            <p
                                className={`text-xl font-bold ${stats.outstandingBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                                {formatCurrency(stats.outstandingBalance)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Net balance
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Member Summary */}
                <Card>
                    {/* <CardHeader>
            <CardTitle>Member Summary</CardTitle>
          </CardHeader> */}
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="sticky top-0 px-3 py-3 text-left font-medium text-muted-foreground">
                                            Member
                                        </th>
                                        <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">
                                            Total Fund
                                        </th>
                                        <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">
                                            Total Meals
                                        </th>
                                        <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">
                                            Meal Cost
                                        </th>
                                        <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">
                                            Extra Cost
                                        </th>
                                        <th className="sticky top-0 px-3 py-3 text-right font-medium text-muted-foreground">
                                            Total Cost
                                        </th>
                                        <th className="sticky top-0 px-3 py-3 text-center font-medium text-muted-foreground">
                                            Give / Take
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.members.map((member) => (
                                        <tr
                                            key={member.memberId}
                                            className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="px-3 py-3 font-medium">
                                                {member.memberName}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                {formatCurrency(
                                                    member.deposits,
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                {member.totalMeals.toFixed(1)}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                {formatCurrency(
                                                    member.mealCost,
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                                                {formatCurrency(
                                                    member.extraCost +
                                                        member.extraCostEntries,
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums font-medium">
                                                {formatCurrency(
                                                    member.totalCost,
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <GiveTakeBadge
                                                    balance={member.balance}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t bg-muted/30 font-medium">
                                        <td className="px-3 py-3">Total</td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {formatCurrency(totalRow.deposits)}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {totalRow.totalMeals.toFixed(1)}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {formatCurrency(totalRow.mealCost)}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {formatCurrency(totalRow.extraCost)}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {formatCurrency(totalRow.totalCost)}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <GiveTakeBadge
                                                balance={totalRow.balance}
                                            />
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Meal Grid + Bazar side by side */}
                <div className="grid gap-3 lg:grid-cols-3">
                    {/* Meal Grid */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Coffee className="size-4" />
                                Meal Grid
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                            {grid && grid.length > 0 ?
                                <div className="grid gap-4 md:grid-cols-2">
                                    {firstHalf.length > 0 &&
                                        renderGridTable(
                                            firstHalf,
                                            members,
                                            defaultMeals,
                                            "Day 1-15",
                                            true,
                                        )}
                                    {secondHalf.length > 0 &&
                                        renderGridTable(
                                            secondHalf,
                                            members,
                                            defaultMeals,
                                            "Day 16+",
                                        )}
                                </div>
                            :   <p className="py-4 text-center text-sm text-muted-foreground">
                                    No meal data for this month.
                                </p>
                            }
                        </CardContent>
                    </Card>

                    {/* Bazar Details */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShoppingCart className="size-4" />
                                Bazar Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {shopping && shopping.length > 0 ?
                                <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                                    <table className="w-full text-xs table-fixed">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="sticky top-0 bg-muted/50 w-[70px] px-2 py-2 text-left font-medium">
                                                    Date
                                                </th>
                                                <th className="sticky top-0 bg-muted/50 px-2 py-2 text-left font-medium">
                                                    Items
                                                </th>
                                                <th className="sticky top-0 bg-muted/50 w-[80px] px-2 py-2 text-left font-medium">
                                                    Who
                                                </th>
                                                <th className="sticky top-0 bg-muted/50 w-[80px] px-2 py-2 text-right font-medium">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {shopping.map((s) => (
                                                <tr
                                                    key={s.id}
                                                    className="border-b hover:bg-muted/20"
                                                >
                                                    <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                                                        {formatDateShort(
                                                            s.date,
                                                        )}
                                                    </td>
                                                    <td
                                                        className="px-2 py-1.5 truncate text-muted-foreground"
                                                        title={s.details ?? ""}
                                                    >
                                                        {s.details || "—"}
                                                    </td>
                                                    <td className="px-2 py-1.5 whitespace-nowrap">
                                                        {s.purchasedBy.name}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums font-medium whitespace-nowrap">
                                                        {Math.round(
                                                            s.totalCost,
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t bg-muted/30 font-medium">
                                                <td
                                                    className="px-2 py-2"
                                                    colSpan={3}
                                                >
                                                    Total Bazar
                                                </td>
                                                <td className="px-2 py-2 text-right tabular-nums">
                                                    {Math.round(
                                                        shopping.reduce(
                                                            (s, x) =>
                                                                s + x.totalCost,
                                                            0,
                                                        ),
                                                    )}
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
                </div>

                {/* Extra Costs + Funds side by side */}
                <div className="grid gap-3 lg:grid-cols-3">
                    {/* Extra Costs */}
                    <Card className="lg:col-span-1">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <DollarSign className="size-4" />
                                Extra Costs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {extraCosts && extraCosts.length > 0 ?
                                <div className="max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="sticky top-0 bg-muted/50 px-2 py-2 text-left font-medium">
                                                    Date
                                                </th>
                                                <th className="sticky top-0 bg-muted/50 px-2 py-2 text-left font-medium">
                                                    Description
                                                </th>
                                                <th className="sticky top-0 bg-muted/50 px-2 py-2 text-right font-medium">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {extraCosts.map((c) => (
                                                <tr
                                                    key={c.id}
                                                    className="border-b hover:bg-muted/20"
                                                >
                                                    <td className="px-2 py-1.5 text-muted-foreground">
                                                        {formatDateShort(
                                                            c.date,
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        {c.description}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                                                        {formatCurrency(
                                                            c.totalCost,
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t bg-muted/30 font-medium">
                                                <td
                                                    className="px-2 py-2"
                                                    colSpan={2}
                                                >
                                                    Total Extra Cost
                                                </td>
                                                <td className="px-2 py-2 text-right tabular-nums">
                                                    {formatCurrency(
                                                        extraCosts.reduce(
                                                            (s, x) =>
                                                                s + x.totalCost,
                                                            0,
                                                        ),
                                                    )}
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

                    {/* Funds */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Wallet className="size-4" />
                                Fund Transactions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {(() => {
                                const grouped: Record<
                                    string,
                                    {
                                        name: string;
                                        total: number;
                                        txns: NonNullable<typeof funds>;
                                    }
                                > = {};
                                if (funds) {
                                    for (const f of funds) {
                                        if (!grouped[f.member.id]) {
                                            grouped[f.member.id] = {
                                                name: f.member.name,
                                                total: 0,
                                                txns: [],
                                            };
                                        }
                                        grouped[f.member.id].total += f.amount;
                                        grouped[f.member.id].txns.push(f);
                                    }
                                }
                                const grandTotal = Object.values(
                                    grouped,
                                ).reduce((s, g) => s + g.total, 0);
                                const memberFundMap = new Map(
                                    stats.members.map((m) => [m.memberId, m]),
                                )
                                return (
                                    <div className="divide-y">
                                        {stats.members.map((member) => {
                                            const g = grouped[member.memberId]
                                            const carried = member.openingBalance
                                            const deposit = g?.total ?? 0
                                            const totalBalance = carried + deposit
                                            const txns = g?.txns ?? []
                                            return (
                                                <div
                                                    key={member.memberId}
                                                    className="p-3"
                                                >
                                                    <div className="mb-1 flex items-center justify-between">
                                                        <span className="text-sm font-semibold">
                                                            {member.memberName}
                                                        </span>
                                                        <span className="text-sm font-bold tabular-nums text-green-600">
                                                            {formatCurrency(totalBalance)}
                                                        </span>
                                                    </div>
                                                    <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span>Previous Month: <strong>{formatCurrency(carried)}</strong></span>
                                                        <span>Deposit: <strong>{formatCurrency(deposit)}</strong></span>
                                                    </div>
                                                    {txns.length > 0 && (
                                                        <div className="space-y-1">
                                                            {txns.map((f) => (
                                                                <div
                                                                    key={f.id}
                                                                    className="flex items-center justify-between text-xs text-muted-foreground"
                                                                >
                                                                    <span>
                                                                        {formatDateShort(f.date)}
                                                                    </span>
                                                                    <span className="tabular-nums font-medium text-green-600">
                                                                        + {formatCurrency(f.amount)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        <div className="flex items-center justify-between bg-muted/30 p-3 text-sm font-semibold">
                                            <span>Total Fund</span>
                                            <span className="tabular-nums">
                                                {formatCurrency(grandTotal)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Megaphone className="size-5 text-primary" />
                    Announcements
                  </DialogTitle>
                  <DialogDescription>Important updates and notices</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {announcements.map((a) => (
                    <div key={a.id} className="rounded-lg border p-4">
                      <h4 className="font-semibold text-sm mb-1">{a.title}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatDateShort(a.createdAt.toString())}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      sessionStorage.setItem("announcements-dismissed", "true")
                      setAnnouncementOpen(false)
                    }}
                  >
                    Don&apos;t show again
                  </Button>
                  <Button onClick={() => setAnnouncementOpen(false)}>
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <footer className="border-t bg-card mt-8">
                <div className="mx-auto flex h-12 max-w-7xl items-center justify-center px-4">
                    <p className="text-xs text-muted-foreground">
                        Created by <span className="font-medium text-foreground">@parvezhossainme</span>
                    </p>
                </div>
            </footer>
        </div>
    );
}
