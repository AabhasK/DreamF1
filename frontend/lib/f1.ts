// Shared race-weekend helpers used across the dashboard, nav ticker, predict and telemetry pages.
import { FLAG_CODES, parseUTC } from "@/lib/trackData"

export interface F1Event {
  id: number
  round_number: number
  event_name: string
  country: string
  event_date: string
  is_completed: boolean
  session1_name: string | null
  session1_date: string | null
  session2_name: string | null
  session2_date: string | null
  session3_name: string | null
  session3_date: string | null
  session4_name: string | null
  session4_date: string | null
  session5_name: string | null
  session5_date: string | null
}

export interface Session {
  name: string
  abbrev: string
  start: Date
  end: Date
}

export function abbrevSession(name: string): string {
  const n = name.toLowerCase()
  if (n === "race") return "RACE"
  if (n.includes("practice 1")) return "FP1"
  if (n.includes("practice 2")) return "FP2"
  if (n.includes("practice 3")) return "FP3"
  if (n.includes("sprint shootout") || n.includes("sprint qualifying")) return "SQ"
  if (n.includes("sprint")) return "SPRINT"
  if (n.includes("qualifying")) return "QUALI"
  return name.toUpperCase()
}

// Rough session lengths, only used to tell "live now" from "starts in".
function sessionMinutes(abbrev: string): number {
  if (abbrev === "RACE") return 120
  if (abbrev === "SQ") return 45
  return 60
}

export function eventSessions(ev: F1Event): Session[] {
  const out: Session[] = []
  for (let i = 1; i <= 5; i++) {
    const name = ev[`session${i}_name` as keyof F1Event] as string | null
    const start = parseUTC(ev[`session${i}_date` as keyof F1Event] as string | null)
    if (!name || !start) continue
    const abbrev = abbrevSession(name)
    out.push({ name, abbrev, start, end: new Date(start.getTime() + sessionMinutes(abbrev) * 60000) })
  }
  return out
}

/** The session that is running now, or the next one to start, across the whole calendar. */
export function currentOrNextSession(
  events: F1Event[],
  now: number,
): { event: F1Event; session: Session; live: boolean } | null {
  for (const event of events) {
    for (const session of eventSessions(event)) {
      if (session.end.getTime() <= now) continue
      return { event, session, live: session.start.getTime() <= now }
    }
  }
  return null
}

/** "Bahrain Grand Prix" -> { place: "Bahrain", suffix: "Grand Prix" } */
export function splitRaceName(name: string): { place: string; suffix: string } {
  const m = name.match(/^(.*?)\s+(Grand Prix)$/i)
  return m ? { place: m[1], suffix: m[2] } : { place: name, suffix: "" }
}

export function flagUrl(country: string, size: 32 | 64 = 64): string {
  return `https://flagsapi.com/${FLAG_CODES[country] ?? "UN"}/flat/${size}.png`
}

/** Seconds -> "1:35.587" */
export function fmtLap(s: number | null | undefined): string {
  if (s == null || !isFinite(s) || s <= 0) return "—"
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toFixed(3).padStart(6, "0")}`
}

/** Race start for an event, falling back to race-day noon UTC. */
export function raceStart(ev: F1Event): Date {
  return parseUTC(ev.session5_date) ?? new Date(ev.event_date + "T12:00:00Z")
}

/** "Fri 2 Oct" in the viewer's timezone */
export function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

/** "10:00" in the viewer's timezone */
export function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

/** "2–4 Oct" style range for a race weekend (first session to race day). */
export function weekendRange(ev: F1Event): string {
  const sessions = eventSessions(ev)
  const end = raceStart(ev)
  const start = sessions[0]?.start ?? end
  const sameMonth = start.getUTCMonth() === end.getUTCMonth()
  const startStr = start.toLocaleDateString("en-GB", { day: "numeric", ...(sameMonth ? {} : { month: "short" }), timeZone: "UTC" })
  const endStr = end.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
  return startStr === endStr ? endStr : `${startStr}–${endStr}`
}

/** Countdown parts for a target timestamp. */
export function timeLeft(target: number, now: number) {
  const diff = Math.max(0, target - now)
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    total: diff,
  }
}

/** Short "1d 04h" / "3h 12m" / "8m" label for compact countdowns. */
export function shortCountdown(target: number, now: number): string {
  const t = timeLeft(target, now)
  if (t.days > 0) return `${t.days}d ${String(t.hours).padStart(2, "0")}h`
  if (t.hours > 0) return `${t.hours}h ${String(t.minutes).padStart(2, "0")}m`
  return `${Math.max(1, t.minutes)}m`
}
