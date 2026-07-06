"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { loginAction } from "@/actions/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Eye, UtensilsCrossed } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => loginAction(formData),
    null
  )

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard")
    }
  }, [state, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <UtensilsCrossed className="size-12 mb-4 text-primary" />
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <CardTitle>Meal Manage</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Eye className="size-4" />
              Go Public Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
