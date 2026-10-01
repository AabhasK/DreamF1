// Server-side standings for SSR pages: the demo snapshot, or the live API via API_URL.
// Client components use fetchStandings() in lib/standings.ts instead.
import { DEMO_MODE, readDemo } from "@/lib/demo"
import type { StandingsData } from "@/lib/standings"

export async function getStandings(year = 2026): Promise<StandingsData | null> {
  if (DEMO_MODE) return readDemo<StandingsData>(`standings/${year}`)
  try {
    const res = await fetch(`${process.env.API_URL ?? "http://localhost:8080"}/api/standings/${year}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as StandingsData
    return data._error ? null : data
  } catch {
    return null
  }
}
