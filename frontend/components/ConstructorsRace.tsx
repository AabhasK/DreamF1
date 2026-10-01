import CarImage from "@/components/CarImage"
import { TEAMS, teamColor } from "@/lib/design"
import { fmtPoints } from "@/lib/format"
import type { ConstructorStanding } from "@/lib/standings"

/**
 * Constructors' points drawn as a race: each car sits where its points total
 * reaches along the bar, so the gaps between teams read at a glance.
 */
export default function ConstructorsRace({ rows, max: scale }: { rows: ConstructorStanding[]; max?: number }) {
  // Pass `max` when splitting the table across columns so both share one scale.
  const max = scale ?? Math.max(1, ...rows.map((c) => c.points))

  return (
    <ol>
      {rows.map((c) => {
        const pct = (c.points / max) * 100
        const name = TEAMS.find((t) => t.slug === c.team_slug)?.name ?? c.team
        return (
          <li
            key={c.team_slug || c.position}
            className="grid h-11 grid-cols-[1.25rem_6rem_minmax(0,1fr)_2.75rem] items-center gap-x-3 border-b border-border-subtle sm:grid-cols-[1.5rem_7.5rem_minmax(0,1fr)_3.25rem]"
          >
            <span className="timing text-right text-[0.8125rem] text-text-muted">{c.position}</span>
            <span className="truncate text-[0.875rem] font-semibold">{name}</span>
            {/* --car-w is the car's width at h-6 (the image is ~4.5:1) */}
            <div className="relative h-full [--car-w:6.8rem]">
              <div className="absolute inset-x-0 bottom-2 h-px bg-border-default" aria-hidden="true" />
              <div
                className="bar-fill absolute bottom-[7px] left-0 h-[3px]"
                style={{ width: `${pct}%`, background: teamColor(c.team_slug) }}
                aria-hidden="true"
              />
              <CarImage
                slug={c.team_slug}
                className="absolute bottom-2.5 h-6 w-auto drop-shadow-[0_3px_4px_rgb(0_0_0/0.6)]"
                style={{ left: `max(0px, calc(${pct}% - var(--car-w)))` }}
              />
            </div>
            <span className="timing text-right text-[0.9375rem]">{fmtPoints(c.points)}</span>
          </li>
        )
      })}
    </ol>
  )
}
