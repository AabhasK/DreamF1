"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Podium from "@/components/Podium"
import { TEAMS, TEAM_COLORS } from "@/lib/design"

interface Finisher {
  position: number
  code: string
  team_slug: string
}

interface CircuitHistoryData {
  year: number
  event_name: string | null
  winner: string | null
  winner_team: string | null
  winner_team_slug: string | null
  podium: Finisher[]
  pole: string | null
  fastest_lap_driver: string | null
  fastest_lap_time: string | null
  safety_car: boolean
  dnf_count: number
  total_laps: number | null
  incidents: {
    yellow_flags: number
    red_flags: number
    safety_car: number
    virtual_sc: number
    penalties: number
    investigations: number
  } | null
  weather: {
    air_temp: number | null
    track_temp: number | null
    track_temp_max: number | null
    humidity: number | null
    wind_speed: number | null
    rain: boolean
  } | null
  _error?: string
}

async function fetchHistory(year: number, round: number): Promise<CircuitHistoryData | null> {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/circuit_history/${year}/${round}`)
    if (!r.ok) return null
    const d = (await r.json()) as CircuitHistoryData
    return d && !d._error && d.podium?.length ? d : null
  } catch {
    return null
  }
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border-subtle pb-3">
      <dt className="label">{label}</dt>
      <dd className="mt-1 text-[0.9375rem]">{children}</dd>
    </div>
  )
}

function Code({ code }: { code: string | null }) {
  if (!code) return <span className="text-text-muted">—</span>
  return (
    <span className="timing" style={{ color: TEAM_COLORS[code] }}>
      {code}
    </span>
  )
}

export default function LastRace({ year, fromRound }: { year: number; fromRound: number }) {
  const [state, setState] = useState<{ round: number; data: CircuitHistoryData } | null | "loading">("loading")

  useEffect(() => {
    let alive = true
    ;(async () => {
      // The newest round may be run but not yet published, so walk back to the latest with results.
      for (let r = fromRound; r >= Math.max(1, fromRound - 3); r--) {
        const d = await fetchHistory(year, r)
        if (!alive) return
        if (d) {
          setState({ round: r, data: d })
          return
        }
      }
      if (alive) setState(null)
    })()
    return () => {
      alive = false
    }
  }, [year, fromRound])

  if (state === null) return null

  if (state === "loading") {
    return (
      <section className="animate-pulse border-t border-border-subtle py-6 lg:border-l lg:border-t-0 lg:px-6" aria-busy="true">
        <div className="h-7 w-40 bg-surface-1" />
        <div className="mt-6 h-72 bg-surface-1" />
        <div className="mt-6 h-32 bg-surface-1" />
      </section>
    )
  }

  const { round, data } = state
  const w = data.weather
  const inc = data.incidents
  const winnerTeam = TEAMS.find((t) => t.slug === data.winner_team_slug)?.name ?? data.winner_team
  const raceControl = inc
    ? [
        inc.red_flags && `${inc.red_flags} red flag${inc.red_flags > 1 ? "s" : ""}`,
        inc.safety_car && `${inc.safety_car} safety car${inc.safety_car > 1 ? "s" : ""}`,
        inc.virtual_sc && `${inc.virtual_sc} VSC`,
        inc.yellow_flags && `${inc.yellow_flags} yellow flags`,
        inc.penalties && `${inc.penalties} penalt${inc.penalties > 1 ? "ies" : "y"}`,
      ].filter(Boolean)
    : []

  return (
    <section className="border-t border-border-subtle py-6 lg:border-l lg:border-t-0 lg:px-6" aria-labelledby="last-race-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="last-race-title" className="heading text-[1.125rem]">
          Last race
        </h2>
        <Link href={`/telemetry?round=${round}`} className="link text-[0.875rem]">
          Race analysis
        </Link>
      </div>
      <p className="mt-1 text-[0.875rem] text-text-muted">
        {data.event_name}, round {round}
      </p>

      <div className="mt-4">
        <Podium
          size="sm"
          entries={data.podium
            .filter((p) => p.position >= 1 && p.position <= 3)
            .map((p) => ({ position: p.position as 1 | 2 | 3, code: p.code, slug: p.team_slug }))}
        />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
        <Fact label="Winner">
          <Code code={data.winner} /> <span className="text-text-muted">{winnerTeam}</span>
        </Fact>
        <Fact label="Pole position">
          <Code code={data.pole} />
        </Fact>
        <Fact label="Fastest lap">
          <Code code={data.fastest_lap_driver} />{" "}
          {data.fastest_lap_time && <span className="timing text-f1-purple">{data.fastest_lap_time}</span>}
        </Fact>
        <Fact label="Retirements">
          <span className="timing">{data.dnf_count}</span>
        </Fact>
        <Fact label="Safety car">{data.safety_car ? "Deployed" : "Not needed"}</Fact>
        {w && (
          <Fact label="Track and air">
            <span className="timing">
              {w.track_temp ?? "—"}° / {w.air_temp ?? "—"}°
            </span>{" "}
            <span className="text-text-muted">{w.rain ? "wet" : "dry"}</span>
          </Fact>
        )}
        {raceControl.length > 0 && (
          <div className="col-span-2">
            <dt className="label">Race control</dt>
            <dd className="mt-1 text-[0.875rem] text-text-secondary">{raceControl.join(", ")}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
