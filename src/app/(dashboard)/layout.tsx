import { requireAuth } from "@/lib/auth"
import { DashboardLayoutClient } from "./DashboardLayoutClient"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()
  return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>
}
