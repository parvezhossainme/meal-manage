"use client"

import { useState, useEffect, useCallback } from "react"
import { getAnnouncementsAction, createAnnouncementAction, deleteAnnouncementAction } from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Trash2, Megaphone } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface AnnouncementItem {
  id: string
  title: string
  content: string
  active: boolean
  createdAt: Date
  createdBy: { id: string; name: string }
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [formTitle, setFormTitle] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const result = await getAnnouncementsAction()
    if (result.announcements) setAnnouncements(result.announcements as AnnouncementItem[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle || !formContent) {
      toast.error("Title and content are required")
      return
    }
    setSaving(true)
    const result = await createAnnouncementAction({ title: formTitle, content: formContent, active: formActive })
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Announcement created")
      setAddOpen(false)
      setFormTitle("")
      setFormContent("")
      setFormActive(true)
      loadData()
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteAnnouncementAction(id)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Announcement deleted")
      loadData()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">Manage announcements shown to all users</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Announcement
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="mx-auto size-8 mb-2 opacity-50" />
            <p>No announcements yet</p>
            <p className="text-xs mt-1">Create your first announcement to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{a.title}</h3>
                      <Badge variant={a.active ? "default" : "secondary"}>
                        {a.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>By {a.createdBy.name}</span>
                      <span>{formatDate(a.createdAt)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Announcement</DialogTitle>
            <DialogDescription>Create a new announcement visible to all users</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Announcement title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Announcement content"
                rows={4}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formActive}
                onCheckedChange={(c) => setFormActive(c)}
              />
              <Label htmlFor="active">Active (visible to users)</Label>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Creating..." : "Create Announcement"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
