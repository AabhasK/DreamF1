"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { clearSession, useSession } from "@/lib/auth"
import Logo from "@/components/Logo"
import { currentOrNextSession, shortCountdown, splitRaceName, type F1Event } from "@/lib/f1"

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/telemetry", label: "Telemetry" },
  { href: "/compare", label: "Compare" },
  { href: "/standings", label: "Standings" },
  { href: "/predict", label: "Predict" },
  { href: "/predictions", label: "My picks" },
  { href: "/circles", label: "Circles" },
]

// Every page shares one header, so the schedule is fetched once per tab.
let schedulePromise: Promise<F1Event[]> | null = null
function loadSchedule(): Promise<F1Event[]> {
  schedulePromise ??= fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/schedule`)
    .then((r) => (r.ok ? r.json() : []))
    .then((d) => (Array.isArray(d) ? d : []))
    .catch(() => {
      schedulePromise = null
      return []
    })
  return schedulePromise
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** "Bahrain  FP1  12h 41m" — the next session on the calendar, or the one running now. */
function SessionTicker({ compact = false }: { compact?: boolean }) {
  const [events, setEvents] = useState<F1Event[] | null>(null)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    loadSchedule().then((e) => alive && setEvents(e))
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 30_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  if (!events || now === null) return null
  const info = currentOrNextSession(events, now)
  if (!info) return null
  const { event, session, live } = info
  const when = live ? "is live now" : `starts in ${shortCountdown(session.start.getTime(), now)}`

  return (
    <Link
      href="/predict"
      aria-label={`${event.event_name}: ${session.name} ${when}`}
      className="inline-flex h-9 items-center gap-2 whitespace-nowrap border border-border-default px-3 text-[0.8125rem] transition-colors corner-sm hover:border-border-muted"
    >
      <span className="relative flex size-2 shrink-0" aria-hidden="true">
        {live && <span className="absolute inset-0 rounded-full bg-f1-red opacity-75 motion-safe:animate-ping" />}
        <span className={`relative size-2 rounded-full ${live ? "bg-f1-red" : "bg-text-muted"}`} />
      </span>
      {!compact && <span className="font-semibold text-text-primary">{splitRaceName(event.event_name).place}</span>}
      <span className="timing text-[0.75rem] text-text-secondary">{session.abbrev}</span>
      <span className="timing text-[0.75rem] text-text-primary">
        {live ? "LIVE" : shortCountdown(session.start.getTime(), now)}
      </span>
    </Link>
  )
}

function UserBadge({ name, size = "size-7" }: { name: string | null; size?: string }) {
  return (
    <span
      className={`heading flex ${size} shrink-0 items-center justify-center bg-f1-red text-[0.8rem] text-white corner-sm`}
      aria-hidden="true"
    >
      {(name ?? "?").charAt(0).toUpperCase()}
    </span>
  )
}

export default function NavHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { token, username } = useSession()
  const authed = token === undefined ? null : !!token
  const user = username ?? null
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Open menu: focus the close button, close on Escape, freeze the page behind it.
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.documentElement.style.overflow = prev
    }
  }, [open])

  function closeMenu() {
    setOpen(false)
    toggleRef.current?.focus()
  }

  function logout() {
    clearSession()
    setOpen(false)
    router.push("/login")
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-0/88 backdrop-blur-md">
        <div className="shell flex h-(--nav-h) items-center gap-4 lg:gap-8">
          <Link href="/dashboard" className="shrink-0 text-[1.05rem] sm:text-[1.15rem]" aria-label="DreamF1 home">
            <Logo />
          </Link>

          <nav aria-label="Main" className="hidden h-full items-stretch lg:flex">
            {LINKS.map(({ href, label }) => {
              const active = isActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center px-3 text-[0.875rem] font-medium transition-colors ${
                    active ? "text-text-primary" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {label}
                  {active && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-f1-red" aria-hidden="true" />}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
            <span className="hidden xl:inline-flex">
              <SessionTicker />
            </span>
            <span className="inline-flex xl:hidden">
              <SessionTicker compact />
            </span>

            <div className="hidden min-w-24 items-center justify-end gap-3 lg:flex">
              {authed === null ? null : authed ? (
                <>
                  <span className="flex items-center gap-2 text-[0.875rem] text-text-secondary" title={user ?? undefined}>
                    <UserBadge name={user} />
                    <span className="max-w-28 truncate">{user}</span>
                  </span>
                  <button
                    onClick={logout}
                    className="text-[0.875rem] font-medium text-text-muted transition-colors hover:text-text-primary"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link href="/login" className="btn btn-primary btn-sm">
                  Sign in
                </Link>
              )}
            </div>

            <button
              ref={toggleRef}
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="site-menu"
              className="flex size-10 flex-col items-center justify-center gap-1.5 lg:hidden"
            >
              <span className="sr-only">Open menu</span>
              <span className="block h-0.5 w-5 bg-text-primary" aria-hidden="true" />
              <span className="block h-0.5 w-5 bg-text-primary" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Kept outside <header>: its backdrop-filter would otherwise become the
          containing block for this fixed overlay. */}
      <div
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
        data-lenis-prevent
        className={`fixed inset-0 z-50 flex flex-col bg-surface-0 transition-[opacity,transform] duration-300 ease-snap lg:hidden ${
          open ? "opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="shell flex h-(--nav-h) shrink-0 items-center justify-between border-b border-border-subtle">
          <Link href="/dashboard" onClick={() => setOpen(false)} className="text-[1.05rem]" aria-label="DreamF1 home">
            <Logo />
          </Link>
          <button ref={closeRef} onClick={closeMenu} className="relative flex size-10 items-center justify-center">
            <span className="sr-only">Close menu</span>
            <span className="absolute h-0.5 w-5 rotate-45 bg-text-primary" aria-hidden="true" />
            <span className="absolute h-0.5 w-5 -rotate-45 bg-text-primary" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main" className="shell flex-1 overflow-y-auto py-4">
          <ul>
            {LINKS.map(({ href, label }) => {
              const active = isActive(pathname, href)
              return (
                <li key={href} className="border-b border-border-subtle">
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between py-3.5 ${active ? "text-text-primary" : "text-text-secondary"}`}
                  >
                    <span className="display text-[clamp(1.75rem,8vw,2.5rem)]">{label}</span>
                    {active && <span className="h-6 w-1.5 bg-f1-red" aria-hidden="true" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="shell flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle py-4">
          {authed ? (
            <>
              <span className="flex min-w-0 items-center gap-2.5 text-text-secondary">
                <UserBadge name={user} size="size-8" />
                <span className="truncate">{user}</span>
              </span>
              <button onClick={logout} className="btn btn-ghost btn-sm">
                Log out
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="btn btn-primary w-full">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
