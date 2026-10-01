"use client"

import { useState } from "react"
import { TEAM_COLORS } from "@/lib/design"
import { fmtLap } from "@/lib/f1"

export interface RacePaceStint {
  stint: number | null
  compound: string
  lap_start: number
  lap_end: number
  laps: number
  median: number | null
  deg: number | null
}

export interface RacePaceDriver {
  code: string
  finish: number | null
  clean_laps: number
  median: number | null
  best: number | null
  mean: number | null
  std: number | null
  delta: number | null
  compounds: { compound: string; laps: number; median: number; best: number }[]
  stints: RacePaceStint[]
}

export interface RacePaceData {
  session: string
  fastest_median: number | null
  drivers: RacePaceDriver[]
}

// Tyre degradation per lap: green is gentle, yellow is noticeable, red is heavy.
function degClass(d: number | null): string {
  if (d == null) return "text-text-muted"
  if (d <= 0.03) return "text-f1-green"
  if (d <= 0.08) return "text-f1-yellow"
  return "text-f1-red"
}

const TYRE: Record<string, string> = {
  SOFT: "soft", MEDIUM: "medium", HARD: "hard",
  INTERMEDIATE: "intermediate", WET: "wet",
}

function CompoundIcon({ c }: { c: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/assets/tyres/${TYRE[(c || "").toUpperCase()] ?? "unknown"}.svg`} alt={c} className="size-4 shrink-0" />
  )
}

const COLS = "grid-cols-[2rem_3.5rem_minmax(0,1fr)_5.5rem_4.5rem] sm:grid-cols-[2rem_4rem_minmax(0,1fr)_6rem_5rem_3rem]"

export default function RacePace({ data }: { data: RacePaceData }) {
  const [open, setOpen] = useState<string | null>(null)
  const maxDelta = Math.max(0.001, ...data.drivers.map((d) => d.delta ?? 0))

  return (
    <div>
      <p className="max-w-[70ch] text-[0.875rem] text-text-muted">
        Median lap in clean air. In and out laps, lap 1 and safety car laps are left out. Select a driver for stints and
        tyre wear.
      </p>

      <div className={`label mt-6 grid h-10 items-center gap-3 border-b border-border-default ${COLS}`}>
        <span>Fin</span>
        <span>Driver</span>
        <span>Gap to the fastest</span>
        <span className="text-right">Median</span>
        <span className="text-right">Delta</span>
        <span className="hidden text-right sm:block">Laps</span>
      </div>

      <ol>
        {data.drivers.map((d) => {
          const color = TEAM_COLORS[d.code] ?? "#888888"
          const isOpen = open === d.code
          const barPct = d.delta == null ? 0 : Math.max(2, (d.delta / maxDelta) * 100)
          return (
            <li key={d.code} className="border-b border-border-subtle">
              <button
                onClick={() => setOpen(isOpen ? null : d.code)}
                aria-expanded={isOpen}
                className={`grid h-12 w-full items-center gap-3 text-left transition-colors hover:bg-surface-1 ${COLS}`}
              >
                <span className="timing text-[0.9375rem] text-text-secondary">{d.finish ?? "—"}</span>
                <span className="flex items-center gap-2">
                  <span className="h-5 w-0.75" style={{ background: color }} aria-hidden="true" />
                  <span className="timing text-[0.9375rem]">{d.code}</span>
                </span>
                <span className="h-2 bg-surface-2" aria-hidden="true">
                  <span className="block h-full" style={{ width: `${barPct}%`, background: color, opacity: d.delta === 0 ? 1 : 0.6 }} />
                </span>
                <span className="timing text-right text-[0.9375rem]">{fmtLap(d.median)}</span>
                <span className={`timing text-right text-[0.8125rem] ${d.delta === 0 ? "text-f1-green" : "text-text-secondary"}`}>
                  {d.delta == null ? "—" : d.delta === 0 ? "FASTEST" : `+${d.delta.toFixed(3)}`}
                </span>
                <span className="timing hidden text-right text-[0.8125rem] text-text-muted sm:block">{d.clean_laps}</span>
              </button>

              {isOpen && (
                <div className="space-y-4 pb-5 pl-0 pt-1 sm:pl-24">
                  <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[0.8125rem]">
                    <div>
                      <dt className="label inline">Best </dt>
                      <dd className="timing inline text-text-secondary">{fmtLap(d.best)}</dd>
                    </div>
                    <div>
                      <dt className="label inline">Mean </dt>
                      <dd className="timing inline text-text-secondary">{fmtLap(d.mean)}</dd>
                    </div>
                    <div>
                      <dt className="label inline">Consistency </dt>
                      <dd className="timing inline text-text-secondary">±{d.std?.toFixed(3) ?? "—"}S</dd>
                    </div>
                  </dl>

                  <table className="w-full max-w-xl border-collapse text-[0.8125rem]">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th scope="col" className="label h-8 text-left font-medium">Stint</th>
                        <th scope="col" className="label h-8 text-left font-medium">Laps</th>
                        <th scope="col" className="label h-8 text-right font-medium">Median</th>
                        <th scope="col" className="label h-8 text-right font-medium">Wear per lap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.stints.map((s, i) => (
                        <tr key={i} className="h-9 border-b border-border-subtle last:border-b-0">
                          <td>
                            <span className="flex items-center gap-2">
                              <span className="timing w-4 text-text-muted">{i + 1}</span>
                              <CompoundIcon c={s.compound} />
                            </span>
                          </td>
                          <td className="timing text-text-secondary">
                            L{s.lap_start}–{s.lap_end} <span className="text-text-muted">({s.laps})</span>
                          </td>
                          <td className="timing text-right">{fmtLap(s.median)}</td>
                          <td className={`timing text-right ${degClass(s.deg)}`}>
                            {s.deg == null ? "—" : `${s.deg > 0 ? "+" : ""}${s.deg.toFixed(3)}S`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
