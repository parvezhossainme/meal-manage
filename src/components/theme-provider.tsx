"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import Script from "next/script"

interface ThemeProviderProps {
  children: ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  storageKey?: string
  themes?: string[]
  forcedTheme?: string
  disableTransitionOnChange?: boolean
  enableColorScheme?: boolean
  value?: Record<string, string>
  nonce?: string
}

interface UseThemeProps {
  themes: string[]
  setTheme: (theme: string) => void
  theme?: string
  resolvedTheme?: string
  systemTheme?: "dark" | "light"
}

const ThemeContext = createContext<UseThemeProps | null>(null)

function themeScript(defaultTheme: string) {
  return `!function(){try{var d=document.documentElement,c=d.classList;c.remove('light','dark');var e=localStorage.getItem('theme');if(e){c.add(e)}else{c.add('${defaultTheme}')}}catch(e){}}()`
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "dark",
  storageKey = "theme",
  themes = ["light", "dark"],
  forcedTheme,
  value,
  nonce,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState(defaultTheme)
  const [mounted, setMounted] = useState(false)

  const apply = useCallback((t: string) => {
    const root = document.documentElement
    const attr = value?.[t] || t
    if (attribute === "class") {
      if (value) {
        Object.values(value).forEach(v => root.classList.remove(v))
      } else {
        root.classList.remove(...themes)
      }
      if (attr) root.classList.add(attr)
    } else {
      if (attr) root.setAttribute(attribute, attr)
      else root.removeAttribute(attribute)
    }
  }, [attribute, value, themes])

  useEffect(() => {
    let t: string
    try { t = localStorage.getItem(storageKey) || defaultTheme } catch { t = defaultTheme }
    setThemeState(t)
    apply(t)
    setMounted(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback((t: string) => {
    setThemeState(t)
    apply(t)
    try { localStorage.setItem(storageKey, t) } catch {}
  }, [apply, storageKey])

  const ctx: UseThemeProps = {
    themes,
    theme: forcedTheme || theme,
    setTheme,
    resolvedTheme: forcedTheme || theme,
  }

  return (
    <ThemeContext.Provider value={ctx}>
      <Script id="theme-init" strategy="beforeInteractive" nonce={nonce}>
        {themeScript(defaultTheme)}
      </Script>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): UseThemeProps {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
