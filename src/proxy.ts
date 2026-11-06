import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedRoutes = [
  "/dashboard",
  "/deals",
  "/invoices",
  "/contacts",
  "/companies",
  "/tasks",
  "/pipeline",
  "/projects",
  "/activities",
  "/calendar",
  "/settings",
]

const authRoutes = ["/sign-in", "/sign-up"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("__Secure-better-auth.session_token")?.value

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAuthRoute = authRoutes.includes(pathname)

  if (isProtectedRoute && !sessionToken) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
