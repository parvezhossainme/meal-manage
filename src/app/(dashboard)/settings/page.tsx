"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getUsersAction,
  createUserAction,
  updateUserRoleAction,
  updateUserPasswordAction,
  getSettingsAction,
  updateSettingAction,
} from "@/actions/admin"
import { getCurrentUserAction, changeMyPasswordAction } from "@/actions/auth"
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
import {
  Plus, Loader2, Save, Users, Settings2, Calendar, UtensilsCrossed, KeyRound
} from "lucide-react"
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
  const [passwordDialog, setPasswordDialog] = useState<{ id: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [myCurrentPassword, setMyCurrentPassword] = useState("")
  const [myNewPassword, setMyNewPassword] = useState("")
  const [savingMyPassword, setSavingMyPassword] = useState(false)

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
    getCurrentUserAction().then((r) => {
      if (r.user) setCurrentUser({ id: r.user.id, name: r.user.name, role: r.user.role })
    })
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

  async function handleChangePassword() {
    if (!passwordDialog) return
    if (!newPassword || newPassword.length < 4) {
      toast.error("Password must be at least 4 characters")
      return
    }
    setSavingPassword(true)
    const result = await updateUserPasswordAction(passwordDialog.id, newPassword)
    setSavingPassword(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Password updated")
      setPasswordDialog(null)
      setNewPassword("")
    }
  }

  async function handleChangeMyPassword() {
    if (!myCurrentPassword || !myNewPassword || myNewPassword.length < 4) {
      toast.error("New password must be at least 4 characters")
      return
    }
    setSavingMyPassword(true)
    const result = await changeMyPasswordAction(myCurrentPassword, myNewPassword)
    setSavingMyPassword(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Password changed successfully")
      setMyCurrentPassword("")
      setMyNewPassword("")
    }
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" />
            Change My Password
          </CardTitle>
          <CardDescription>Update your own account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); handleChangeMyPassword() }}
            className="flex flex-col sm:flex-row items-end gap-3"
          >
            <div className="flex-1 space-y-1 w-full">
              <Label htmlFor="my-current-password">Current Password</Label>
              <Input
                id="my-current-password"
                type="password"
                value={myCurrentPassword}
                onChange={(e) => setMyCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex-1 space-y-1 w-full">
              <Label htmlFor="my-new-password">New Password</Label>
              <Input
                id="my-new-password"
                type="password"
                value={myNewPassword}
                onChange={(e) => setMyNewPassword(e.target.value)}
                required
                minLength={4}
              />
            </div>
            <Button type="submit" disabled={savingMyPassword}>
              {savingMyPassword ? "Saving..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

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
                    {currentUser?.role === "SUPER_ADMIN" && <TableHead>Role</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    {currentUser?.role === "SUPER_ADMIN" && <TableHead className="w-20"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={currentUser?.role === "SUPER_ADMIN" ? 6 : 4} className="py-8 text-center">
                        <Loader2 className="mx-auto size-5 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        {currentUser?.role === "SUPER_ADMIN" && (
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
                        )}
                        <TableCell>
                          <Badge variant={user.active ? "default" : "secondary"}>
                            {user.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        {currentUser?.role === "SUPER_ADMIN" && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setNewPassword("")
                              setPasswordDialog({ id: user.id, name: user.name })
                            }}
                          >
                            <KeyRound className="size-4" />
                          </Button>
                        </TableCell>
                        )}
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
                {currentUser?.role === "SUPER_ADMIN" && (
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
                )}
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

          <Dialog open={!!passwordDialog} onOpenChange={(o) => { if (!o) { setPasswordDialog(null); setNewPassword("") } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>Update password for {passwordDialog?.name}</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); handleChangePassword() }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 4 characters"
                    required
                    minLength={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setPasswordDialog(null); setNewPassword("") }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingPassword}>
                    {savingPassword ? "Saving..." : "Save Password"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <CreateMonthDialog
        open={createMonthOpen}
        onOpenChange={setCreateMonthOpen}
        onSuccess={() => {}}
      />
    </div>
  )
}
