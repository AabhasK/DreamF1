"use client"

import { useState, useRef } from "react"
import DriverToggles from "./DriverToggles"
import { TEAM_COLORS, teammateDashes } from "@/lib/design"
import { useWidth } from "@/lib/useWidth"

export interface GapData {
  session: string
  drivers: Record<string, { lap_numbers: number[]; gap_seconds: (number | null)[] }>
}

const H = 340
const PAD = { top: 14, right: 64, bottom: 38, left: 58 }

function lerp(val: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  if (inMax === inMin) return outMin
  return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin)
}

function closestIdx(arr: number[], target: number): number {
  let best = 0, bestDiff = Math.abs(arr[0] - target)
  for (let i = 1; i < arr.length; i++) {
    const d = Math.abs(arr[i] - target)
    if (d < bestDiff) { bestDiff = d; best = i }
  }
  return best
}

function isValidGap(g: number | null): g is number {
  return g !== null && typeof g === "number" && isFinite(g)
}

function fmtGap(s: number): string {
  if (Math.abs(s) < 0.05) return "LEAD"
  const sign = s < 0 ? "-" : "+"
  const abs = Math.abs(s)
  if (abs >= 60) return `${sign}${Math.floor(abs / 60)}:${(abs % 60).toFixed(1).padStart(4, "0")}`
  return `${sign}${abs.toFixed(1)}s`
}

