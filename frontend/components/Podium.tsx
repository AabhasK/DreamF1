import DriverPortrait from "@/components/DriverPortrait"
import { TEAM_COLORS, driverLastName } from "@/lib/design"
import { PODIUM_COLOR } from "@/lib/format"

export interface PodiumEntry {
  position: 1 | 2 | 3
  code: string
  slug?: string
  /** Shown on the step, e.g. points. Defaults to the position. */
  value?: string
  /** Step height as a 0–1 share of the tallest step. */
  height?: number
}

const PORTRAIT_H = {
  sm: { 1: "h-44", 2: "h-36", 3: "h-32" },
  md: { 1: "h-52 sm:h-60", 2: "h-44 sm:h-52", 3: "h-40 sm:h-48" },
  lg: { 1: "h-56 sm:h-80", 2: "h-48 sm:h-72", 3: "h-44 sm:h-[16.5rem]" },
}
const DEFAULT_STEP = { 1: 1, 2: 0.7, 3: 0.5 }

/** Drivers standing on a P2–P1–P3 podium. Step heights can carry data. */
export default function Podium({ entries, size = "lg" }: { entries: PodiumEntry[]; size?: "sm" | "md" | "lg" }) {
  const byPos = (n: number) => entries.find((e) => e.position === n)
  const order = [byPos(2), byPos(1), byPos(3)]

  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((p, i) =>
        p ? (
          <figure key={p.code} className="flex min-w-0 flex-col items-center">
            <DriverPortrait code={p.code} slug={p.slug} className={`${PORTRAIT_H[size][p.position]} w-full`} />
            <div
              className="flex w-full items-start justify-center border-t-2 bg-surface-1 pt-1.5"
              style={{
                borderColor: PODIUM_COLOR[p.position],
                height: `calc(1.75rem + ${(p.height ?? DEFAULT_STEP[p.position]) * (size === "lg" ? 3.5 : 2)}rem)`,
              }}
            >
              <span
                className={`timing ${size === "sm" ? "text-[1.1rem]" : "text-[1.25rem] sm:text-[1.6rem]"}`}
                style={{ color: PODIUM_COLOR[p.position] }}
              >
                {p.value ?? p.position}
              </span>
            </div>
            <figcaption className={`${size === "sm" ? "mt-2" : "mt-3"} text-center`}>
              <span className="timing block text-[1.05rem]" style={{ color: TEAM_COLORS[p.code] }}>
                {p.code}
              </span>
              <span className="block truncate text-[0.8125rem] text-text-muted">{driverLastName(p.code)}</span>
            </figcaption>
          </figure>
        ) : (
          <div key={i} />
        ),
      )}
    </div>
  )
}
