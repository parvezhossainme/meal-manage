"use client"

import { useState, useEffect } from "react"
import {
  createSheetAction,
  getPreviousMonthBalancesAction,
} from "@/actions/sheets"
import { getActiveMembersAction } from "@/actions/members"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

interface MemberItem {
  id: string
  name: string
  active: boolean
}

interface BalancePreview {
  memberId: string
  balance: number
}

interface CreateMonthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function CreateMonthDialog({ open, onOpenChange, onSuccess }: CreateMonthDialogProps) {
  const [step, setStep] = useState(1)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [members, setMembers] = useState<MemberItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [carryForwardMode, setCarryForwardMode] = useState<"none" | "all" | "selected">("none")
  const [balancePreviews, setBalancePreviews] = useState<BalancePreview[]>([])
  const [fromSheetLabel, setFromSheetLabel] = useState("")
  const [fromSheetId, setFromSheetId] = useState("")

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(1)
      setMonth(new Date().getMonth() + 1)
      setYear(new Date().getFullYear())
      setSelectedMembers([])
      setCarryForwardMode("none")
      setBalancePreviews([])
      setError(null)
      getActiveMembersAction().then((result) => {
        if (result.members) setMembers(result.members as MemberItem[])
      })
    }
  }, [open])

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  function selectAllMembers() {
    setSelectedMembers(members.map((m) => m.id))
  }

  async function handleNextStep() {
    if (step === 1) {
      if (!month || !year) { setError("Select month and year"); return }
      setError(null)
      setStep(2)
    } else if (step === 2) {
      if (selectedMembers.length === 0) { setError("Select at least one member"); return }
      setError(null)
      setStep(3)
    } else if (step === 3) {
      if (carryForwardMode !== "none") {
        const result = await getPreviousMonthBalancesAction(selectedMembers)
        if (result.balances) {
          setBalancePreviews(result.balances)
          setFromSheetLabel(result.fromSheetLabel || "")
          setFromSheetId(result.fromSheetId || "")
        }
      } else {
        setBalancePreviews([])
      }
      setStep(4)
    }
  }

  async function handleCreate() {
    setSaving(true)
    setError(null)

    const balances = balancePreviews.length > 0
      ? balancePreviews.map((bp) => ({ memberId: bp.memberId, amount: bp.balance }))
      : undefined
    const result = await createSheetAction({
      month,
      year,
      memberIds: selectedMembers,
      carryForward: carryForwardMode !== "none",
      importFromSheetId: fromSheetId || undefined,
      balances,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      toast.success("Sheet created successfully")
      onSuccess()
      onOpenChange(false)
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!saving) onOpenChange(open) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Month</DialogTitle>
          <DialogDescription>
            Step {step} of 4
            {step === 1 && " — Select month and year"}
            {step === 2 && " — Select active members"}
            {step === 3 && " — Choose carry forward option"}
            {step === 4 && " — Review and confirm"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                  s < step ? "bg-primary text-primary-foreground" :
                  s === step ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {s < step ? <CheckCircle2 className="size-4" /> : s}
                </div>
                {s < 4 && <div className={`h-0.5 w-6 ${s < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={String(month)} onValueChange={(v: string | null) => { if (v) setMonth(Number(v)) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.slice(1).map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2020} max={2100} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Members</Label>
                <Button variant="ghost" size="xs" onClick={selectAllMembers}>Select All</Button>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                {members.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedMembers.includes(member.id)} onCheckedChange={() => toggleMember(member.id)} />
                    {member.name}
                  </label>
                ))}
                {members.length === 0 && <p className="text-sm text-muted-foreground">No active members</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Label>Carry Forward Previous Balance</Label>
              <RadioGroup value={carryForwardMode} onValueChange={(v: string | null) => { if (v) setCarryForwardMode(v as typeof carryForwardMode) }}>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="none" />
                    <div>
                      <p className="text-sm font-medium">No Carry Forward</p>
                      <p className="text-xs text-muted-foreground">Start fresh — all opening balances set to zero</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="all" />
                    <div>
                      <p className="text-sm font-medium">Carry All Selected Members</p>
                      <p className="text-xs text-muted-foreground">Import closing balance from previous month for all selected members</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="selected" />
                    <div>
                      <p className="text-sm font-medium">Carry Selected Members Only</p>
                      <p className="text-xs text-muted-foreground">Same as above, but only for checked members</p>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="rounded-lg border p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Month</span>
                  <span className="font-medium">{MONTHS[month]} {year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium">{selectedMembers.length} selected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carry Forward</span>
                  <span className="font-medium">
                    {carryForwardMode === "none" ? "No" : `Yes (${carryForwardMode})`}
                  </span>
                </div>
                {fromSheetLabel && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From</span>
                    <span className="font-medium">{fromSheetLabel}</span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  {carryForwardMode === "none" ? "Opening Balances (manual entry)" : "Opening Balances (editable)"}
                </Label>
                <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {selectedMembers.map((memberId) => {
                    const member = members.find((m) => m.id === memberId)
                    const bp = balancePreviews.find((b) => b.memberId === memberId)
                    return (
                      <div key={memberId} className="flex items-center gap-2 px-2 py-1 text-sm">
                        <span className="flex-1">{member?.name || memberId}</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 w-28 text-right tabular-nums"
                          value={bp?.balance ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setBalancePreviews((prev) => {
                              const existing = prev.find((b) => b.memberId === memberId)
                              if (existing) {
                                return prev.map((b) =>
                                  b.memberId === memberId ? { ...b, balance: val } : b
                                )
                              }
                              return [...prev, { memberId, balance: val }]
                            })
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          {step > 1 ? (
            <Button variant="outline" onClick={() => { setStep(step - 1); setError(null) }} disabled={saving}>
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={handleNextStep}>Next</Button>
          ) : (
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 className="mr-1 size-4 animate-spin" /> Creating...</> : "Create Sheet"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
