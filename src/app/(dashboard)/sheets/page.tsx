"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getSheetsAction } from "@/actions/sheets"
import MealGridSection from "@/components/meals/meal-grid-section"
import { Loader2 } from "lucide-react"

export default function SheetsPage() {
  const [latestSheetId, setLatestSheetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSheetsAction().then((result) => {
      if (result.sheets && result.sheets.length > 0) {
        setLatestSheetId(result.sheets[0].id)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!latestSheetId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Meal Grid</h1>
        <p className="text-muted-foreground">
          No monthly sheets found. Go to{" "}
          <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">Settings</Link>{" "}
          to create one.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          
        </div>
      </div>
      <MealGridSection sheetId={latestSheetId} />
    </div>
  )
}
