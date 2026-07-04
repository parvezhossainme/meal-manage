"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import MealGridSection from "@/components/meals/meal-grid-section"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function MealGridPage() {
  const params = useParams()
  const sheetId = params.id as string

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/sheets/${sheetId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Meal Grid</h1>
          <p className="text-sm text-muted-foreground">
            Click to pick a value (0, 0.5, 1, 1.5, 2, 3). Double-click or use arrow keys to fine-tune.
          </p>
        </div>
      </div>

      <MealGridSection sheetId={sheetId} />
    </div>
  )
}
