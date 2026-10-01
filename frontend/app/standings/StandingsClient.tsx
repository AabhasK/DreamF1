"use client"

import { useEffect, useState } from "react"
import Podium from "@/components/Podium"
import ConstructorsRace from "@/components/ConstructorsRace"
import TeamLogo from "@/components/TeamLogo"
import {
  fetchStandings,
  type ConstructorStanding,
  type DriverStanding,
  type StandingsData,
} from "@/lib/standings"
import { TEAMS, teamColor } from "@/lib/design"
import { fmtPoints, PODIUM_COLOR } from "@/lib/format"

type View = "drivers" | "constructors"

const teamName = (slug: string, fallback: string) => TEAMS.find((t) => t.slug === slug)?.name ?? fallback

// Sticky first column so the name stays put while the stats scroll sideways on phones.
const STICKY = "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-surface-0"

function Th({ children, title, sticky }: { children: React.ReactNode; title?: string; sticky?: boolean }) {
  return (
    <th
      scope="col"
      title={title}
      className={`label h-10 px-2 text-right font-medium first:text-left ${sticky ? STICKY : ""}`}
    >
      {children}
    </th>
  )
}

function Num({ value, dim, className = "" }: { value: string | number; dim?: boolean; className?: string }) {
  return (
    <td className={`timing px-2 text-right text-[0.9375rem] ${dim ? "text-text-dim" : "text-text-secondary"} ${className}`}>
      {value}
    </td>
  )
}

function PointsCell({ points, max, color }: { points: number; max: number; color: string }) {
  return (
    <td className="px-2">
      <div className="ml-auto w-24">
        <p className="timing text-right text-[1.05rem]">{fmtPoints(points)}</p>
        <div className="mt-1 h-[2px] bg-surface-2" aria-hidden="true">
          <div className="bar-fill ml-auto h-full origin-right" style={{ width: `${(points / max) * 100}%`, background: color }} />
        </div>
      </div>
    </td>
  )
}

