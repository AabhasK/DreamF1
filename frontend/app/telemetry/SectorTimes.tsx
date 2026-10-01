import { TEAM_COLORS } from "@/lib/design"
import { fmtLap } from "@/lib/f1"

export interface SectorData {
  session: string
  drivers: Record<string, {
    s1: number | null
    s2: number | null
    s3: number | null
    s1_best: boolean
    s2_best: boolean
    s3_best: boolean
  }>
}

type Key = "s1" | "s2" | "s3"
const KEYS: Key[] = ["s1", "s2", "s3"]
// Sticky only where the table scrolls sideways (narrow screens).
const STICKY = "max-lg:sticky max-lg:left-0 max-lg:z-10 max-lg:bg-surface-0"

export default function SectorTimes({ data }: { data: SectorData }) {
  const entries = Object.entries(data.drivers)

  // Overall best (purple) time per sector, and who set it
  const best = Object.fromEntries(
    KEYS.map((k) => [k, Math.min(...entries.map(([, d]) => d[k] ?? Infinity))]),
  ) as Record<Key, number>
  const holder = (k: Key) => entries.find(([, d]) => d[k] === best[k])?.[0]

  // The theoretical "ideal lap": the three purple sectors added together
  const idealLap = KEYS.every((k) => isFinite(best[k])) ? best.s1 + best.s2 + best.s3 : null

  // Each driver ranked by their own best three sectors combined
  const sorted = entries
    .map(([code, d]) => ({ code, d, total: (d.s1 ?? 0) + (d.s2 ?? 0) + (d.s3 ?? 0) }))
    .sort((a, b) => a.total - b.total)

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        <div>
          <dt className="label">Ideal lap</dt>
          <dd className="timing mt-1.5 text-[1.25rem] text-f1-purple">{fmtLap(idealLap)}</dd>
          <p className="mt-1 text-[0.75rem] text-text-muted">All three fastest sectors</p>
        </div>
        {KEYS.map((k, i) => {
          const who = holder(k)
          return (
            <div key={k} className="sm:border-l sm:border-border-subtle sm:pl-6">
              <dt className="label">Best sector {i + 1}</dt>
              <dd className="timing mt-1.5 text-[1.25rem]">
                <span style={{ color: who ? TEAM_COLORS[who] : undefined }}>{who ?? "—"}</span>{" "}
                <span className="text-[0.8em] text-f1-purple">{isFinite(best[k]) ? best[k].toFixed(3) : "—"}</span>
              </dd>
            </div>
          )
        })}
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-lg border-collapse">
          <thead className="border-b border-border-default">
            <tr>
              <th scope="col" className={`label h-10 text-left font-medium ${STICKY}`}>Driver</th>
              <th scope="col" className="label h-10 px-2 text-right font-medium">Sector 1</th>
              <th scope="col" className="label h-10 px-2 text-right font-medium">Sector 2</th>
              <th scope="col" className="label h-10 px-2 text-right font-medium">Sector 3</th>
              <th scope="col" className="label h-10 pl-2 text-right font-medium">Best combined</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ code, d, total }, i) => (
              <tr key={code} className="h-12 border-b border-border-subtle">
                <th scope="row" className={`pr-4 text-left font-normal ${STICKY}`}>
                  <span className="flex items-center gap-3">
                    <span className="timing w-6 text-right text-[0.875rem] text-text-muted">{i + 1}</span>
                    <span className="h-5 w-0.75" style={{ background: TEAM_COLORS[code] ?? "#888888" }} aria-hidden="true" />
                    <span className="timing text-[1rem]">{code}</span>
                  </span>
                </th>
                {KEYS.map((k) => {
                  const t = d[k]
                  const isBest = d[`${k}_best` as const]
                  return (
                    <td key={k} className="px-2 text-right">
                      <span className={`timing block text-[0.875rem] ${t === null ? "text-text-dim" : isBest ? "text-f1-purple" : "text-text-secondary"}`}>
                        {t === null ? "—" : t.toFixed(3)}
                      </span>
                      {t !== null && !isBest && isFinite(best[k]) && (
                        <span className="timing block text-[0.6875rem] text-text-muted">+{(t - best[k]).toFixed(3)}</span>
                      )}
                    </td>
                  )
                })}
                <td className="pl-2 text-right">
                  <span className={`timing block text-[0.875rem] ${i === 0 ? "text-f1-green" : "text-text-secondary"}`}>
                    {total > 0 ? total.toFixed(3) : "—"}
                  </span>
                  {i > 0 && total > 0 && (
                    <span className="timing block text-[0.6875rem] text-text-muted">+{(total - sorted[0].total).toFixed(3)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
