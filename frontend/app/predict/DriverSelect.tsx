"use client"

import DriverPortrait from "@/components/DriverPortrait"
import { DRIVER_NAMES, TEAM_COLORS } from "@/lib/design"

/**
 * One prediction slot drawn as a painted grid box. Solid paint for required
 * picks, dashed for bonus picks. Without `onOpen` it renders read-only.
 */
export default function DriverSelect({
  label,
  points,
  value,
  optional = false,
  onOpen,
  result,
}: {
  label: string
  points: number
  value: string | null
  optional?: boolean
  onOpen?: () => void
  /** After scoring: whether this pick earned its points. */
  result?: boolean
}) {
  const color = value ? (TEAM_COLORS[value] ?? "#888888") : undefined
  const content = (
    <>
      <span className="flex items-baseline justify-between gap-2 pl-3.5 pt-2.5">
        <span className="timing text-[1.35rem] leading-none sm:text-[1.6rem]">{label}</span>
        <span className={`timing text-[0.75rem] ${result ? "text-f1-green" : "text-text-muted"}`}>
          {result === undefined ? `+${points}` : result ? `+${points}` : "+0"}
          {optional && result === undefined && <span className="ml-1 font-sans text-[0.75rem]">bonus</span>}
        </span>
      </span>

      {value ? (
        <span className="mt-2 flex items-end gap-3 pl-3.5">
          <DriverPortrait code={value} crop="bust" glow={false} className="h-16 w-12 shrink-0 sm:h-20 sm:w-[3.75rem]" />
          <span className="min-w-0 pb-2">
            <span className="timing block text-[1.25rem] leading-none sm:text-[1.4rem]" style={{ color }}>
              {value}
            </span>
            <span className="mt-1 block truncate text-[0.8125rem] text-text-secondary">{DRIVER_NAMES[value]?.last}</span>
          </span>
        </span>
      ) : (
        <span className="flex h-[4.5rem] items-center pl-3.5 text-[0.9375rem] text-text-muted transition-colors group-hover:text-text-primary sm:h-[5.5rem]">
          {onOpen ? "Choose driver" : "No pick"}
        </span>
      )}
    </>
  )

  if (!onOpen) {
    return (
      <div className="grid-box min-w-0" data-optional={optional}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      data-optional={optional}
      aria-label={`${label}: ${value ? DRIVER_NAMES[value]?.last ?? value : "no driver chosen"}. Change pick`}
      className="grid-box group block w-full min-w-0 text-left transition-colors hover:bg-surface-1"
    >
      {content}
    </button>
  )
}
