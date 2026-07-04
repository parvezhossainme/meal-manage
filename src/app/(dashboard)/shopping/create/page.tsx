"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createShoppingAction } from "@/actions/shopping"
import { getActiveMembersAction } from "@/actions/members"
import { getSheetsListAction } from "@/actions/reports"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

const bazarSchema = z.object({
  monthlySheetId: z.string(),
  date: z.string(),
  purchasedById: z.string().min(1, "Select who did the bazar"),
  totalCost: z.number().positive("Total cost must be positive"),
  details: z.string().optional(),
})

type BazarFormValues = z.infer<typeof bazarSchema>

export default function CreateBazarPage() {
  const router = useRouter()
  const [sheets, setSheets] = useState<Array<{ id: string; label: string }>>([])
  const [members, setMembers] = useState<Array<{ id: string; name: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const form = useForm<BazarFormValues>({
    resolver: zodResolver(bazarSchema),
    defaultValues: {
      monthlySheetId: "",
      date: new Date().toISOString().split("T")[0],
      purchasedById: "",
      totalCost: undefined as unknown as number,
      details: "",
    },
  })

  const fetchSheets = useCallback(async () => {
    const result = await getSheetsListAction()
    if (result.sheets) {
      setSheets(result.sheets)
      if (result.sheets.length > 0 && !form.getValues("monthlySheetId")) {
        form.setValue("monthlySheetId", result.sheets[0].id)
      }
    }
  }, [form])

  const fetchMembers = useCallback(async () => {
    const result = await getActiveMembersAction()
    if (result.members) {
      setMembers(result.members.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })))
    }
  }, [])

  useEffect(() => {
    fetchSheets()
    fetchMembers()
  }, [fetchSheets, fetchMembers])

  const onSubmit = async (values: BazarFormValues) => {
    setSubmitting(true)
    setError("")
    const result = await createShoppingAction(values)
    if (result.success) {
      router.push("/shopping")
    } else {
      setError(result.error || "Failed to create bazar entry")
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Bazar Entry</h1>
          <p className="text-sm text-muted-foreground">Record a new bazar entry</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bazar Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monthlySheetId">Month *</Label>
                <Select
                  value={form.watch("monthlySheetId")}
                  onValueChange={(v: string | null) => { if (v) form.setValue("monthlySheetId", v, { shouldValidate: true }) }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select month">
                      {(value: string | null) => value ? (sheets.find(s => s.id === value)?.label || value) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" {...form.register("date")} />
                {form.formState.errors.date && (
                  <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchasedById">Who did bazar? *</Label>
              <Select
                value={form.watch("purchasedById")}
                onValueChange={(v: string | null) => { if (v) form.setValue("purchasedById", v, { shouldValidate: true }) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select person">
                    {(value: string | null) => value ? (members.find(m => m.id === value)?.name || value) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.purchasedById && (
                <p className="text-xs text-destructive">{form.formState.errors.purchasedById.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Items bought</Label>
              <Textarea
                id="details"
                placeholder="e.g. Rice 5kg, Potato 3kg, Onion 2kg, Cooking oil 1L"
                rows={4}
                {...form.register("details")}
              />
              <p className="text-xs text-muted-foreground">List all items in a single line or paragraph</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalCost">Total Cost *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
                <Input
                  id="totalCost"
                  type="number"
                  step="any"
                  min="0"
                  className="pl-7"
                  placeholder="0.00"
                  {...form.register("totalCost", { valueAsNumber: true })}
                />
              </div>
              {form.formState.errors.totalCost && (
                <p className="text-xs text-destructive">{form.formState.errors.totalCost.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Bazar Entry"}
          </Button>
        </div>
      </form>
    </div>
  )
}
