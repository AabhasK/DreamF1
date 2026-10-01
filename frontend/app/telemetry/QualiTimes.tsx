import { Fragment } from "react"
import { TEAM_COLORS } from "@/lib/design"
import { fmtLap } from "@/lib/f1"

export interface QualiResult {
  Abbreviation: string
  Q1: number | null
  Q2: number | null
  Q3: number | null
}

/** Which knockout segment a driver was eliminated in / reached. */
function segmentOf(r: QualiResult): "Q3" | "Q2" | "Q1" {
  if (r.Q3 !== null) return "Q3"
  if (r.Q2 !== null) return "Q2"
  return "Q1"
}

const SEGMENTS = {
  Q3: { label: "Reached Q3", color: "var(--color-f1-purple)" },
  Q2: { label: "Out in Q2", color: "var(--color-f1-yellow)" },
  Q1: { label: "Out in Q1", color: "var(--color-f1-red)" },
}

// Sticky only where the table scrolls sideways (narrow screens).
const STICKY = "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-surface-0"

export default function QualiTimes({ results }: { results: QualiResult[] }) {
  const q3Times = results.map((r) => r.Q3).filter((v): v is number => v !== null).sort((a, b) => a - b)
  const fastestQ3 = q3Times[0] ?? null
  const poleGap = q3Times.length > 1 ? q3Times[1] - q3Times[0] : null
  const pole = results[0]

  // A header row goes above the first driver of each knockout segment.
  const startsSegment = results.map((r, i) => i === 0 || segmentOf(r) !== segmentOf(results[i - 1]))

  return (
    <div className="space-y-10">
      <dl className="flex flex-wrap gap-x-12 gap-y-6">
        <div>
          <dt className="label">Pole position</dt>
          <dd className="timing mt-1.5 text-[1.5rem]">
            <span style={{ color: pole ? TEAM_COLORS[pole.Abbreviation] : undefined }}>{pole?.Abbreviation ?? "—"}</span>{" "}
            <span className="text-f1-purple">{fmtLap(pole?.Q3)}</span>
          </dd>
        </div>
        {poleGap !== null && (
          <div className="sm:border-l sm:border-border-subtle sm:pl-12">
            <dt className="label">Margin to P2</dt>
            <dd className="timing mt-1.5 text-[1.5rem]">+{poleGap.toFixed(3)}S</dd>
          </div>
        )}
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-lg border-collapse">
          <thead className="border-b border-border-default">
            <tr>
              <th scope="col" className={`label h-10 text-left font-medium ${STICKY}`}>Driver</th>
              <th scope="col" className="label h-10 px-2 text-right font-medium">Q1</th>
              <th scope="col" className="label h-10 px-2 text-right font-medium">Q2</th>
              <th scope="col" className="label h-10 px-2 text-right font-medium">Q3</th>
              <th scope="col" className="label h-10 pl-2 text-right font-medium">Gap to pole</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => {
              const seg = segmentOf(r)
              const showSeg = startsSegment[idx]
              const delta = r.Q3 !== null && fastestQ3 !== null ? r.Q3 - fastestQ3 : null
              const isPole = idx === 0 && r.Q3 !== null
              return (
                <Fragment key={r.Abbreviation}>
                  {showSeg && (
                    <tr>
                      <th colSpan={5} scope="colgroup" className={`pb-2 pt-6 text-left ${STICKY}`}>
                        <span className="flex items-center gap-2 text-[0.8125rem] font-semibold" style={{ color: SEGMENTS[seg].color }}>
                          <span className="size-2" style={{ background: SEGMENTS[seg].color }} aria-hidden="true" />
                          {SEGMENTS[seg].label}
                        </span>
                      </th>
                    </tr>
                  )}
                  <tr className="h-11 border-b border-border-subtle">
                    <th scope="row" className={`pr-4 text-left font-normal ${STICKY}`}>
                      <span className="flex items-center gap-3">
                        <span className={`timing w-6 text-right text-[0.9375rem] ${isPole ? "text-f1-purple" : "text-text-secondary"}`}>
                          {idx + 1}
                        </span>
                        <span className="h-5 w-0.75" style={{ background: TEAM_COLORS[r.Abbreviation] ?? "#888888" }} aria-hidden="true" />
                        <span className="timing text-[1rem]">{r.Abbreviation}</span>
                      </span>
                    </th>
                    <td className="timing px-2 text-right text-[0.875rem] text-text-muted">{fmtLap(r.Q1)}</td>
                    <td className="timing px-2 text-right text-[0.875rem] text-text-muted">{fmtLap(r.Q2)}</td>
                    <td className={`timing px-2 text-right text-[0.875rem] ${isPole ? "text-f1-purple" : "text-text-secondary"}`}>
                      {fmtLap(r.Q3)}
                    </td>
                    <td className={`timing pl-2 text-right text-[0.875rem] ${delta === 0 ? "text-f1-purple" : "text-text-muted"}`}>
                      {delta === null ? "—" : delta === 0 ? "POLE" : `+${delta.toFixed(3)}`}
                    </td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
