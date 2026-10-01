"use client"

import { useState, useRef } from "react"
import DriverToggles from "./DriverToggles"
import { TEAM_COLORS } from "@/lib/design"
import { useWidth } from "@/lib/useWidth"

export interface LapTimesData {
  session: string
  drivers: Record<string, {
    lap_numbers: number[]
    lap_times: (number | null)[]
    compound: string[]
  }>
}

const H = 340
const PAD = { top: 14, right: 64, bottom: 38, left: 54 }

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "#E8002D",
  MEDIUM: "#FFF200",
  HARD: "#DCDCDC",
  INTERMEDIATE: "#39B54A",
  INTER: "#39B54A",
  WET: "#0067FF",
}

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

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const rem = (s % 60).toFixed(3).padStart(6, "0")
  return `${m}:${rem}`
}

export default function LapTimesChart({ data }: { data: LapTimesData }) {
  const codes = Object.keys(data.drivers)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [tooltip, setTooltip] = useState<{
    x: number; lap: number; entries: { code: string; time: number; compound: string }[]
  } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [chartRef, W] = useWidth()

  const cL = PAD.left, cR = W - PAD.right, cT = PAD.top, cB = H - PAD.bottom

  // Collect all valid (lap, time) pairs across visible drivers for axis range
  const allValid = codes.flatMap((c) =>
    data.drivers[c].lap_numbers
      .map((l, i) => ({ l, t: data.drivers[c].lap_times[i] }))
      .filter((x): x is { l: number; t: number } => x.t !== null)
  )
  const allLaps = codes.flatMap((c) => data.drivers[c].lap_numbers)
  const minLap = Math.min(...allLaps), maxLap = Math.max(...allLaps)
  const allTimes = allValid.map((x) => x.t)
  const minTime = Math.min(...allTimes) - 0.3
  const maxTime = Math.max(...allTimes) + 0.3

  const toX = (lap: number) => lerp(lap, minLap, maxLap, cL, cR)
  const toY = (t: number) => lerp(t, minTime, maxTime, cT, cB)

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    if (vx < cL || vx > cR) { setTooltip(null); return }

    const lapF = lerp(vx, cL, cR, minLap, maxLap)
    const lap = Math.max(minLap, Math.min(maxLap, Math.round(lapF)))

    const entries: { code: string; time: number; compound: string }[] = []
    for (const code of codes) {
      if (hidden.has(code)) continue
      const { lap_numbers, lap_times, compound } = data.drivers[code]
      if (!lap_numbers.length) continue
      const i = closestIdx(lap_numbers, lap)
      const t = lap_times[i]
      if (t !== null && Math.abs(lap_numbers[i] - lap) <= 2)
        entries.push({ code, time: t, compound: compound[i] ?? "UNKNOWN" })
    }
    entries.sort((a, b) => a.time - b.time)
    setTooltip({ x: toX(lap), lap, entries })
  }

  // Y-axis gridlines: every ~0.5s, capped to 8 lines
  const timeTick = (maxTime - minTime) > 3 ? 1 : 0.5
  const timeTicks: number[] = []
  for (let t = Math.ceil(minTime / timeTick) * timeTick; t <= maxTime; t += timeTick)
    timeTicks.push(parseFloat(t.toFixed(3)))

  const lapTicks: number[] = []
  for (let l = Math.ceil(minLap / 10) * 10; l <= maxLap; l += 10) lapTicks.push(l)

  return (
    <div className="min-w-0 space-y-5">
      {/* Compound legend */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border-subtle pb-3">
        {Object.entries(COMPOUND_COLORS).filter(([k]) => k !== "INTER").map(([c, color]) => (
          <span key={c} className="timing flex items-center gap-1.5 text-[0.6875rem] text-text-secondary">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {c}
          </span>
        ))}
      </div>

      {/* Driver toggles */}
      <DriverToggles codes={codes} hidden={hidden} onChange={setHidden} />

      <div ref={chartRef} className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className="timing block cursor-crosshair touch-pan-y select-none"
          onPointerMove={handleMove}
          onPointerLeave={() => setTooltip(null)}
        >
          {/* Time grid */}
          {timeTicks.map((t) => {
            const y = toY(t)
            return (
              <g key={t}>
                <line x1={cL} y1={y} x2={cR} y2={y} className="stroke-border-subtle" strokeWidth={1} />
                <text x={cL - 6} y={y + 4} fontSize={11} className="fill-text-muted" textAnchor="end">
                  {fmtTime(t)}
                </text>
              </g>
            )
          })}

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

          {/* Lines + compound dots per driver */}
          {codes.filter((c) => !hidden.has(c)).map((code) => {
            const { lap_numbers, lap_times, compound } = data.drivers[code]
            const valid = lap_numbers
              .map((l, i) => ({ l, t: lap_times[i], c: compound[i] ?? "UNKNOWN" }))
              .filter((x): x is { l: number; t: number; c: string } => x.t !== null)

            if (!valid.length) return null
            const color = TEAM_COLORS[code] ?? "#888888"

            // Build polyline segments — break line at compound changes (pit stops)
            const segments: { l: number; t: number; c: string }[][] = []
            let seg: { l: number; t: number; c: string }[] = []
            for (let i = 0; i < valid.length; i++) {
              if (i > 0 && valid[i].c !== valid[i - 1].c) {
                segments.push(seg)
                seg = [valid[i - 1]] // carry last point as connector
              }
              seg.push(valid[i])
            }
            if (seg.length) segments.push(seg)

            return (
              <g key={code}>
                {/* Thin guide line in team color */}
                <polyline
                  points={valid.map(({ l, t }) => `${toX(l).toFixed(1)},${toY(t).toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  opacity={0.3}
                />
                {/* Compound-colored dots */}
                {valid.map(({ l, t, c }) => (
                  <circle
                    key={l}
                    cx={toX(l)}
                    cy={toY(t)}
                    r={3}
                    fill={COMPOUND_COLORS[c.toUpperCase()] ?? "#555"}
                    opacity={0.9}
                  />
                ))}
                {/* End label */}
                {(() => {
                  const last = valid[valid.length - 1]
                  return (
                    <text x={toX(last.l) + 5} y={toY(last.t) + 4} fontSize={10} fill={color}>{code}</text>
                  )
                })()}
              </g>
            )
          })}

          {/* Crosshair */}
          {tooltip && (
            <>
              <line x1={tooltip.x} y1={cT} x2={tooltip.x} y2={cB} className="stroke-text-muted" strokeWidth={1} strokeDasharray="4 3" />
              {tooltip.entries.map(({ code, time }) => (
                <circle key={code} cx={tooltip.x} cy={toY(time)} r={4} fill={TEAM_COLORS[code] ?? "#888888"} className="stroke-surface-0" strokeWidth={1.5} />
              ))}
            </>
          )}
        </svg>

        {tooltip && tooltip.entries.length > 0 && (
          <div
            className="pointer-events-none absolute top-2 z-10 border border-border-default bg-surface-1 px-3 py-2 corner-sm min-w-32"
            style={{
              left: tooltip.x / W > 0.72 ? "auto" : `calc(${(tooltip.x / W) * 100}% + 10px)`,
              right: tooltip.x / W > 0.72 ? `calc(${(1 - tooltip.x / W) * 100}% + 10px)` : "auto",
            }}
          >
            <div className="timing mb-1 text-[0.6875rem] text-text-muted">LAP {tooltip.lap}</div>
            {tooltip.entries.map(({ code, time, compound }) => (
              <div key={code} className="timing flex items-center justify-between gap-4 text-[0.75rem]">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: COMPOUND_COLORS[compound.toUpperCase()] ?? "#555" }}
                  />
                  <span style={{ color: TEAM_COLORS[code] ?? "#888888" }}>{code}</span>
                </span>
                <span className="text-text-secondary">{fmtTime(time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
