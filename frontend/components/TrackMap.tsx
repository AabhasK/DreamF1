"use client"

import { useMemo, useRef } from "react"

export interface TrackSegment {
  /** Lap fraction where the segment starts and ends, 0–1. */
  from: number
  to: number
  color: string
}

/**
 * The circuit drawn from fastest-lap GPS, with a cursor that maps a lap
 * fraction (0 = start line) to a point on track. Hovering the map reports the
 * fraction back, so charts and map can share one cursor. `segments` paints
 * stretches of track, e.g. who was faster where.
 */
export default function TrackMap({
  x,
  y,
  cursor,
  onCursor,
  segments,
  label,
  className = "",
}: {
  x: number[]
  y: number[]
  cursor: number | null
  onCursor?: (fraction: number | null) => void
  segments?: TrackSegment[]
  label: string
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  const geo = useMemo(() => {
    const ys = y.map((v) => -v) // GPS north is up, SVG y grows down
    const cum = [0]
    for (let i = 1; i < x.length; i++) cum.push(cum[i - 1] + Math.hypot(x[i] - x[i - 1], ys[i] - ys[i - 1]))
    const total = cum.at(-1) || 1
    const xMin = Math.min(...x), xMax = Math.max(...x)
    const yMin = Math.min(...ys), yMax = Math.max(...ys)
    const size = Math.max(xMax - xMin, yMax - yMin) || 1
    const pad = size * 0.08
    return {
      ys,
      frac: cum.map((c) => c / total),
      size,
      viewBox: `${xMin - pad} ${yMin - pad} ${xMax - xMin + pad * 2} ${yMax - yMin + pad * 2}`,
      points: x.map((v, i) => `${v},${ys[i]}`).join(" "),
    }
  }, [x, y])

  if (x.length < 2) return null
  const T = geo.size * 0.012 // base stroke, scales with the circuit

  // Point on track at a lap fraction, interpolated between GPS samples.
  const pointAt = (f: number) => {
    const fr = geo.frac
    const i = fr.findIndex((v) => v >= f)
    if (i <= 0) return { px: x[0], py: geo.ys[0] }
    const t = (f - fr[i - 1]) / ((fr[i] - fr[i - 1]) || 1)
    return { px: x[i - 1] + (x[i] - x[i - 1]) * t, py: geo.ys[i - 1] + (geo.ys[i] - geo.ys[i - 1]) * t }
  }

  const segmentPoints = (from: number, to: number) => {
    const pts: string[] = []
    const a = pointAt(from)
    pts.push(`${a.px},${a.py}`)
    geo.frac.forEach((f, i) => {
      if (f > from && f < to) pts.push(`${x[i]},${geo.ys[i]}`)
    })
    const b = pointAt(to)
    pts.push(`${b.px},${b.py}`)
    return pts.join(" ")
  }

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!onCursor || !svgRef.current) return
    const ctm = svgRef.current.getScreenCTM()
    if (!ctm) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < x.length; i++) {
      const d = (x[i] - p.x) ** 2 + (geo.ys[i] - p.y) ** 2
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    // Only follow the pointer when it is reasonably close to the track.
    onCursor(Math.sqrt(bestD) < geo.size * 0.08 ? geo.frac[best] : null)
  }

  const start = { px: x[0], py: geo.ys[0] }
  const dx = x[3] - x[0], dy = geo.ys[3] - geo.ys[0]
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * T * 2.4, ny = (dx / len) * T * 2.4
  const cur = cursor == null ? null : pointAt(Math.min(1, Math.max(0, cursor)))

  return (
    <svg
      ref={svgRef}
      viewBox={geo.viewBox}
      role="img"
      aria-label={label}
      className={`block h-auto w-full touch-none select-none ${onCursor ? "cursor-crosshair" : ""} ${className}`}
      onPointerMove={handleMove}
      onPointerLeave={() => onCursor?.(null)}
    >
      <polyline points={geo.points} fill="none" className="stroke-surface-3" strokeWidth={T * 3.2} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={geo.points} fill="none" className="stroke-text-primary" strokeWidth={T * 0.7} strokeLinejoin="round" strokeLinecap="round" opacity={segments ? 0.3 : 0.9} />
      {segments?.map((s, i) => (
        <polyline
          key={i}
          points={segmentPoints(s.from, s.to)}
          fill="none"
          stroke={s.color}
          strokeWidth={T * 1.6}
          strokeLinejoin="round"
          strokeLinecap="butt"
        />
      ))}
      <line
        x1={start.px + nx}
        y1={start.py + ny}
        x2={start.px - nx}
        y2={start.py - ny}
        className="stroke-f1-red"
        strokeWidth={T * 1.1}
        strokeLinecap="square"
      />
      {cur && <circle cx={cur.px} cy={cur.py} r={T * 1.7} className="fill-text-primary stroke-f1-red" strokeWidth={T * 0.8} />}
    </svg>
  )
}
