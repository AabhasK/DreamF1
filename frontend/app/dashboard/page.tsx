import Image from "next/image"
import NextRaceCard from "./NextRaceCard"
import CircuitHistory from "./CircuitHistory"
import CirclesOverview from "./CirclesOverview"
import StandingsCard from "./StandingsCard"
import SeasonSnapshot from "./SeasonSnapshot"
import SeasonProgress from "./SeasonProgress"
import NavHeader from "@/components/NavHeader"
import Reveal from "@/components/Reveal"
import { FLAG_CODES, getTrackImage } from "@/lib/trackData"
import { getSchedule } from "@/lib/schedule"
import { DEMO_MODE } from "@/lib/demo"

export const dynamic = "force-dynamic"

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

export default async function DashboardPage() {
  const { events, backendDown } = await getSchedule()
  const today = new Date().toISOString().split("T")[0]

  // Date-based filtering — is_completed only flips after admin scoring
  const nextRace = events.find((e) => e.event_date >= today) ?? null
  const upcomingAfterNext = events.filter((e) => e.event_date > (nextRace?.event_date ?? today))
  const completed = events.filter((e) => e.event_date < today)
  const completedCount = completed.length
  const remainingCount = events.filter((e) => e.event_date >= today).length
  // Most recent completed 2026 race — drives the "Last Race" recap card
  const lastRace = completedCount > 0 ? completed[completedCount - 1] : null

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">
      <NavHeader active="dashboard" />

      {DEMO_MODE && !backendDown && (
        <div className="glass-card mt-6 px-4 py-3">
          <p className="text-xs font-(family-name:--font-dm-mono) text-text-muted">
            <span className="text-text-secondary">DEMO MODE</span> · live backend paused — serving a
            snapshot of real 2026 FastF1 data. Sign in with any username to explore picks and circles.
          </p>
        </div>
      )}

      {backendDown && (
        <div className="glass-card mt-6 p-4 border-l-2 border-f1-red">
          <p className="text-sm font-(family-name:--font-dm-mono) text-text-muted">
            Backend offline — start it with{" "}
            <code className="text-f1-red">uvicorn main:app --reload</code> in{" "}
            <code className="text-text-secondary">backend/</code>
          </p>
        </div>
      )}

      {/* ── Bento row 1: hero (2/3) + circuit history (1/3) ── */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Reveal className="lg:col-span-2">
          {nextRace ? (
            <NextRaceCard event={nextRace} />
          ) : (
            <div className="glass-card p-8 flex items-center justify-center min-h-[200px]">
              <p className="section-label text-text-dim">Season Complete</p>
            </div>
          )}
        </Reveal>

        <Reveal delay={120} className="lg:col-span-1 h-full">
          {lastRace ? (
            <CircuitHistory year={2026} roundNum={lastRace.round_number} />
          ) : (
            <div className="glass-card h-full p-5 flex flex-col items-center justify-center gap-2 min-h-[200px]">
              <p className="section-label text-text-dim">Last Race</p>
              <p className="text-text-dim text-xs font-(family-name:--font-dm-mono) text-center">
                No races completed yet this season.
              </p>
            </div>
          )}
        </Reveal>
      </div>

      {/* ── Your season (logged-in only) ── */}
      <SeasonSnapshot />

      {/* ── Championship standings ── */}
      <Reveal className="mt-4">
        <StandingsCard />
      </Reveal>

      {/* ── Season progress ── */}
      <Reveal delay={80} className="mt-4">
        <SeasonProgress
          events={events}
          completed={completedCount}
          remaining={remainingCount}
          nextRace={nextRace}
        />
      </Reveal>

      {/* ── My Circles ── */}
      <Reveal delay={80} className="mt-4">
        <CirclesOverview />
      </Reveal>

      {/* ── Upcoming races strip ── */}
      {upcomingAfterNext.length > 0 && (
        <Reveal delay={60} className="mt-6">
          <p className="section-label mb-3">Up Next</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {upcomingAfterNext.map((race) => {
              const flag = FLAG_CODES[race.country] ?? "UN"
              const thumb = getTrackImage(race.country, race.event_name)
              const raceDate = race.session5_date
                ? new Date(race.session5_date.endsWith("Z") ? race.session5_date : race.session5_date + "Z")
                : new Date(race.event_date + "T12:00:00Z")
              const date = raceDate.toLocaleDateString("en-GB", {
                day: "numeric", month: "short", timeZone: "UTC",
              })
              return (
                <div key={race.id} className="glass-card hover-lift shrink-0 w-52 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://flagsapi.com/${flag}/flat/32.png`}
                      alt={race.country}
                      className="h-4 w-auto rounded-sm opacity-80"
                    />
                    <span className="text-[0.6rem] font-(family-name:--font-dm-mono) text-text-dim uppercase tracking-widest">
                      R{race.round_number}
                    </span>
                  </div>
                  {thumb && (
                    <div className="relative h-24 opacity-50">
                      <Image src={thumb} alt={race.country} fill className="object-contain" />
                    </div>
                  )}
                  <div>
                    <p className="text-text-secondary text-xs font-(family-name:--font-dm-mono) leading-snug line-clamp-1">
                      {race.event_name}
                    </p>
                    <p className="text-text-dim text-[0.6rem] font-(family-name:--font-dm-mono) mt-0.5">{date}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Reveal>
      )}
    </div>
  )
}