function DriverTable({ rows }: { rows: DriverStanding[] }) {
  const max = Math.max(1, ...rows.map((d) => d.points))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-216 border-collapse">
        <thead className="border-b border-border-default">
          <tr>
            <Th sticky>Driver</Th>
            <Th title="Championship points">Points</Th>
            <Th title="Gap to the leader">Gap</Th>
            <Th title="Wins">Wins</Th>
            <Th title="Podiums">Podiums</Th>
            <Th title="Pole positions">Poles</Th>
            <Th title="Fastest laps">Fastest laps</Th>
            <Th title="Retirements">DNF</Th>
            <Th title="Best finish">Best</Th>
            <Th title="Average finish">Avg</Th>
            <Th title="Points in the last three rounds">Last 3</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const color = teamColor(d.team_slug)
            return (
              <tr key={d.code || d.position} className="group h-16 border-b border-border-subtle">
                <th scope="row" className={`${STICKY} pr-4 text-left font-normal transition-colors group-hover:bg-surface-1`}>
                  <div className="flex items-center gap-3">
                    <span
                      className="timing w-7 text-right text-[1.05rem]"
                      style={{ color: PODIUM_COLOR[d.position] ?? "var(--color-text-muted)" }}
                    >
                      {d.position}
                    </span>
                    <span className="h-8 w-[3px]" style={{ background: color }} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="timing block text-[1rem]">{d.code}</span>
                      <span className="block truncate text-[0.8125rem] text-text-secondary">
                        {d.driver}
                        <span className="ml-2 hidden text-text-muted md:inline">{teamName(d.team_slug, d.team)}</span>
                      </span>
                    </span>
                  </div>
                </th>
                <PointsCell points={d.points} max={max} color={color} />
                <Num value={d.gap_to_leader === 0 ? "—" : `-${fmtPoints(d.gap_to_leader)}`} dim={d.gap_to_leader === 0} />
                <Num value={d.wins} dim={!d.wins} />
                <Num value={d.podiums} dim={!d.podiums} />
                <Num value={d.poles} dim={!d.poles} />
                <Num value={d.fastest_laps} dim={!d.fastest_laps} />
                <td className={`timing px-2 text-right text-[0.9375rem] ${d.dnfs ? "text-f1-red" : "text-text-dim"}`}>{d.dnfs}</td>
                <Num value={d.best_finish ?? "—"} dim={d.best_finish === null} />
                <Num value={d.avg_finish ?? "—"} dim={d.avg_finish === null} />
                <Num value={d.last3_points ? `+${fmtPoints(d.last3_points)}` : "0"} dim={!d.last3_points} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ConstructorTable({ rows }: { rows: ConstructorStanding[] }) {
  const max = Math.max(1, ...rows.map((c) => c.points))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-184 border-collapse">
        <thead className="border-b border-border-default">
          <tr>
            <Th sticky>Constructor</Th>
            <Th title="Championship points">Points</Th>
            <Th title="Gap to the leader">Gap</Th>
            <Th title="Wins">Wins</Th>
            <Th title="Podiums">Podiums</Th>
            <Th title="One-two finishes">1–2s</Th>
            <Th title="Pole positions">Poles</Th>
            <Th title="Fastest laps">Fastest laps</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const color = teamColor(c.team_slug)
            return (
              <tr key={c.team_slug || c.position} className="group h-16 border-b border-border-subtle">
                <th scope="row" className={`${STICKY} pr-4 text-left font-normal transition-colors group-hover:bg-surface-1`}>
                  <div className="flex items-center gap-3">
                    <span
                      className="timing w-7 text-right text-[1.05rem]"
                      style={{ color: PODIUM_COLOR[c.position] ?? "var(--color-text-muted)" }}
                    >
                      {c.position}
                    </span>
                    <span className="h-8 w-[3px]" style={{ background: color }} aria-hidden="true" />
                    <TeamLogo slug={c.team_slug} size={22} />
                    <span className="truncate font-semibold">{teamName(c.team_slug, c.team)}</span>
                  </div>
                </th>
                <PointsCell points={c.points} max={max} color={color} />
                <Num value={c.gap_to_leader === 0 ? "—" : `-${fmtPoints(c.gap_to_leader)}`} dim={c.gap_to_leader === 0} />
                <Num value={c.wins} dim={!c.wins} />
                <Num value={c.podiums} dim={!c.podiums} />
                <Num value={c.one_twos} dim={!c.one_twos} />
                <Num value={c.poles} dim={!c.poles} />
                <Num value={c.fastest_laps} dim={!c.fastest_laps} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const LEADER_STATS: [string, "wins" | "poles" | "podiums" | "fastest_laps" | "dnfs"][] = [
  ["Most wins", "wins"],
  ["Most poles", "poles"],
  ["Most podiums", "podiums"],
  ["Most fastest laps", "fastest_laps"],
  ["Most retirements", "dnfs"],
]

/** Who leads each stat this season, next to the podium. */
function SeasonLeaders({ drivers }: { drivers: DriverStanding[] }) {
  const [p1, p2] = drivers
  return (
    <dl className="grid grid-cols-2 content-center gap-x-8 gap-y-5">
      {p1 && p2 && (
        <div className="col-span-2 border-b border-border-subtle pb-5">
          <dt className="label">Gap at the top</dt>
          <dd className="mt-1.5 text-[0.9375rem] text-text-secondary">
            <span className="timing mr-2 text-[1.75rem] leading-none text-text-primary">{fmtPoints(p1.points - p2.points)}</span>
            points between {p1.code} and {p2.code}
          </dd>
        </div>
      )}
      {LEADER_STATS.map(([label, key]) => {
        const best = drivers.reduce<DriverStanding | null>((b, d) => (!b || d[key] > b[key] ? d : b), null)
        if (!best || best[key] === 0) return null
        return (
          <div key={key}>
            <dt className="label">{label}</dt>
            <dd className="timing mt-1.5 text-[1.25rem]">
              <span style={{ color: teamColor(best.team_slug) }}>{best.code}</span> {best[key]}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export default function StandingsClient() {
  const [data, setData] = useState<StandingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>("drivers")

  useEffect(() => {
    fetchStandings(2026)
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const top = data?.drivers.slice(0, 3) ?? []
  const lead = top[0]?.points || 1

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">Standings</h1>
          <p className="lede mt-2">The 2026 World Championship, updated after every completed round.</p>
        </div>

        <div className="inline-flex border border-border-default p-1 corner-sm" role="group" aria-label="Championship">
          {(["drivers", "constructors"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`h-10 px-5 text-[0.9375rem] font-semibold transition-colors corner-sm ${
                view === v ? "bg-text-primary text-surface-0" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {v === "drivers" ? "Drivers" : "Constructors"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-8 animate-pulse space-y-2" aria-busy="true">
          <div className="h-72 bg-surface-1" />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-14 bg-surface-1" />
          ))}
        </div>
      ) : !data ? (
        <p className="mt-8 text-text-muted">The 2026 standings couldn&apos;t be loaded. Try again in a minute.</p>
      ) : view === "drivers" ? (
        <div key="drivers" className="animate-tab-in">
          {top.length === 3 && (
            <div className="mt-8 grid items-end gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <Podium
                size="md"
                entries={top.map((d) => ({
                  position: d.position as 1 | 2 | 3,
                  code: d.code,
                  slug: d.team_slug,
                  value: fmtPoints(d.points),
                  height: d.points / lead,
                }))}
              />
              <SeasonLeaders drivers={data.drivers} />
            </div>
          )}
          <div className="mt-10">
            <DriverTable rows={data.drivers} />
          </div>
        </div>
      ) : (
        <div key="constructors" className="animate-tab-in">
          <div className="mt-8">
            <ConstructorsRace rows={data.constructors} />
          </div>
          <div className="mt-10">
            <ConstructorTable rows={data.constructors} />
          </div>
        </div>
      )}

      {data && (
        <p className="mt-6 text-[0.8125rem] text-text-muted">
          Source: Jolpica (Ergast). Totals cover completed 2026 rounds.
        </p>
      )}
    </>
  )
}
