import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, Users, PiggyBank, DollarSign, Coffee, ArrowRight, Printer, FileDown, FileSpreadsheet } from "lucide-react"

const reports = [
  { href: "/sheets", label: "Monthly Sheet", description: "View and manage monthly meal sheets", icon: Calendar, color: "text-blue-500" },
  { href: "/reports/member-statement", label: "Member Statement", description: "Individual member balances and statements", icon: Users, color: "text-green-500" },
  { href: "/reports/fund-ledger", label: "Fund Ledger", description: "Detailed fund transaction history", icon: PiggyBank, color: "text-purple-500" },
  { href: "/reports/expense-ledger", label: "Expense Ledger", description: "Detailed expense transaction history", icon: DollarSign, color: "text-red-500" },
  { href: "/reports/guest-report", label: "Guest Report", description: "Guest meal summary and details", icon: Coffee, color: "text-orange-500" },
  { href: "/reports/carry-forward", label: "Carry Forward Report", description: "Opening balances carried between months", icon: FileText, color: "text-teal-500" },
  { href: "/reports/yearly-summary", label: "Yearly Summary", description: "Yearly aggregation and statistics", icon: FileSpreadsheet, color: "text-indigo-500" },
]

const exportActions = ["PDF", "Excel", "CSV", "Print"]

export default async function ReportsPage() {
  const user = await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate and view reports</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Link key={report.href} href={report.href}>
              <Card className="cursor-pointer transition-colors hover:bg-accent/50 h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Icon className={`size-8 ${report.color}`} />
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-2">{report.label}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Export data in various formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {exportActions.map((action) => (
              <Button key={action} variant="outline">
                {action === "PDF" && <FileDown className="size-4" />}
                {action === "Excel" && <FileSpreadsheet className="size-4" />}
                {action === "CSV" && <FileText className="size-4" />}
                {action === "Print" && <Printer className="size-4" />}
                Export {action}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
