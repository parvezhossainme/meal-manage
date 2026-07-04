"use client"

import { useState, useEffect, useCallback } from "react"
import { getAuditLogsAction } from "@/actions/admin"
import { getCurrentUserAction } from "@/actions/auth"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"
import { Search, Filter } from "lucide-react"

interface AuditLogItem {
  id: string
  action: string
  entity: string
  entityId: string
  oldValue: string | null
  newValue: string | null
  reason: string | null
  createdAt: Date
  user: { name: string; email: string }
}

const actionBadgeClass: Record<string, string> = {
  CREATE:
    "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
  UPDATE:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
}

function ActionBadge({ action }: { action: string }) {
  if (action === "DELETE") {
    return <Badge variant="destructive">{action}</Badge>
  }
  return (
    <Badge variant="outline" className={actionBadgeClass[action] || ""}>
      {action}
    </Badge>
  )
}

function truncateJson(val: string | null): string {
  if (!val) return "—"
  try {
    const parsed = JSON.parse(val)
    const str = JSON.stringify(parsed)
    return str.length > 60 ? str.slice(0, 60) + "…" : str
  } catch {
    return val.length > 60 ? val.slice(0, 60) + "…" : val
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("all")

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const userResult = await getCurrentUserAction()
    if (!userResult.user) {
      setUnauthorized(true)
      setLoading(false)
      return
    }
    const result = await getAuditLogsAction()
    if (result.logs) setLogs(result.logs as AuditLogItem[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const entityTypes = Array.from(new Set(logs.map((l) => l.entity)))

  const filtered = logs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false
    if (entityFilter !== "all" && log.entity !== entityFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      log.user.name.toLowerCase().includes(q) ||
      log.user.email.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.reason && log.reason.toLowerCase().includes(q))
    )
  })

  if (unauthorized) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Track all changes made in the system</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You are not authorized to view this page.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Track all changes made in the system</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 shrink-0 text-muted-foreground" />
          <Select
            value={actionFilter}
            onValueChange={(v) => {
              if (v) setActionFilter(v)
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="CREATE">CREATE</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={entityFilter}
            onValueChange={(v) => {
              if (v) setEntityFilter(v)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{log.user.name}</TableCell>
                      <TableCell>
                        <ActionBadge action={log.action} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.entity}</Badge>
                      </TableCell>
                      <TableCell className="max-w-60">
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          {log.oldValue && (
                            <div>
                              <span className="font-medium text-destructive">
                                Old:
                              </span>{" "}
                              <code className="text-[11px]">
                                {truncateJson(log.oldValue)}
                            </code>
                            </div>
                          )}
                          {log.newValue && (
                            <div>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                New:
                              </span>{" "}
                              <code className="text-[11px]">
                                {truncateJson(log.newValue)}
                            </code>
                            </div>
                          )}
                          {!log.oldValue && !log.newValue && "—"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-40">
                        <span className="text-sm text-muted-foreground">
                          {log.reason || "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
