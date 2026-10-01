"use client"

import { useState, useRef } from "react"
import DriverToggles from "./DriverToggles"
import { TEAM_COLORS } from "@/lib/design"
import { useWidth } from "@/lib/useWidth"

export interface PositionData {
  session: string
  drivers: Record<string, { lap_numbers: number[]; positions: number[] }>
}

const H = 340
const PAD = { top: 14, right: 64, bottom: 38, left: 42 }
const MAX_POS = 22

function lerp(val: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  if (inMax === inMin) return outMin
  return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin)
}

function closestIdx(arr: number[], target: number): number {
  let best = 0
  let bestDiff = Math.abs(arr[0] - target)
  for (let i = 1; i < arr.length; i++) {
    const d = Math.abs(arr[i] - target)
    if (d < bestDiff) { bestDiff = d; best = i }
  }
  return best
}

export default function PositionChart({ data }: { data: PositionData }) {
  const codes = Object.keys(data.drivers)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [tooltip, setTooltip] = useState<{
    x: number; lap: number; entries: { code: string; pos: number }[]
  } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [chartRef, W] = useWidth()

  const cL = PAD.left, cR = W - PAD.right, cT = PAD.top, cB = H - PAD.bottom
  const allLaps = codes.flatMap((c) => data.drivers[c].lap_numbers)
  const minLap = Math.min(...allLaps), maxLap = Math.max(...allLaps)

  const toX = (lap: number) => lerp(lap, minLap, maxLap, cL, cR)
  const toY = (pos: number) => lerp(pos, 1, MAX_POS, cT, cB)

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    if (vx < cL || vx > cR) { setTooltip(null); return }

    const lapF = lerp(vx, cL, cR, minLap, maxLap)
    const lap = Math.max(minLap, Math.min(maxLap, Math.round(lapF)))

    const entries: { code: string; pos: number }[] = []
    for (const code of codes) {
      if (hidden.has(code)) continue
      const { lap_numbers, positions } = data.drivers[code]
      if (!lap_numbers.length) continue
      const i = closestIdx(lap_numbers, lap)
      if (Math.abs(lap_numbers[i] - lap) <= 2)
        entries.push({ code, pos: positions[i] })
    }
    entries.sort((a, b) => a.pos - b.pos)
    setTooltip({ x: toX(lap), lap, entries })
  }

  const posTicks = [1, 5, 10, 15, 20]
  const lapTicks: number[] = []
  for (let l = Math.ceil(minLap / 10) * 10; l <= maxLap; l += 10) lapTicks.push(l)

  return (
    <div className="min-w-0 space-y-5">
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
          {/* Horizontal grid — one per position tick */}
          {posTicks.map((pos) => {
            const y = toY(pos)
            return (
              <g key={pos}>
                <line x1={cL} y1={y} x2={cR} y2={y} className="stroke-border-subtle" strokeWidth={1} />
                <text x={cL - 6} y={y + 4} fontSize={12} className="fill-text-muted" textAnchor="end">
                  P{pos}
                </text>
              </g>
            )
          })}

          {/* Vertical lap ticks */}
          {lapTicks.map((lap) => {
            const x = toX(lap)
            return (
              <g key={lap}>
                <line x1={x} y1={cT} x2={x} y2={cB} className="stroke-surface-2" strokeWidth={1} />
                <text x={x} y={cB + 16} fontSize={11} className="fill-text-muted" textAnchor="middle">
                  {lap}
                </text>
              </g>
            )
          })}

          <text x={(cL + cR) / 2} y={H - 2} fontSize={11} className="fill-text-muted" textAnchor="middle">
            LAP
          </text>

          {/* Driver lines */}
          {codes.filter((c) => !hidden.has(c)).map((code) => {
            const { lap_numbers, positions } = data.drivers[code]
            const pts = lap_numbers.map((l, i) => `${toX(l).toFixed(1)},${toY(positions[i]).toFixed(1)}`).join(" ")
            const color = TEAM_COLORS[code] ?? "#888888"
            const lastLap = lap_numbers[lap_numbers.length - 1]
            const lastPos = positions[positions.length - 1]
            return (
              <g key={code}>
                <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
                <text x={toX(lastLap) + 5} y={toY(lastPos) + 4} fontSize={10} fill={color}>{code}</text>
              </g>
            )
          })}

          {/* Crosshair + dots */}
          {tooltip && (
            <>
              <line x1={tooltip.x} y1={cT} x2={tooltip.x} y2={cB} className="stroke-text-muted" strokeWidth={1} strokeDasharray="4 3" />
              {tooltip.entries.map(({ code, pos }) => (
                <circle key={code} cx={tooltip.x} cy={toY(pos)} r={4} fill={TEAM_COLORS[code] ?? "#888888"} className="stroke-surface-0" strokeWidth={1.5} />
              ))}
            </>
          )}
        </svg>

        {/* Floating tooltip */}
        {tooltip && tooltip.entries.length > 0 && (
          <div
            className="pointer-events-none absolute top-2 z-10 border border-border-default bg-surface-1 px-3 py-2 corner-sm min-w-24"
            style={{
              left: tooltip.x / W > 0.72 ? "auto" : `calc(${(tooltip.x / W) * 100}% + 10px)`,
              right: tooltip.x / W > 0.72 ? `calc(${(1 - tooltip.x / W) * 100}% + 10px)` : "auto",
            }}
          >
            <div className="timing mb-1 text-[0.6875rem] text-text-muted">LAP {tooltip.lap}</div>
            {tooltip.entries.map(({ code, pos }) => (
              <div key={code} className="timing flex justify-between gap-4 text-[0.75rem]">
                <span style={{ color: TEAM_COLORS[code] ?? "#888888" }}>{code}</span>
                <span className="text-text-secondary">P{pos}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
