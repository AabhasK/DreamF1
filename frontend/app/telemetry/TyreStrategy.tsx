import { TEAM_COLORS } from "@/lib/design"

export interface TyreStint {
  driver: string
  compound: string
  lap_start: number
  lap_end: number
  laps?: number
  tyre_life_start?: number | null
  fresh?: boolean | null
}

// Pirelli compound colours (data, not theme).
const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "#E8002D",
  MEDIUM: "#FFF200",
  HARD: "#F0F0EC",
  INTERMEDIATE: "#39B54A",
  INTER: "#39B54A",
  WET: "#0067FF",
  UNKNOWN: "#555555",
}

// Light compounds need dark text for the in-bar lap count.
const DARK_TEXT = new Set(["MEDIUM", "HARD"])

// Diagonal hatch marks a used (scrubbed) set.
const USED_HATCH = "repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.3) 3px 5px)"

const LEGEND: [string, string][] = [
  ["Soft", "soft"],
  ["Medium", "medium"],
  ["Hard", "hard"],
  ["Inter", "intermediate"],
  ["Wet", "wet"],
]

export default function TyreStrategy({ stints, driverOrder }: { stints: TyreStint[]; driverOrder: string[] }) {
  const totalLaps = Math.max(...stints.map((s) => s.lap_end), 1)

  const stintsByDriver = new Map<string, TyreStint[]>()
  for (const driver of driverOrder) {
    stintsByDriver.set(
      driver,
      stints.filter((s) => s.driver === driver).sort((a, b) => a.lap_start - b.lap_start),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-subtle pb-4">
        {LEGEND.map(([label, file]) => (
          <span key={file} className="flex items-center gap-2 text-[0.8125rem] text-text-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/assets/tyres/${file}.svg`} alt="" className="size-4" />
            {label}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-2 text-[0.8125rem] text-text-secondary">
          <span className="inline-block h-3 w-5 bg-text-muted" style={{ backgroundImage: USED_HATCH }} aria-hidden="true" />
          Used set
        </span>
      </div>

      {/* Lap axis */}
      <div className="timing flex pl-12 pr-14 text-[0.6875rem] text-text-muted" aria-hidden="true">
        <span className="flex-1">LAP 1</span>
        <span className="flex-1 text-center">{Math.round(totalLaps / 2)}</span>
        <span className="flex-1 text-right">{totalLaps}</span>
      </div>

      <ol className="space-y-1.5">
        {driverOrder.map((driver) => {
          const driverStints = stintsByDriver.get(driver) ?? []
          if (driverStints.length === 0) return null
          const stops = driverStints.length - 1

          return (
            <li key={driver} className="flex items-center gap-3">
              <span className="timing w-9 shrink-0 text-right text-[0.8125rem]" style={{ color: TEAM_COLORS[driver] }}>
                {driver}
              </span>

              <div className="flex h-5 flex-1 overflow-hidden bg-surface-1">
                {driverStints.map((stint, idx) => {
                  const laps = stint.laps ?? stint.lap_end - stint.lap_start + 1
                  const widthPct = (laps / totalLaps) * 100
                  const compound = stint.compound.toUpperCase()
                  // Fresh sets report TyreLife starting at 1, so trust `fresh`;
                  // only fall back to age when the flag is missing.
                  const used = stint.fresh === false || (stint.fresh == null && (stint.tyre_life_start ?? 0) > 1)
                  const age = stint.tyre_life_start ?? 0
                  const tip = `${compound} · L${stint.lap_start}–${stint.lap_end} · ${laps} laps · ${used ? `used (${age}L old)` : "new"}`
                  return (
                    <div
                      key={idx}
                      title={tip}
                      className="flex h-full items-center justify-center border-l-2 border-surface-0 first:border-l-0"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: COMPOUND_COLORS[compound] ?? COMPOUND_COLORS.UNKNOWN,
                        backgroundImage: used ? USED_HATCH : undefined,
                      }}
                    >
                      {widthPct > 6 && (
                        <span
                          className="timing text-[0.625rem] leading-none"
                          style={{ color: DARK_TEXT.has(compound) ? "#111111" : "#ffffff" }}
                        >
                          {laps}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <span className="w-12 shrink-0 text-[0.75rem] text-text-muted">
                {stops} {stops === 1 ? "stop" : "stops"}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
