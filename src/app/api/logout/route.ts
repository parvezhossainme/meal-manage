import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const response = NextResponse.redirect(new URL("/login", origin))
  response.cookies.set("session", "", { maxAge: 0, path: "/" })
  return response
}
