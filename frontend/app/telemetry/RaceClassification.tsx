import { TEAM_COLORS } from "@/lib/design"
import { fmtLap } from "@/lib/f1"
import { PODIUM_COLOR } from "@/lib/format"

export interface RaceResult {
  abbreviation: string
  finish_position: number | null
  grid_position: number | null
  positions_gained: number | null
  status: string
  is_dnf: boolean
  points: number
  avg_lap_time: number | null
  best_lap_time: number | null
  total_laps: number
  fastest_lap: boolean
}

/** Grid → finish movement, with a bar sized to the swing. */
function Movement({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return <span className="text-text-dim">—</span>
  const gained = delta > 0
  const w = Math.min(Math.abs(delta), 12) / 12 // normalise to the widest realistic swing
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span
        className={`hidden h-0.5 sm:block ${gained ? "bg-f1-green" : "bg-f1-red"}`}
        style={{ width: `${12 + w * 28}px` }}
        aria-hidden="true"
      />
      <span className={gained ? "text-f1-green" : "text-f1-red"}>
        {gained ? "▲" : "▼"}
        {Math.abs(delta)}
      </span>
    </span>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sm:border-l sm:border-border-subtle sm:pl-6 sm:first:border-l-0 sm:first:pl-0">
      <dt className="label">{label}</dt>
      <dd className="timing mt-1.5 text-[1.25rem]">{children}</dd>
    </div>
  )
}

// Sticky only where the table scrolls sideways (narrow screens).
const STICKY = "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-surface-0"

export default function RaceClassification({ results }: { results: RaceResult[] }) {
  const winner = results.find((r) => r.finish_position === 1)
  const flHolder = results.find((r) => r.fastest_lap)
  const mover = results
    .filter((r) => r.positions_gained !== null)
    .reduce<RaceResult | null>(
      (best, r) => (!best || (r.positions_gained ?? 0) > (best.positions_gained ?? 0) ? r : best),
      null,
    )
  const dnfCount = results.filter((r) => r.is_dnf).length
  const code = (c?: string) => <span style={{ color: c ? TEAM_COLORS[c] : undefined }}>{c ?? "—"}</span>

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        <Stat label="Winner">
          {code(winner?.abbreviation)} {winner && <span className="text-[0.75em] text-text-muted">{winner.points} PTS</span>}
        </Stat>
        <Stat label="Fastest lap">
          {code(flHolder?.abbreviation)}{" "}
          {flHolder && <span className="text-[0.75em] text-f1-purple">{fmtLap(flHolder.best_lap_time)}</span>}
        </Stat>
        <Stat label="Biggest mover">
          {mover && (mover.positions_gained ?? 0) > 0 ? (
            <>
              {code(mover.abbreviation)} <span className="text-[0.75em] text-f1-green">▲{mover.positions_gained}</span>
            </>
          ) : (
            "—"
          )}
        </Stat>
        <Stat label="Retirements">
          <span className={dnfCount > 0 ? "text-f1-red" : ""}>{dnfCount}</span>
        </Stat>
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-152 border-collapse">
          <thead className="border-b border-border-default">
            <tr>
              <th scope="col" className={`label h-10 text-left font-medium ${STICKY}`}>Driver</th>
              <th scope="col" className="label h-10 px-2 text-left font-medium">Status</th>
              <th scope="col" className="label h-10 px-2 text-right font-medium" title="Places gained or lost from the grid">Grid → finish</th>
              <th scope="col" className="label h-10 px-2 text-right font-medium">Best lap</th>
              <th scope="col" className="label h-10 px-2 text-right font-medium">Avg lap</th>
              <th scope="col" className="label h-10 pl-2 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const team = TEAM_COLORS[r.abbreviation] ?? "#888888"
              return (
                <tr key={r.abbreviation} className={`h-12 border-b border-border-subtle ${r.is_dnf ? "opacity-55" : ""}`}>
                  <th scope="row" className={`pr-4 text-left font-normal ${STICKY}`}>
                    <span className="flex items-center gap-3">
                      <span
                        className="timing w-6 text-right text-[1rem]"
                        style={{ color: r.finish_position ? PODIUM_COLOR[r.finish_position] : undefined }}
                      >
                        {r.finish_position ?? "—"}
                      </span>
                      <span className="h-6 w-0.75" style={{ background: team }} aria-hidden="true" />
                      <span className="timing text-[1rem]">{r.abbreviation}</span>
                      {r.fastest_lap && (
                        <span className="timing text-[0.625rem] text-f1-purple" title="Fastest lap">
                          FL
                        </span>
                      )}
                    </span>
                  </th>
                  <td className={`px-2 text-[0.875rem] ${r.is_dnf ? "text-f1-red" : "text-text-secondary"}`}>
                    {r.is_dnf ? `Retired, lap ${r.total_laps}` : r.status}
                  </td>
                  <td className="timing px-2 text-right text-[0.875rem]">
                    <Movement delta={r.positions_gained} />
                  </td>
                  <td className={`timing px-2 text-right text-[0.875rem] ${r.fastest_lap ? "text-f1-purple" : "text-text-secondary"}`}>
                    {fmtLap(r.best_lap_time)}
                  </td>
                  <td className="timing px-2 text-right text-[0.875rem] text-text-muted">{fmtLap(r.avg_lap_time)}</td>
                  <td className="timing pl-2 text-right text-[0.9375rem]">
                    {r.points > 0 ? r.points : <span className="text-text-dim">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
