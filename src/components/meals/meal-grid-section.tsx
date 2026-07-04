"use client"

import { useState, useEffect, useRef } from "react"
import { getMealGridAction, updateMealCellAction, updateDefaultMealAction, getGuestMealsAction } from "@/actions/meals"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const MEAL_VALUES = [0, 0.5, 1, 1.5, 2, 3]

interface GridRow {
  date: Date
  day: number
  dayName: string
  items: Record<string, number | null>
  entryId?: string
  total: number
}

interface GridMember {
  id: string
  name: string
}

interface DefaultMealMap {
  [memberId: string]: number
}

export default function MealGridSection({ sheetId }: { sheetId: string }) {
  const [grid, setGrid] = useState<GridRow[]>([])
  const [members, setMembers] = useState<GridMember[]>([])
  const [guestMeals, setGuestMeals] = useState<Array<{ date: Date; mealCount: number }>>([])

  const [defaultMeals, setDefaultMeals] = useState<DefaultMealMap>({})
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [savingCell, setSavingCell] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{ day: number; memberId: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [showValuePicker, setShowValuePicker] = useState<{ day: number; memberId: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function loadGrid() {
    if (!sheetId) return
    const [gridResult, guestResult] = await Promise.all([
      getMealGridAction(sheetId),
      getGuestMealsAction(sheetId),
    ])
    if (gridResult.grid) {
      setGrid(gridResult.grid as GridRow[])
      setMembers(gridResult.members as GridMember[])
      setCanEdit(gridResult.canEdit ?? false)
      if (gridResult.defaultMeals) {
        const map = gridResult.defaultMeals as Map<string, number>
        const obj: DefaultMealMap = {}
        map.forEach((value, key) => { obj[key] = value })
        setDefaultMeals(obj)
      }
    }
    if (guestResult.guestMeals) setGuestMeals(guestResult.guestMeals)
  }

  useEffect(() => {
    if (!sheetId) return
    Promise.all([
      getMealGridAction(sheetId),
      getGuestMealsAction(sheetId),
    ]).then(([gridResult, guestResult]) => {
      if (gridResult.grid) {
        setGrid(gridResult.grid as GridRow[])
        setMembers(gridResult.members as GridMember[])
        setCanEdit(gridResult.canEdit ?? false)
        if (gridResult.defaultMeals) {
          const map = gridResult.defaultMeals as Map<string, number>
          const obj: DefaultMealMap = {}
          map.forEach((value, key) => { obj[key] = value })
          setDefaultMeals(obj)
        }
      }
      if (guestResult.guestMeals) setGuestMeals(guestResult.guestMeals)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [sheetId])

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  const totalRow = members.reduce(
    (acc, member) => {
      const defaultVal = defaultMeals[member.id] || 0
      acc[member.id] = grid.reduce((sum, row) => sum + (row.items[member.id] ?? 0), 0) + defaultVal
      return acc
    },
    { total: 0 } as Record<string, number>
  )
  totalRow.total = Object.values(totalRow).reduce((a, b) => a + b, 0)

  const totalGuestMeals = guestMeals.reduce((sum, g) => sum + g.mealCount, 0)
  const combinedTotal = totalRow.total + totalGuestMeals

  const midDay = 15
  const firstHalfRows = grid.filter(r => r.day <= midDay)
  const secondHalfRows = grid.filter(r => r.day > midDay)

  function computeHalfTotals(rows: GridRow[], includeDefault: boolean) {
    const totals = members.reduce(
      (acc, member) => {
        const defaultVal = includeDefault ? (defaultMeals[member.id] || 0) : 0
        acc[member.id] = rows.reduce((sum, row) => sum + (row.items[member.id] ?? 0), 0) + defaultVal
        return acc
      },
      { total: 0 } as Record<string, number>
    )
    totals.total = Object.values(totals).reduce((a, b) => a + b, 0)
    return totals
  }

  const firstHalfTotals = computeHalfTotals(firstHalfRows, true)
  const secondHalfTotals = computeHalfTotals(secondHalfRows, false)

  function getCellValue(day: number, memberId: string): number | null {
    const row = grid.find((r) => r.day === day)
    return row?.items[memberId] ?? null
  }

  function getCellKey(day: number, memberId: string): string {
    return `${day}-${memberId}`
  }

  function handleCellClick(day: number, memberId: string) {
    if (!canEdit) return
    if (editingCell || showValuePicker) {
      setEditingCell(null)
      setShowValuePicker(null)
      return
    }
    setShowValuePicker({ day, memberId })
  }

  function handleCellDoubleClick(day: number, memberId: string) {
    if (!canEdit) return
    setShowValuePicker(null)
    const current = getCellValue(day, memberId)
    setEditingCell({ day, memberId })
    setEditValue(current === null ? "" : String(current))
  }

  function handleSelectValue(day: number, memberId: string, value: number) {
    setShowValuePicker(null)
    setEditingCell(null)
    saveCell(day, memberId, value)
  }

  async function saveDefaultMeal(memberId: string, count: number) {
    const result = await updateDefaultMealAction({
      monthlySheetId: sheetId,
      memberId,
      count,
    })
    if (result.error) {
      toast.error(result.error)
    }
    loadGrid()
  }

  function handleDefaultCellDoubleClick(memberId: string) {
    if (!canEdit) return
    const current = defaultMeals[memberId] ?? 0
    setEditingCell({ day: 0, memberId })
    setEditValue(String(current))
  }

  async function saveCell(day: number, memberId: string, count: number) {
    const row = grid.find((r) => r.day === day)
    if (!row) return
    const key = getCellKey(day, memberId)
    setSavingCell(key)
    const result = await updateMealCellAction({
      monthlySheetId: sheetId,
      date: row.date.toISOString().split("T")[0],
      memberId,
      count,
      mealEntryId: row.entryId,
      mealEntryItemId: undefined,
    })
    if (result.error) {
      toast.error(result.error)
    }
    setSavingCell(null)
    loadGrid()
  }

  function handleEditBlur(day: number, memberId: string) {
    if (editingCell?.day === day && editingCell?.memberId === memberId) {
      const val = parseFloat(editValue)
      if (!isNaN(val) && val >= 0) {
        if (day === 0) {
          if (val <= 50 && Number.isInteger(val)) {
            saveDefaultMeal(memberId, val)
          }
        } else {
          if (val <= 3 && val % 0.5 === 0) {
            saveCell(day, memberId, val)
          }
        }
      }
      setEditingCell(null)
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent, day: number, memberId: string, colIndex: number, rowIndex: number, rows: GridRow[]) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleEditBlur(day, memberId)
      const nextRow = rows[rowIndex + 1]
      if (nextRow) {
        setEditingCell({ day: nextRow.day, memberId })
        setEditValue(String(getCellValue(nextRow.day, memberId)))
      }
    } else if (e.key === "Tab") {
      e.preventDefault()
      handleEditBlur(day, memberId)
      const nextCol = members[colIndex + 1]
      const currentRow = rows[rowIndex]
      if (nextCol && currentRow) {
        setEditingCell({ day: currentRow.day, memberId: nextCol.id })
        setEditValue(String(getCellValue(currentRow.day, nextCol.id)))
      } else if (!nextCol && rows[rowIndex + 1]) {
        const nextRow = rows[rowIndex + 1]
        const firstMember = members[0]
        if (nextRow && firstMember) {
          setEditingCell({ day: nextRow.day, memberId: firstMember.id })
          setEditValue(String(getCellValue(nextRow.day, firstMember.id)))
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      handleEditBlur(day, memberId)
      const nextRow = rows[rowIndex + 1]
      if (nextRow) {
        setEditingCell({ day: nextRow.day, memberId })
        setEditValue(String(getCellValue(nextRow.day, memberId)))
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      handleEditBlur(day, memberId)
      const prevRow = rows[rowIndex - 1]
      if (prevRow) {
        setEditingCell({ day: prevRow.day, memberId })
        setEditValue(String(getCellValue(prevRow.day, memberId)))
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      handleEditBlur(day, memberId)
      const nextCol = members[colIndex + 1]
      if (nextCol) {
        setEditingCell({ day, memberId: nextCol.id })
        setEditValue(String(getCellValue(day, nextCol.id)))
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      handleEditBlur(day, memberId)
      const prevCol = members[colIndex - 1]
      if (prevCol) {
        setEditingCell({ day, memberId: prevCol.id })
        setEditValue(String(getCellValue(day, prevCol.id)))
      }
    } else if (e.key === "Escape") {
      setEditingCell(null)
    }
  }

  function renderTable(rows: GridRow[], totals: Record<string, number>, showDefault = true) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-3">
          <div>
            <table className="w-full table-fixed border-collapse text-xs">
              <thead>
                <tr className="sticky top-0 z-10 bg-muted">
                  <th className="w-7 border-b border-r bg-muted px-0.5 py-2 text-center font-medium text-[10px]">
                    Date
                  </th>
                  {members.map((member) => (
                    <th
                      key={member.id}
                      className="w-12 border-b px-0.5 py-2 text-center font-medium text-[10px]"
                    >
                      <span className="block truncate" title={member.name}>
                        {member.name.split(" ")[0]}
                      </span>
                    </th>
                  ))}
                  <th className="w-8 border-b bg-muted/50 px-0.5 py-2 text-center font-medium text-[10px]">
                    T
                  </th>

                </tr>
              </thead>
              <tbody>
                {showDefault && members.length > 0 && (
                  <tr className="bg-amber-50/50 hover:bg-amber-50/80" style={{ position: 'sticky', top: '30px', zIndex: 5 }}>
                    <td className="w-7 border-b border-r bg-amber-50/50 px-0.5 py-1.5 font-medium whitespace-nowrap text-[10px] text-amber-700">
                      Default
                    </td>
                    {members.map((member) => {
                      const value = defaultMeals[member.id]
                      const isEditing = editingCell?.day === 0 && editingCell?.memberId === member.id
                      return (
                        <td key={member.id} className="border-b px-0 py-0 text-center relative">
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="number"
                              min={0}
                              max={50}
                              step={1}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleEditBlur(0, member.id)}
                              onKeyDown={(e) => handleEditKeyDown(e, 0, member.id, members.indexOf(member), -1, rows)}
                              className="h-8 w-full border-0 bg-accent text-center text-xs font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          ) : (
                            <button
                              type="button"
                              className={`h-8 w-full transition-colors ${
                                canEdit ? "cursor-pointer hover:bg-accent/50" : "cursor-default"
                              } ${
                                value === undefined ? "text-muted-foreground/40" : value > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                              } ${savingCell === `0-${member.id}` ? "opacity-50" : ""}`}
                              onDoubleClick={() => handleDefaultCellDoubleClick(member.id)}
                            >
                              {value === undefined ? (
                                <svg className="mx-auto size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              ) : (
                                value
                              )}
                            </button>
                          )}
                        </td>
                      )
                    })}
                    <td className="border-b bg-muted/30 px-1.5 py-1.5 text-center font-medium text-amber-700">
                      {Object.values(defaultMeals).reduce((a, b) => a + b, 0).toFixed(1)}
                    </td>
                  </tr>
                )}
                {rows.map((row, rowIndex) => {
                  return (
                    <tr key={row.day} className="hover:bg-muted/30">
                      <td className="w-7 border-b border-r bg-background px-0.5 py-1.5 text-center font-medium text-[10px]">
                        {row.day}
                      </td>
                      {members.map((member, colIndex) => {
                        const cellKey = getCellKey(row.day, member.id)
                        const value = row.items[member.id]
                        const isEditing = editingCell?.day === row.day && editingCell?.memberId === member.id
                        const isNearBottom = rowIndex >= rows.length - 5
                        return (
                          <td key={member.id} className="border-b px-0 py-0 text-center relative">
                            {isEditing ? (
                              <input
                                ref={inputRef}
                                type="number"
                                min={0}
                                max={3}
                                step={0.5}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleEditBlur(row.day, member.id)}
                                onKeyDown={(e) => handleEditKeyDown(e, row.day, member.id, colIndex, rowIndex, rows)}
                                className="h-8 w-full border-0 bg-accent text-center text-xs font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            ) : showValuePicker?.day === row.day && showValuePicker?.memberId === member.id ? (
                              <div className={`absolute left-1/2 z-50 -translate-x-1/2 flex flex-col gap-0 rounded-md border bg-popover p-1 shadow-md ${isNearBottom ? "bottom-full mb-1" : "top-full mt-1"}`}>
                                {MEAL_VALUES.map((mv) => (
                                  <button
                                    key={mv}
                                    type="button"
                                    className={`whitespace-nowrap rounded px-3 py-0.5 text-xs font-medium transition-colors ${
                                      value === mv
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    }`}
                                    onClick={() => handleSelectValue(row.day, member.id, mv)}
                                  >
                                    {mv}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={`h-8 w-full transition-colors ${
                                  canEdit ? "cursor-pointer hover:bg-accent/50" : "cursor-default"
                                } ${
                                  value === null ? "text-muted-foreground/40" : value > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                                } ${savingCell === cellKey ? "opacity-50" : ""}`}
                                onClick={() => handleCellClick(row.day, member.id)}
                                onDoubleClick={() => handleCellDoubleClick(row.day, member.id)}
                              >
                                {value === null ? (
                                  <svg className="mx-auto size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                ) : (
                                  value
                                )}
                              </button>
                            )}
                          </td>
                        )
                      })}
                      <td className="border-b bg-muted/30 px-1.5 py-1.5 text-center font-medium">
                        {row.total.toFixed(1)}
                      </td>
                    </tr>
                  )
                })}
                <tr className="sticky bottom-0 bg-muted/80 font-medium">
                  <td className="w-7 border-t bg-muted px-1 py-2 text-left font-medium text-[10px]">
                    Total
                  </td>
                  {members.map((member) => (
                    <td key={member.id} className="border-t px-1.5 py-2 text-center font-medium">
                      {totals[member.id]?.toFixed(1) || "0.0"}
                    </td>
                  ))}
                  <td className="border-t bg-muted/50 px-1.5 py-2 text-center font-semibold">
                    {totals.total.toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No active members to display meal grid.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Member Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalRow.total.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Guest Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalGuestMeals.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Combined Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{combinedTotal.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{grid.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {firstHalfRows.length > 0 && renderTable(firstHalfRows, firstHalfTotals, true)}
        {secondHalfRows.length > 0 && renderTable(secondHalfRows, secondHalfTotals, false)}
      </div>
    </div>
  )
}


