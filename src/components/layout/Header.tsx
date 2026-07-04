"use client"

import { useEffect, useState } from "react"
import { Menu, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserNav } from "./UserNav"
import type { SessionUser } from "@/lib/auth"

interface HeaderProps {
  user: SessionUser
  onMenuClick: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={
        "sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4 backdrop-blur-md transition-all duration-200 " +
        (scrolled ? "bg-background/95 shadow-xs" : "bg-background/50")
      }
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Menu className="size-5" />
      </Button>
      <div className="flex items-center gap-2 font-semibold lg:hidden">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <UtensilsCrossed className="size-3.5" />
        </span>
        <span>Meal Manage</span>
      </div>
      <div className="flex-1" />
      <UserNav user={user} />
    </header>
  )
}
