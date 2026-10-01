"use client"

import { useMemo, useState } from "react"

export interface RaceControlMessage {
  lap: number | null
  category: string
  flag: string | null
  scope: string | null
  kind: "safety" | "flag" | "steward" | "track_limits" | "drs" | "other"
  message: string
}

export interface RaceControlData {
  session: string
  summary: {
    total: number
    yellow_flags: number
    red_flags: number
    safety_car: number
    virtual_sc: number
    penalties: number
    investigations: number
    deleted_laps: number
  }
  messages: RaceControlMessage[]
}

const FLAG_COLOR: Record<string, string> = {
  GREEN: "#4ade80",
  YELLOW: "#facc15",
  "DOUBLE YELLOW": "#f59e0b",
  RED: "#E10600",
  BLUE: "#3b82f6",
  CHEQUERED: "#e0e0e0",
  CLEAR: "#3f3f3f",
}

const KIND: Record<
  RaceControlMessage["kind"],
  { label: string; color: string; glyph: string }
> = {
  safety: { label: "Safety car", color: "#facc15", glyph: "SC" },
  flag: { label: "Flags", color: "#4ade80", glyph: "FLAG" },
  steward: { label: "Stewards", color: "#E10600", glyph: "FIA" },
  track_limits: { label: "Track limits", color: "#c084fc", glyph: "TL" },
  drs: { label: "DRS", color: "#00D7B6", glyph: "DRS" },
  other: { label: "Other", color: "#8a8e96", glyph: "INFO" },
}

/** Normalise kind — older backends may not send it; bucket those as "other". */
function kindOf(m: RaceControlMessage): RaceControlMessage["kind"] {
  return m.kind && m.kind in KIND ? m.kind : "other"
}

/** Accent colour for a message — flag colour wins, else the kind colour. */
function accentFor(m: RaceControlMessage): string {
  if (m.flag && FLAG_COLOR[m.flag]) return FLAG_COLOR[m.flag]
  return KIND[kindOf(m)].color
}

function SummaryStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="timing mt-1.5 text-[1.5rem] leading-none" style={{ color: value > 0 ? accent : "var(--color-text-dim)" }}>
        {value}
      </dd>
    </div>
  )
}

type Filter = "all" | RaceControlMessage["kind"]

export default function RaceControl({ data }: { data: RaceControlData }) {
  const s = data.summary
  const [filter, setFilter] = useState<Filter>("all")

  // Which kinds actually appear, with counts, to build the filter bar.
  const kindCounts = useMemo(() => {
    const c = new Map<RaceControlMessage["kind"], number>()
    for (const m of data.messages) {
      const k = kindOf(m)
      c.set(k, (c.get(k) ?? 0) + 1)
    }
    return c
  }, [data.messages])

  const filtered =
    filter === "all" ? data.messages : data.messages.filter((m) => kindOf(m) === filter)

  const filters: Filter[] = [
    "all",
    ...(["safety", "flag", "steward", "track_limits", "drs", "other"] as const).filter(
      (k) => kindCounts.get(k),
    ),
  ]

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-3 gap-x-6 gap-y-6 sm:grid-cols-4 lg:grid-cols-7">
        <SummaryStat label="Yellow periods" value={s.yellow_flags} accent="var(--color-f1-yellow)" />
        <SummaryStat label="Red flags" value={s.red_flags} accent="var(--color-f1-red)" />
        <SummaryStat label="Safety car" value={s.safety_car} accent="var(--color-f1-yellow)" />
        <SummaryStat label="Virtual SC" value={s.virtual_sc} accent="var(--color-f1-yellow)" />
        <SummaryStat label="Penalties" value={s.penalties} accent="var(--color-f1-red)" />
        <SummaryStat label="Investigations" value={s.investigations} accent="var(--color-text-primary)" />
        <SummaryStat label="Deleted laps" value={s.deleted_laps} accent="var(--color-f1-purple)" />
      </dl>

      <div>
        <div className="scroll-x gap-1 border-b border-border-subtle" role="group" aria-label="Filter messages">
          {filters.map((f) => {
            const active = filter === f
            const count = f === "all" ? data.messages.length : kindCounts.get(f) ?? 0
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className={`relative h-11 shrink-0 px-3 text-[0.875rem] font-medium transition-colors ${
                  active ? "text-text-primary" : "text-text-muted hover:text-text-primary"
                }`}
              >
                {f === "all" ? "All" : KIND[f].label}
                <span className="timing ml-1.5 text-[0.75rem] text-text-muted">{count}</span>
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-f1-red" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        <ol className="max-h-[34rem] overflow-y-auto" data-lenis-prevent>
          {filtered.length === 0 ? (
            <li className="py-6 text-text-muted">No messages in this category.</li>
          ) : (
            filtered.map((m, i) => {
              const accent = accentFor(m)
              const meta = KIND[kindOf(m)]
              return (
                <li key={i} className="grid grid-cols-[3rem_2.75rem_minmax(0,1fr)] items-start gap-3 border-b border-border-subtle py-2.5">
                  <span className="timing pt-0.5 text-right text-[0.75rem] text-text-muted">{m.lap != null ? `L${m.lap}` : "—"}</span>
                  <span
                    className="timing mt-0.5 justify-self-start px-1.5 py-0.5 text-[0.625rem]"
                    style={{ color: accent, boxShadow: `inset 0 0 0 1px ${accent}` }}
                    title={meta.label}
                  >
                    {meta.glyph}
                  </span>
                  <span className="text-[0.875rem] leading-relaxed text-text-secondary">
                    {m.message}
                    {m.flag && m.flag !== "CLEAR" && m.flag !== "None" && (
                      <span className="timing ml-2 text-[0.6875rem]" style={{ color: accent }}>
                        {m.flag}
                      </span>
                    )}
                  </span>
                </li>
              )
            })
          )}
        </ol>
      </div>
    </div>
  )
}
