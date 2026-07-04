import { getSession } from "@/lib/auth"
import PublicDashboard from "./PublicDashboard"

export default async function HomePage() {
  const session = await getSession()
  return <PublicDashboard isLoggedIn={!!session} />
}
