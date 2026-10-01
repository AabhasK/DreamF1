"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import DriverPortrait from "@/components/DriverPortrait"
import { fetchStandings, type DriverStanding, type StandingsData } from "@/lib/standings"
import { teamColor } from "@/lib/design"
import { fmtPoints, PODIUM_COLOR, splitName } from "@/lib/format"

/** Drivers' championship: the leader up top, then a top-ten timing tower. */
export default function Championship() {
  const [data, setData] = useState<StandingsData | null | undefined>(undefined)

  useEffect(() => {
    fetchStandings(2026).then(setData)
  }, [])

  const rows = data?.drivers.slice(0, 10) ?? []
  const leader = rows[0]
  const runnerUp = rows[1]
  const max = Math.max(1, ...rows.map((d) => d.points))

  return (
    <section className="py-6 lg:pr-6" aria-labelledby="championship-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="championship-title" className="heading text-[1.125rem]">
          Championship
        </h2>
        <Link href="/standings" className="link text-[0.875rem]">
          Standings
        </Link>
      </div>

      {data === undefined ? (
        <div className="mt-6 animate-pulse space-y-2" aria-busy="true">
          <div className="h-40 bg-surface-1" />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-8 bg-surface-1" />
          ))}
        </div>
      ) : !leader ? (
        <p className="mt-6 text-text-muted">Standings aren&apos;t available right now.</p>
      ) : (
        <>
          <Leader leader={leader} runnerUp={runnerUp} />
          <ol className="mt-4 border-t border-border-subtle">
            {rows.map((d) => (
              <TowerRow key={d.code || d.position} d={d} max={max} />
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

function Leader({ leader, runnerUp }: { leader: DriverStanding; runnerUp?: DriverStanding }) {
  const color = teamColor(leader.team_slug)
  const { first, last } = splitName(leader.driver)
  const gap = runnerUp ? leader.points - runnerUp.points : 0

  return (
    <div className="relative mt-4 flex items-end gap-4">
      <span
        aria-hidden="true"
        className="timing pointer-events-none absolute -top-2 left-1 select-none text-[7rem] leading-none text-transparent"
        style={{ WebkitTextStroke: `1.5px ${color}55` }}
      >
        1
      </span>
      <DriverPortrait code={leader.code} slug={leader.team_slug} priority className="relative h-36 shrink-0" />
      <div className="relative min-w-0 pb-2">
        <p className="label">Leads the championship</p>
        <p className="heading mt-1 truncate text-[1.25rem]">
          <span className="block text-[0.6em] font-semibold text-text-secondary">{first}</span>
          {last}
        </p>
        <p className="timing mt-2 text-[2rem] leading-none">
          {fmtPoints(leader.points)}
          <span className="label ml-1.5 align-middle">pts</span>
        </p>
        <p className="mt-2 text-[0.8125rem] text-text-muted">
          {runnerUp && gap > 0 ? `${fmtPoints(gap)} clear of ${splitName(runnerUp.driver).last}` : "Level at the top"},{" "}
          {fmtPoints(leader.last3_points)} pts in the last three
        </p>
      </div>
    </div>
  )
}

function TowerRow({ d, max }: { d: DriverStanding; max: number }) {
  const color = teamColor(d.team_slug)
  return (
    <li className="grid h-9 grid-cols-[1.5rem_3px_2.75rem_minmax(0,1fr)_3rem_3.25rem] items-center gap-x-2.5 border-b border-border-subtle">
      <span className="timing text-right text-[0.9375rem]" style={{ color: PODIUM_COLOR[d.position] }}>
        {d.position}
      </span>
      <span className="h-5 w-[3px]" style={{ background: color }} aria-hidden="true" />
      <span className="timing text-[0.9375rem]">{d.code}</span>
      <span className="min-w-0">
        <span className="block truncate text-[0.8125rem] text-text-secondary">{splitName(d.driver).last}</span>
        <span className="mt-1 block h-[2px] bg-surface-2" aria-hidden="true">
          <span className="bar-fill block h-full" style={{ width: `${(d.points / max) * 100}%`, background: color }} />
        </span>
      </span>
      <span className="timing text-right text-[0.9375rem]">{fmtPoints(d.points)}</span>
      <span className="timing text-right text-[0.75rem] text-text-muted">
        {d.gap_to_leader > 0 ? `-${fmtPoints(d.gap_to_leader)}` : "—"}
      </span>
    </li>
  )
}
