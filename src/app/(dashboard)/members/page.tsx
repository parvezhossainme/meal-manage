"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getMembersAction,
  createMemberAction,
  updateMemberAction,
  toggleMemberActiveAction,
} from "@/actions/members"
import { getCurrentUserAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Plus, Pencil, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface MemberItem {
  id: string
  name: string
  phone: string | null
  email: string | null
  active: boolean
  user: { id: string; email: string; role: string; active: boolean }
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState("")

  useEffect(() => {
    getCurrentUserAction().then((result) => {
      if (result.user) setUserRole(result.user.role)
    })
  }, [])

  const loadMembers = useCallback(async () => {
    setLoading(true)
    const result = await getMembersAction()
    if (result.members) {
      setMembers(result.members as MemberItem[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMembers()
  }, [loadMembers])

  const editMember = members.find((m) => m.id === editId)

  function openAdd() {
    setEditId(null)
    setFormName("")
    setFormPhone("")
    setFormEmail("")
    setAddOpen(true)
  }

  function openEdit(id: string) {
    const m = members.find((m) => m.id === id)
    if (m) {
      setEditId(id)
      setFormName(m.name)
      setFormPhone(m.phone || "")
      setFormEmail(m.email || "")
      setAddOpen(true)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        const result = await updateMemberAction(editId, {
          name: formName,
          phone: formPhone || undefined,
          email: formEmail || undefined,
        })
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success("Member updated")
          setAddOpen(false)
          loadMembers()
        }
      } else {
        const result = await createMemberAction({
          name: formName,
          phone: formPhone || undefined,
          email: formEmail || undefined,
        })
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success("Member created")
          setAddOpen(false)
          loadMembers()
        }
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string) {
    const result = await toggleMemberActiveAction(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      loadMembers()
    }
  }

  const filtered = members.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return m.name.toLowerCase().includes(q) || m.phone?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">Manage meal participants</p>
        </div>
        {userRole !== "MEMBER" && (
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add Member
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                filtered
                  .filter((member) => !(userRole === "MANAGER" && member.user?.role === "SUPER_ADMIN"))
                  .map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.phone || "—"}</TableCell>
                    <TableCell>{member.email || "—"}</TableCell>
                    <TableCell>
                      {member.user ? (
                        <Badge variant={member.user.role === "SUPER_ADMIN" ? "destructive" : member.user.role === "MANAGER" ? "default" : "secondary"}>
                          {member.user.role === "SUPER_ADMIN" ? "Super Admin" : member.user.role === "MANAGER" ? "Manager" : "Member"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No account</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.active ? "default" : "secondary"}>
                        {member.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {userRole !== "MEMBER" && (
                          <>
                            <Switch checked={member.active} onCheckedChange={() => handleToggle(member.id)} />
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(member.id)}>
                              <Pencil className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Member" : "Add Member"}</DialogTitle>
            <DialogDescription>
              {editId ? "Update member details" : "Add a new member to the meal program"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Member name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email address" />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving..." : editId ? "Update Member" : "Add Member"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
