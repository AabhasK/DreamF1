"use client"

import { useRef, useState } from "react"
import DriverToggles from "./DriverToggles"
import { TEAM_COLORS, teammateDashes } from "@/lib/design"
import { useWidth } from "@/lib/useWidth"

interface DriverSpeed {
  distance: number[]
  speed: number[]
}

interface Props {
  drivers: Record<string, DriverSpeed>
  top?: number
  /** Shared cursor as a fraction of the lap (0–1), so a track map can follow along. */
  cursor?: number | null
  onCursor?: (fraction: number | null) => void
}

const H = 320
const PAD = { top: 12, right: 14, bottom: 34, left: 44 }

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

export default function SpeedTrace({ drivers, top = 10, cursor, onCursor }: Props) {
  const driverCodes = Object.keys(drivers).slice(0, top)
  const dashes = teammateDashes(driverCodes)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [focused, setFocused] = useState<string | null>(null)
  const [ownCursor, setOwnCursor] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [chartRef, W] = useWidth()

  if (driverCodes.length === 0) return null

  // Controlled when a parent shares the cursor, otherwise local.
  const frac = cursor !== undefined ? cursor : ownCursor
  const setFrac = onCursor ?? setOwnCursor

  const cL = PAD.left, cR = W - PAD.right, cT = PAD.top, cB = H - PAD.bottom

  const allDist = driverCodes.flatMap((d) => drivers[d].distance)
  const allSpeed = driverCodes.flatMap((d) => drivers[d].speed)
  const minDist = Math.min(...allDist), maxDist = Math.max(...allDist)
  const minSpeed = Math.min(...allSpeed), maxSpeed = Math.max(...allSpeed)

  const toX = (dist: number) => lerp(dist, minDist, maxDist, cL, cR)
  const toY = (speed: number) => lerp(speed, minSpeed, maxSpeed, cB, cT)

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    setFrac(vx < cL || vx > cR ? null : (vx - cL) / (cR - cL))
  }

  // Values under the cursor, fastest first.
  const tooltip = (() => {
    if (frac == null) return null
    const dist = minDist + frac * (maxDist - minDist)
    const entries = driverCodes
      .filter((code) => !hidden.has(code) && drivers[code].distance.length)
      .map((code) => ({ code, speed: drivers[code].speed[closestIdx(drivers[code].distance, dist)] }))
      .sort((a, b) => b.speed - a.speed)
    return { x: toX(dist), dist: Math.round(dist), entries }
  })()

  const gridSpeeds: number[] = []
  for (let s = Math.ceil(minSpeed / 50) * 50; s <= maxSpeed; s += 50) gridSpeeds.push(s)

  return (
    <div className="min-w-0 space-y-5">
      <DriverToggles codes={driverCodes} hidden={hidden} onChange={setHidden} onFocus={setFocused} dashes={dashes} />

      <div ref={chartRef} className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className="timing block cursor-crosshair touch-pan-y select-none"
          onPointerMove={handleMove}
          onPointerLeave={() => setFrac(null)}
        >
          {gridSpeeds.map((speed) => {
            const y = toY(speed)
            return (
              <g key={speed}>
                <line x1={cL} y1={y} x2={cR} y2={y} className="stroke-border-subtle" strokeWidth={1} />
                <text x={cL - 6} y={y + 4} fontSize={13} className="fill-text-muted" textAnchor="end">{speed}</text>
              </g>
            )
          })}

          <text x={(cL + cR) / 2} y={H - 6} fontSize={12} className="fill-text-muted" textAnchor="middle">
            DISTANCE (M)
          </text>

          {/* Speed traces — focused driver drawn last (on top) */}
          {driverCodes
            .filter((c) => !hidden.has(c))
            .sort((a, b) => (a === focused ? 1 : 0) - (b === focused ? 1 : 0))
            .map((code) => {
              const { distance, speed } = drivers[code]
              const pts = distance.map((d, i) => `${toX(d).toFixed(1)},${toY(speed[i]).toFixed(1)}`).join(" ")
              const isF = focused === code
              const dim = focused !== null && !isF
              return (
                <polyline
                  key={code}
                  points={pts}
                  fill="none"
                  stroke={TEAM_COLORS[code] ?? "#888888"}
                  strokeWidth={isF ? 3.25 : 2}
                  strokeDasharray={dashes[code] || undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={dim ? 0.12 : 0.9}
                />
              )
            })}

          {tooltip && (
            <>
              <line x1={tooltip.x} y1={cT} x2={tooltip.x} y2={cB} className="stroke-text-muted" strokeWidth={1} strokeDasharray="4 3" />
              {tooltip.entries.map(({ code, speed }) => (
                <circle key={code} cx={tooltip.x} cy={toY(speed)} r={4} fill={TEAM_COLORS[code] ?? "#888888"} className="stroke-surface-0" strokeWidth={1.5} />
              ))}
            </>
          )}
        </svg>

        {tooltip && tooltip.entries.length > 0 && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-28 border border-border-default bg-surface-1 px-3 py-2 corner-sm"
            style={{
              left: tooltip.x / W > 0.72 ? "auto" : `calc(${(tooltip.x / W) * 100}% + 10px)`,
              right: tooltip.x / W > 0.72 ? `calc(${(1 - tooltip.x / W) * 100}% + 10px)` : "auto",
            }}
          >
            <div className="timing mb-1 text-[0.6875rem] text-text-muted">{tooltip.dist} M</div>
            {tooltip.entries.map(({ code, speed }) => (
              <div key={code} className="timing flex justify-between gap-4 text-[0.75rem]">
                <span style={{ color: TEAM_COLORS[code] }}>{code}</span>
                <span className="text-text-secondary">{Math.round(speed)} KM/H</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
