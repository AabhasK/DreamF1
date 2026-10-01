"use client"

import { TEAM_COLORS } from "@/lib/design"

/** Show/hide chips for chart series, with all/none shortcuts. Hovering a chip can focus its line. */
export default function DriverToggles({
  codes,
  hidden,
  onChange,
  onFocus,
  dashes,
}: {
  codes: string[]
  hidden: Set<string>
  onChange: (next: Set<string>) => void
  onFocus?: (code: string | null) => void
  dashes?: Record<string, string>
}) {
  const toggle = (code: string) => {
    const next = new Set(hidden)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    onChange(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {codes.map((code) => {
        const color = TEAM_COLORS[code] ?? "#888888"
        const on = !hidden.has(code)
        return (
          <button
            key={code}
            type="button"
            onClick={() => toggle(code)}
            onMouseEnter={() => onFocus?.(code)}
            onMouseLeave={() => onFocus?.(null)}
            onFocus={() => onFocus?.(code)}
            onBlur={() => onFocus?.(null)}
            aria-pressed={on}
            className={`timing inline-flex h-8 items-center gap-1.5 border px-2.5 text-[0.75rem] transition-colors corner-sm ${
              on ? "border-border-muted text-text-primary" : "border-border-subtle text-text-dim"
            }`}
          >
            <span
              className="inline-block w-3.5"
              style={{ borderTop: `2px ${dashes?.[code] ? "dashed" : "solid"} ${on ? color : "currentColor"}` }}
              aria-hidden="true"
            />
            {code}
          </button>
        )
      })}
      <span className="inline-flex items-center whitespace-nowrap">
        <span className="mx-1 h-5 w-px bg-border-default" aria-hidden="true" />
        <button
          type="button"
          onClick={() => onChange(new Set())}
          className="h-8 px-2 text-[0.8125rem] font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          All
        </button>
        <button
          type="button"
          onClick={() => onChange(new Set(codes))}
          className="h-8 px-2 text-[0.8125rem] font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          None
        </button>
      </span>
    </div>
  )
}
