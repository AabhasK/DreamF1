"use client"

import { useEffect, useState } from "react"
import { fetchStandings, type DriverStanding } from "@/lib/standings"
import { teamColor } from "@/lib/design"
import { fmtPoints, PODIUM_COLOR, splitName } from "@/lib/format"

/**
 * Season form for the Predict page — the same /api/standings aggregates the
 * Standings page uses, so picks can be made on real numbers.
 */
export default function FormGuide() {
  const [rows, setRows] = useState<DriverStanding[] | null>(null)

  useEffect(() => {
    fetchStandings(2026).then((d) => setRows(d?.drivers ?? []))
  }, [])

  if (rows && rows.length === 0) return null
  const maxForm = rows ? Math.max(1, ...rows.map((d) => d.last3_points)) : 1

  return (
    <details open className="group">
      <summary className="flex cursor-pointer list-none items-end justify-between gap-4 border-b border-border-subtle pb-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="heading block text-[1.5rem]">Form guide</span>
          <span className="mt-1 block text-[0.9375rem] text-text-muted">How every driver&apos;s 2026 has gone so far.</span>
        </span>
        <span className="text-[0.875rem] font-medium text-text-secondary">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </summary>

      {!rows ? (
        <div className="mt-4 animate-pulse space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-10 bg-surface-1" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-152 border-collapse">
            <thead>
              <tr className="border-b border-border-subtle">
                <th scope="col" className="label h-10 text-left font-medium">
                  Driver
                </th>
                {[
                  ["Points", "Championship points"],
                  ["Wins", "Wins"],
                  ["Podiums", "Podiums"],
                  ["Poles", "Pole positions"],
                  ["DNF", "Retirements"],
                  ["Avg", "Average finish"],
                  ["Last 3", "Points in the last three rounds"],
                ].map(([h, title]) => (
                  <th key={h} scope="col" title={title} className="label h-10 px-2 text-right font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const color = teamColor(d.team_slug)
                return (
                  <tr key={d.code || d.position} className="h-11 border-b border-border-subtle">
                    <th scope="row" className="text-left font-normal">
                      <span className="flex items-center gap-3">
                        <span
                          className="timing w-6 text-right text-[0.9375rem]"
                          style={{ color: PODIUM_COLOR[d.position] ?? "var(--color-text-muted)" }}
                        >
                          {d.position}
                        </span>
                        <span className="h-5 w-[3px]" style={{ background: color }} aria-hidden="true" />
                        <span className="timing w-11 text-[0.9375rem]">{d.code}</span>
                        <span className="hidden truncate text-[0.875rem] text-text-secondary sm:inline">
                          {splitName(d.driver).last}
                        </span>
                      </span>
                    </th>
                    <td className="timing px-2 text-right text-[0.9375rem]">{fmtPoints(d.points)}</td>
                    <td className={`timing px-2 text-right text-[0.875rem] ${d.wins ? "text-text-secondary" : "text-text-dim"}`}>{d.wins}</td>
                    <td className={`timing px-2 text-right text-[0.875rem] ${d.podiums ? "text-text-secondary" : "text-text-dim"}`}>{d.podiums}</td>
                    <td className={`timing px-2 text-right text-[0.875rem] ${d.poles ? "text-text-secondary" : "text-text-dim"}`}>{d.poles}</td>
                    <td className={`timing px-2 text-right text-[0.875rem] ${d.dnfs ? "text-f1-red" : "text-text-dim"}`}>{d.dnfs}</td>
                    <td className="timing px-2 text-right text-[0.875rem] text-text-secondary">{d.avg_finish ?? "—"}</td>
                    <td className="px-2">
                      <span className="flex items-center justify-end gap-2">
                        <span className="hidden h-1 w-10 bg-surface-2 sm:block" aria-hidden="true">
                          <span className="block h-full" style={{ width: `${(d.last3_points / maxForm) * 100}%`, background: color }} />
                        </span>
                        <span className="timing w-7 text-right text-[0.875rem]">{fmtPoints(d.last3_points)}</span>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </details>
  )
}
