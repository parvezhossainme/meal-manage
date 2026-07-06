"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  getUnreadNotificationCountAction,
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/bazar-requests"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchCount = async () => {
    const res = await getUnreadNotificationCountAction()
    setCount(res.count)
  }

  const fetchNotifications = async () => {
    const res = await getNotificationsAction()
    if (res.notifications) setNotifications(res.notifications as unknown as Notification[])
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleOpen = async () => {
    setOpen(!open)
    if (!open) fetchNotifications()
  }

  const handleMarkRead = async (id: string) => {
    await markNotificationReadAction(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    fetchCount()
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setCount(0)
  }

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="icon" className="relative" onClick={handleOpen} aria-label="Notifications">
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border bg-popover shadow-lg z-50">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Notifications</span>
            {count > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleMarkAllRead}>
                <CheckCheck className="size-3" /> Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-sm border-b last:border-0 hover:bg-muted/50 transition-colors",
                    !n.read && "bg-muted/30"
                  )}
                  onClick={() => handleMarkRead(n.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn("mt-1 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {formatDate(new Date(n.createdAt))}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
