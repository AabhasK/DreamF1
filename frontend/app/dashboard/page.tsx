import type { Metadata } from "next"
import NextRace from "./NextRace"
import Championship from "./Championship"
import LastRace from "./LastRace"
import YourSeason from "./YourSeason"
import SeasonCalendar from "./SeasonCalendar"
import CirclesOverview from "./CirclesOverview"
import UpNext from "./UpNext"
import Constructors from "./Constructors"
import { getSchedule } from "@/lib/schedule"
import { getStandings } from "@/lib/serverStandings"

export type { F1Event } from "@/lib/f1"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Home" }

export default async function DashboardPage() {
  const [{ events, backendDown }, standings] = await Promise.all([getSchedule(), getStandings()])
  const today = new Date().toISOString().split("T")[0]

  // Date-based on purpose — is_completed only flips after admin scoring.
  const nextRace = events.find((e) => e.event_date >= today) ?? null
  const completed = events.filter((e) => e.event_date < today)
  const lastRace = completed.at(-1) ?? null
  const upcoming = events.filter((e) => e.event_date > (nextRace?.event_date ?? today)).slice(0, 4)

  return (
    <>
      {backendDown && (
        <div className="shell pt-6">
          <p className="border-l-2 border-f1-red bg-surface-1 px-4 py-3 text-[0.9375rem] text-text-secondary">
            The backend isn&apos;t responding. Start it with{" "}
            <code className="timing text-[0.8125rem] text-text-primary">uvicorn main:app --reload</code> in{" "}
            <code className="timing text-[0.8125rem] text-text-primary">backend/</code>.
          </p>
        </div>
      )}

      {nextRace ? (
        <NextRace event={nextRace} totalRounds={events.length} leader={standings?.constructors[0] ?? null} />
      ) : (
        <section className="shell border-b border-border-subtle py-14">
          <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">Season complete</h1>
          <p className="lede mt-2">Every 2026 round has been run. The final standings are below.</p>
        </section>
      )}

      <div className="shell pt-6 sm:pt-10">
        {/* Three columns ruled like a results sheet, stacking on smaller screens */}
        <div className="grid border-b border-border-subtle lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,3fr)]">
          <Championship />
          {lastRace ? (
            <LastRace year={2026} fromRound={lastRace.round_number} />
          ) : (
            <div className="border-t border-border-subtle py-6 lg:border-l lg:border-t-0 lg:px-6">
              <p className="text-text-muted">No race has been run yet this season.</p>
            </div>
          )}
          <aside className="space-y-8 border-t border-border-subtle py-6 lg:border-l lg:border-t-0 lg:pl-6">
            <YourSeason />
            <CirclesOverview />
            <UpNext events={upcoming} />
          </aside>
        </div>

        <Constructors />

        {events.length > 0 && (
          <SeasonCalendar events={events} nextRaceId={nextRace?.id ?? null} completed={completed.length} />
        )}
      </div>
    </>
  )
}
