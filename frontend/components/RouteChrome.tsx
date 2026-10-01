"use client"

import { usePathname } from "next/navigation"

// The sign-in screens are full-bleed and carry their own way back, so the
// site header, demo bar and footer step aside there.
const BARE_ROUTES = new Set(["/login", "/register"])

export default function RouteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (BARE_ROUTES.has(pathname)) return null
  return <>{children}</>
}
