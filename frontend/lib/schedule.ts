// Server-side schedule fetch shared by the SSR pages (dashboard, telemetry, predict, compare).
// Server components can't use the relative `/api/*` path, so they call the backend directly
// via API_URL — or, in demo mode, read the snapshot straight off disk.
import type { F1Event } from "@/app/dashboard/page"
import { DEMO_MODE, readDemo } from "@/lib/demo"

export async function getSchedule(): Promise<{ events: F1Event[]; backendDown: boolean }> {
  if (DEMO_MODE) {
    const events = await readDemo<F1Event[]>("schedule")
    return { events: events ?? [], backendDown: !events }
  }
  try {
    const res = await fetch(`${process.env.API_URL ?? "http://localhost:8080"}/api/schedule`, {
      cache: "no-store",
    })
    if (!res.ok) return { events: [], backendDown: true }
    const events: F1Event[] = await res.json()
    return { events, backendDown: false }
  } catch {
    return { events: [], backendDown: true }
  }
}
