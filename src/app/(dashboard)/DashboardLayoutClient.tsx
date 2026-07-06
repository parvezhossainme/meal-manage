"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import type { SessionUser } from "@/lib/auth"

const adminOnlyRoutes = ["/audit-logs", "/announcements", "/funds"]

export function DashboardLayoutClient({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (user.role === "MEMBER" && adminOnlyRoutes.some(route => pathname.startsWith(route))) {
      router.replace("/sheets")
    }
  }, [user.role, pathname, router])

  if (user.role === "MEMBER" && adminOnlyRoutes.some(route => pathname.startsWith(route))) {
    return null
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
