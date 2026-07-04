import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import PublicDashboard from "./PublicDashboard"

export default async function HomePage() {
  const session = await getSession()
  if (session) {
    redirect("/dashboard")
  }

  return <PublicDashboard />
}
