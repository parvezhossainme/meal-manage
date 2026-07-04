"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getUsersAction,
  createUserAction,
  updateUserRoleAction,
  getSettingsAction,
  updateSettingAction,
} from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import CreateMonthDialog from "@/components/sheets/create-month-dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Loader2, Save, Users, Settings2, Calendar, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface UserItem {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  createdAt: Date
}

interface SettingItem {
  id: string
  key: string
  value: string
}

export default function SettingsPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [settings, setSettings] = useState<SettingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formRole, setFormRole] = useState("MEMBER")
  const [saving, setSaving] = useState(false)
  const [savingSettings, setSavingSettings] = useState<Record<string, boolean>>({})
  const [createMonthOpen, setCreateMonthOpen] = useState(false)
  const [newSettingKey, setNewSettingKey] = useState("")
  const [newSettingValue, setNewSettingValue] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    const [usersResult, settingsResult] = await Promise.all([
      getUsersAction(),
      getSettingsAction(),
    ])
    if (usersResult.users) setUsers(usersResult.users as UserItem[])
    if (settingsResult.settings) setSettings(settingsResult.settings as SettingItem[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await createUserAction({
      email: formEmail,
      name: formName,
      password: formPassword || undefined,
      role: formRole,
    })
    if (result.error) {
      toast.error(result.error)
    } else {
      if (result.tempPassword) {
        toast.success("User created. Temp password: " + result.tempPassword)
      } else {
        toast.success("User created")
      }
      setAddOpen(false)
      loadData()
      setFormName("")
      setFormEmail("")
      setFormPassword("")
      setFormRole("MEMBER")
    }
    setSaving(false)
  }

  async function handleRoleChange(id: string, role: string) {
    const result = await updateUserRoleAction(id, role)
    if (result.error) toast.error(result.error)
    else loadData()
  }

  async function handleUpdateSetting(key: string, value: string) {
    setSavingSettings((prev) => ({ ...prev, [key]: true }))
    const result = await updateSettingAction(key, value)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Setting updated")
      loadData()
    }
    setSavingSettings((prev) => ({ ...prev, [key]: false }))
  }

  async function handleAddSetting() {
    if (!newSettingKey || !newSettingValue) return
    setSavingSettings((prev) => ({ ...prev, [newSettingKey]: true }))
    const result = await updateSettingAction(newSettingKey, newSettingValue)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Setting added")
      loadData()
      setNewSettingKey("")
      setNewSettingValue("")
    }
    setSavingSettings((prev) => ({ ...prev, [newSettingKey]: false }))
  }

  const roleColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    SUPER_ADMIN: "default",
    ADMIN: "secondary",
    MEMBER: "outline",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage users and system configuration</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users className="size-4" /> Users</TabsTrigger>
          <TabsTrigger value="months"><Calendar className="size-4" /> Months</TabsTrigger>
          <TabsTrigger value="system"><Settings2 className="size-4" /> System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add User
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center">
                        <Loader2 className="mx-auto size-5 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(v: string | null) => {
                              if (v) handleRoleChange(user.id, v)
                            }}
                          >
                            <SelectTrigger className="h-7 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active ? "default" : "secondary"}>
                            {user.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.createdAt)}
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
                <DialogTitle>Add User</DialogTitle>
                <DialogDescription>Create a new user account</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password (leave empty for auto-generate)</Label>
                  <Input id="password" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formRole} onValueChange={(v: string | null) => { if (v) setFormRole(v) }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? "Creating..." : "Create User"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="system" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UtensilsCrossed className="size-4" />
                Meal Settings
              </CardTitle>
              <CardDescription>Configure meal calculation preferences</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="mx-auto size-5 animate-spin" />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Count Default Meals</Label>
                    <p className="text-xs text-muted-foreground">
                      Include default meal counts in total meal calculations (affects meal rate, member balances, and carry-forward)
                    </p>
                  </div>
                  <Switch
                    checked={settings.find((s) => s.key === "countDefaultMeals")?.value !== "false"}
                    onCheckedChange={(checked: boolean) => {
                      handleUpdateSetting("countDefaultMeals", checked ? "true" : "false")
                    }}
                    disabled={savingSettings["countDefaultMeals"]}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure application settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <Loader2 className="mx-auto size-5 animate-spin" />
                ) : settings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No settings configured</p>
                ) : (
                  settings.map((setting) => (
                    <div key={setting.id} className="flex items-center gap-4">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs font-mono text-muted-foreground">{setting.key}</Label>
                        <Input
                          value={setting.value}
                          onChange={(e) => {
                            setSettings((prev) =>
                              prev.map((s) => (s.id === setting.id ? { ...s, value: e.target.value } : s))
                            )
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-5"
                        disabled={savingSettings[setting.key]}
                        onClick={() => handleUpdateSetting(setting.key, setting.value)}
                      >
                        <Save className="size-4" />
                        Save
                      </Button>
                    </div>
                  ))
                )}
                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium">Add New Setting</p>
                  <div className="flex items-end gap-4">
                    <div className="flex-1 space-y-1">
                      <Label>Key</Label>
                      <Input
                        value={newSettingKey}
                        onChange={(e) => setNewSettingKey(e.target.value)}
                        placeholder="setting_key"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label>Value</Label>
                      <Input
                        value={newSettingValue}
                        onChange={(e) => setNewSettingValue(e.target.value)}
                        placeholder="value"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-0.5"
                      onClick={handleAddSetting}
                      disabled={!newSettingKey || !newSettingValue}
                    >
                      <Plus className="size-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="months" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateMonthOpen(true)}>
              <Calendar className="size-4" />
              Create New Month
            </Button>
          </div>
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Create a new monthly sheet from here. After creation, you can manage meals, expenses, and other data from the respective sections.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateMonthDialog
        open={createMonthOpen}
        onOpenChange={setCreateMonthOpen}
        onSuccess={() => {}}
      />
    </div>
  )
}
