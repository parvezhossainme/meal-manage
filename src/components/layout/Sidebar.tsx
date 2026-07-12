"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { getSheetsAction } from "@/actions/sheets"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select"
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  Settings,
  FileText,
  X,
  UtensilsCrossed,
  ShoppingCart,
  PiggyBank,
  CircleDollarSign,
  ClipboardList,
  User,
  Megaphone,
  Sun,
  Moon,
} from "lucide-react"
import type { SessionUser } from "@/lib/auth"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const navItems: Record<string, NavItem[]> = {
  SUPER_ADMIN: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sheets", label: "Meal Sheets", icon: Calendar },
    { href: "/members", label: "Members", icon: Users },
    { href: "/shopping", label: "Bazar", icon: ShoppingCart },
    { href: "/extra-costs", label: "Extra Cost", icon: CircleDollarSign },
    { href: "/funds", label: "Funds", icon: PiggyBank },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/audit-logs", label: "Audit Logs", icon: ClipboardList },
  ],
  MANAGER: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sheets", label: "Meal Sheets", icon: Calendar },
    { href: "/members", label: "Members", icon: Users },
    { href: "/shopping", label: "Bazar", icon: ShoppingCart },
    { href: "/extra-costs", label: "Extra Cost", icon: CircleDollarSign },
    { href: "/funds", label: "Funds", icon: PiggyBank },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  MEMBER: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sheets", label: "Meal Sheets", icon: Calendar },
    { href: "/members", label: "Members", icon: Users },
    { href: "/shopping", label: "Bazar", icon: ShoppingCart },
    { href: "/extra-costs", label: "Extra Cost", icon: CircleDollarSign },
    { href: "/reports", label: "My Reports", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
}

interface SidebarProps {
  user: SessionUser
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  let items = navItems[user.role] || navItems.MEMBER
  const [sheets, setSheets] = useState<Array<{ id: string; label: string }>>([])

  useEffect(() => {
    getSheetsAction().then((result) => {
      if (result.sheets) setSheets(result.sheets as Array<{ id: string; label: string }>)
    })
  }, [])

  const sheetMatch = pathname.match(/^\/sheets\/([^/]+)/)
  const currentSheetId = sheetMatch ? sheetMatch[1] : (sheets[0]?.id || "")

  function handleSheetChange(newId: string) {
    router.push(`/sheets/${newId}/meals`)
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5 font-semibold text-sidebar-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UtensilsCrossed className="size-4" />
          </span>
          <span>Meal Manage</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        {sheets.length > 0 && (
          <div className="border-b border-sidebar-border px-4 py-2.5">
            <Select value={currentSheetId} onValueChange={(v: string | null) => { if (v) handleSheetChange(v) }}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="Select month">
                  {(value: string | null) => value ? (sheets.find(s => s.id === value)?.label || value) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                {sheets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <ScrollArea className="flex-1 px-3 py-3">
          <nav className="flex flex-col gap-0.5">
            {items.map((item) => {
              const Icon = item.icon
              const active = item.href === "/members"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground [background-image:var(--primary-gradient)] text-white"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-white" : "")} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-sidebar-foreground/60 min-w-0">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
