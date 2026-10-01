// Small display helpers shared by the standings, picks and circles views.

/** 292 -> "292", 12.5 -> "12.5" */
export function fmtPoints(p: number | null | undefined): string {
  if (p == null || !isFinite(p)) return "—"
  return Number.isInteger(p) ? String(p) : p.toFixed(1)
}

/** "Andrea Kimi Antonelli" -> { first: "Andrea Kimi", last: "Antonelli" } */
export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/)
  return { first: parts.slice(0, -1).join(" "), last: parts.at(-1) ?? full }
}

export const PODIUM_COLOR: Record<number, string> = {
  1: "var(--color-gold)",
  2: "var(--color-silver)",
  3: "var(--color-bronze)",
}