export default function GapChart({ data }: { data: GapData }) {
  const codes = Object.keys(data.drivers)
  const dashes = teammateDashes(codes)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [focused, setFocused] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    x: number; lap: number; entries: { code: string; gap: number }[]
  } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [chartRef, W] = useWidth()

  const cL = PAD.left, cR = W - PAD.right, cT = PAD.top, cB = H - PAD.bottom

  const allLaps = codes.flatMap((c) => data.drivers[c].lap_numbers)
  const minLap = Math.min(...allLaps), maxLap = Math.max(...allLaps)

  // Only valid (non-null, finite) gaps across all drivers for axis range
  const allValidGaps = codes.flatMap((c) => data.drivers[c].gap_seconds.filter(isValidGap))
  const rawMin = allValidGaps.length ? Math.min(...allValidGaps) : 0
  const rawMax = allValidGaps.length ? Math.max(...allValidGaps) : 1
  // Always include 0 (race winner baseline) in the visible range
  const minGap = Math.min(rawMin, 0) - 1
  const maxGap = rawMax + 1

  const toX = (lap: number) => lerp(lap, minLap, maxLap, cL, cR)
  const toY = (gap: number) => lerp(gap, minGap, maxGap, cT, cB)

  const zeroY = toY(0)

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    if (vx < cL || vx > cR) { setTooltip(null); return }

    const lapF = lerp(vx, cL, cR, minLap, maxLap)
    const lap = Math.max(minLap, Math.min(maxLap, Math.round(lapF)))

    const entries: { code: string; gap: number }[] = []
    for (const code of codes) {
      if (hidden.has(code)) continue
      const { lap_numbers, gap_seconds } = data.drivers[code]
      if (!lap_numbers.length) continue
      const i = closestIdx(lap_numbers, lap)
      const g = gap_seconds[i]
      if (isValidGap(g) && Math.abs(lap_numbers[i] - lap) <= 2)
        entries.push({ code, gap: g })
    }
    entries.sort((a, b) => a.gap - b.gap)
    setTooltip({ x: toX(lap), lap, entries })
  }

  const lapTicks: number[] = []
  for (let l = Math.ceil(minLap / 10) * 10; l <= maxLap; l += 10) lapTicks.push(l)

  // Gap axis ticks — scale interval to data range, always include 0
  const range = maxGap - minGap
  const interval = range > 120 ? 30 : range > 60 ? 20 : range > 30 ? 10 : 5
  const gapTicks: number[] = []
  const tickStart = Math.ceil(minGap / interval) * interval
  for (let g = tickStart; g <= maxGap; g += interval) gapTicks.push(g)

  return (
    <div className="min-w-0 space-y-5">
      <DriverToggles codes={codes} hidden={hidden} onChange={setHidden} onFocus={setFocused} dashes={dashes} />

      <div ref={chartRef} className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className="timing block cursor-crosshair touch-pan-y select-none"
          onPointerMove={handleMove}
          onPointerLeave={() => setTooltip(null)}
        >
          {/* Gap grid lines */}
          {gapTicks.map((gap) => {
            const y = toY(gap)
            return (
              <g key={gap}>
                <line x1={cL} y1={y} x2={cR} y2={y} className="stroke-border-subtle" strokeWidth={1} />
                <text x={cL - 6} y={y + 4} fontSize={11} className="fill-text-muted" textAnchor="end">
                  {gap === 0 ? "0" : gap > 0 ? `+${gap}s` : `${gap}s`}
                </text>
              </g>
            )
          })}

          {/* Race winner baseline at gap=0 */}
          <line x1={cL} y1={zeroY} x2={cR} y2={zeroY} className="stroke-f1-red" strokeWidth={1} opacity={0.5} strokeDasharray="5 3" />
          <text x={cL - 6} y={zeroY + 4} fontSize={11} className="fill-f1-red" textAnchor="end">P1</text>

          {/* Lap ticks */}
          {lapTicks.map((lap) => {
            const x = toX(lap)
            return (
              <g key={lap}>
                <line x1={x} y1={cT} x2={x} y2={cB} className="stroke-surface-2" strokeWidth={1} />
                <text x={x} y={cB + 16} fontSize={11} className="fill-text-muted" textAnchor="middle">{lap}</text>
              </g>
            )
          })}

          <text x={(cL + cR) / 2} y={H - 2} fontSize={11} className="fill-text-muted" textAnchor="middle">LAP</text>

          {/* Gap lines per driver — focused driver drawn last (on top) */}
          {codes
            .filter((c) => !hidden.has(c))
            .sort((a, b) => (a === focused ? 1 : 0) - (b === focused ? 1 : 0))
            .map((code) => {
              const { lap_numbers, gap_seconds } = data.drivers[code]
              // Filter out null/NaN gaps — isValidGap prevents isFinite(null) coercion bug
              const valid = lap_numbers
                .map((l, i) => ({ l, g: gap_seconds[i] }))
                .filter((x): x is { l: number; g: number } => isValidGap(x.g))

              if (!valid.length) return null
              const pts = valid.map(({ l, g }) => `${toX(l).toFixed(1)},${toY(g).toFixed(1)}`).join(" ")
              const color = TEAM_COLORS[code] ?? "#888888"
              const last = valid[valid.length - 1]
              const isF = focused === code
              const dim = focused !== null && !isF
              return (
                <g key={code} opacity={dim ? 0.12 : 1}>
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={color}
                    strokeWidth={isF ? 3.25 : 2}
                    strokeDasharray={dashes[code] || undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.9}
                  />
                  <text
                    x={toX(last.l) + 5}
                    y={toY(last.g) + 4}
                    fontSize={isF ? 12 : 10}
                    fontWeight={isF ? 700 : 400}
                    fill={color}
                   
                  >
                    {code}
                  </text>
                </g>
              )
            })}

          {/* Crosshair + dots */}
          {tooltip && (
            <>
              <line x1={tooltip.x} y1={cT} x2={tooltip.x} y2={cB} className="stroke-text-muted" strokeWidth={1} strokeDasharray="4 3" />
              {tooltip.entries.map(({ code, gap }) => (
                <circle key={code} cx={tooltip.x} cy={toY(gap)} r={4} fill={TEAM_COLORS[code] ?? "#888888"} className="stroke-surface-0" strokeWidth={1.5} />
              ))}
            </>
          )}
        </svg>

        {tooltip && tooltip.entries.length > 0 && (
          <div
            className="pointer-events-none absolute top-2 z-10 border border-border-default bg-surface-1 px-3 py-2 corner-sm min-w-28"
            style={{
              left: tooltip.x / W > 0.72 ? "auto" : `calc(${(tooltip.x / W) * 100}% + 10px)`,
              right: tooltip.x / W > 0.72 ? `calc(${(1 - tooltip.x / W) * 100}% + 10px)` : "auto",
            }}
          >
            <div className="timing mb-1 text-[0.6875rem] text-text-muted">LAP {tooltip.lap}</div>
            {tooltip.entries.map(({ code, gap }) => (
              <div key={code} className="timing flex justify-between gap-4 text-[0.75rem]">
                <span style={{ color: TEAM_COLORS[code] ?? "#888888" }}>{code}</span>
                <span className="text-text-secondary">{fmtGap(gap)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
