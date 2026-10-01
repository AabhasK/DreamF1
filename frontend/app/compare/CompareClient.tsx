"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import DriverPortrait from "@/components/DriverPortrait"
import DriverPicker from "@/components/DriverPicker"
import TrackMap, { type TrackSegment } from "@/components/TrackMap"
import { DRIVER_NAMES, TEAM_COLORS } from "@/lib/design"
import { parseUTC } from "@/lib/trackData"
import { fmtLap, type F1Event } from "@/lib/f1"
import { useWidth } from "@/lib/useWidth"

interface DriverChannels {
  team_slug: string
  lap_time: number | null
  compound: string | null
  distance: number[]
  speed: number[]
  throttle: number[]
  brake: number[]
  gear: (number | null)[]
  drs: number[]
}

interface CompareData {
  session: string
  round: number
  d1: string
  d2: string
  drivers: Record<string, DriverChannels>
  delta: { distance: number[]; delta: (number | null)[] } | null
  _error?: string
}

interface MapData {
  x: number[]
  y: number[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""
const MINI_SECTORS = 25

function closestIdx(arr: number[], target: number): number {
  let best = 0
  for (let i = 1; i < arr.length; i++) if (Math.abs(arr[i] - target) < Math.abs(arr[best] - target)) best = i
  return best
}

/**
 * Who was faster where. `delta` is driver 2's time minus driver 1's along the
 * lap, so if it grows across a mini-sector, driver 2 lost time there.
 */
function dominance(delta: CompareData["delta"], lapLength: number, c1: string, c2: string): TrackSegment[] {
  if (!delta || !lapLength) return []
  const valueAt = (dist: number) => delta.delta[closestIdx(delta.distance, dist)]
  const out: TrackSegment[] = []
  for (let k = 0; k < MINI_SECTORS; k++) {
    const from = k / MINI_SECTORS
    const to = (k + 1) / MINI_SECTORS
    const a = valueAt(from * lapLength)
    const b = valueAt(to * lapLength)
    if (a == null || b == null) continue
    out.push({ from, to, color: b > a ? c1 : c2 })
  }
  return out
}

// ── One channel chart; all charts share a cursor (a fraction of the lap) ──
interface Series {
  dist: number[]
  vals: (number | null)[]
  color: string
  dash?: string
}

function Chart({
  label,
  series,
  height = 110,
  yMin,
  yMax,
  baseline,
  fmtY,
  ticks,
  dMax,
  cursor,
  onCursor,
}: {
  label: string
  series: Series[]
  height?: number
  yMin?: number
  yMax?: number
  baseline?: number
  fmtY?: (v: number) => string
  ticks?: number[]
  dMax: number
  cursor: number | null
  onCursor: (f: number | null) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [chartRef, W] = useWidth()
  const PAD = { l: 52, r: 12, t: 10, b: 6 }
  const allV = series.flatMap((s) => s.vals).filter((v): v is number => v != null)
  const lo = yMin ?? (allV.length ? Math.min(...allV) : 0)
  const hi = yMax ?? (allV.length ? Math.max(...allV) : 1)
  const x = (d: number) => PAD.l + (d / (dMax || 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => height - PAD.b - ((v - lo) / (hi - lo || 1)) * (height - PAD.t - PAD.b)
  const fy = fmtY ?? ((v: number) => `${Math.round(v)}`)

  const path = (s: Series) => {
    let d = ""
    let started = false
    for (let i = 0; i < s.vals.length; i++) {
      const v = s.vals[i]
      if (v == null) {
        started = false
        continue
      }
      d += `${started ? "L" : "M"}${x(s.dist[i]).toFixed(1)},${y(v).toFixed(1)} `
      started = true
    }
    return d.trim()
  }

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const vx = ((e.clientX - rect.left) / rect.width) * W
    onCursor(vx < PAD.l || vx > W - PAD.r ? null : (vx - PAD.l) / (W - PAD.l - PAD.r))
  }

  const cx = cursor == null ? null : PAD.l + cursor * (W - PAD.l - PAD.r)

  return (
    <div ref={chartRef}>
      <p className="mb-1 text-[0.8125rem] font-semibold text-text-secondary">{label}</p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        className="timing w-full cursor-crosshair touch-pan-y select-none"
        style={{ height: "auto" }}
        onPointerMove={handleMove}
        onPointerLeave={() => onCursor(null)}
      >
        {(ticks ?? [lo, (lo + hi) / 2, hi]).map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} className="stroke-border-subtle" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize={12} className="fill-text-muted">
              {fy(v)}
            </text>
          </g>
        ))}
        {baseline != null && (
          <line x1={PAD.l} y1={y(baseline)} x2={W - PAD.r} y2={y(baseline)} className="stroke-text-muted" strokeWidth={1} strokeDasharray="5 3" />
        )}
        {series.map((s, i) => (
          <path key={i} d={path(s)} fill="none" stroke={s.color} strokeWidth={1.9} strokeDasharray={s.dash || undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {cx != null && <line x1={cx} y1={0} x2={cx} y2={height} className="stroke-text-primary" strokeWidth={1} opacity={0.5} />}
      </svg>
    </div>
  )
}

function Side({ code, ch, color, mirror }: { code: string; ch: DriverChannels; color: string; mirror?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4 ${
        mirror ? "items-end text-right sm:flex-row-reverse" : "items-start"
      }`}
    >
      <DriverPortrait code={code} slug={ch.team_slug} crop="bust" mirror={mirror} className="h-24 w-20 shrink-0 sm:h-36 sm:w-28" />
      <div className="min-w-0 sm:pb-2">
        <p className="timing text-[2rem] leading-none" style={{ color }}>
          {code}
        </p>
        <p className="mt-1 truncate text-[0.875rem] text-text-secondary">{DRIVER_NAMES[code]?.last ?? code}</p>
        <p className="timing mt-3 text-[1.25rem] leading-none">{fmtLap(ch.lap_time)}</p>
        <p className="mt-1 text-[0.75rem] text-text-muted">{ch.compound ? `${ch.compound.toLowerCase()} tyre` : "—"}</p>
      </div>
    </div>
  )
}

export default function CompareClient({ events, backendDown }: { events: F1Event[]; backendDown: boolean }) {
  const pastEvents = useMemo(() => {
    const now = new Date()
    return events.filter((e) => (parseUTC(e.session5_date) ?? new Date(e.event_date + "T23:59:59Z")) <= now)
  }, [events])

  const [roundNum, setRoundNum] = useState<number>(pastEvents.at(-1)?.round_number ?? 0)
  const [d1, setD1] = useState("VER")
  const [d2, setD2] = useState("NOR")
  const [picking, setPicking] = useState<1 | 2 | null>(null)
  const [cursor, setCursor] = useState<number | null>(null)

  // Each response is stored with the request it answers, so a stale one never
  // shows for a new pairing and "loading" is simply "no answer for this key yet".
  const pairKey = `${roundNum}/${d1}/${d2}`
  const [pair, setPair] = useState<{ key: string; data: CompareData | false } | null>(null)
  const [track, setTrack] = useState<{ round: number; map: MapData | null } | null>(null)

  useEffect(() => {
    if (!roundNum) return
    fetch(`${API_BASE}/api/telemetry/2026/${roundNum}/compare/${d1}/${d2}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d: CompareData | null) => setPair({ key: pairKey, data: d && !d._error ? d : false }))
  }, [pairKey, roundNum, d1, d2])

  useEffect(() => {
    if (!roundNum) return
    fetch(`${API_BASE}/api/telemetry/2026/${roundNum}/map`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((m) => setTrack({ round: roundNum, map: m && !m._error && m.x?.length > 1 ? m : null }))
  }, [roundNum])

  const data = pair?.key === pairKey ? pair.data : null // null while loading
  const map = track?.round === roundNum ? track.map : null

  if (backendDown || pastEvents.length === 0) {
    return (
      <>
        <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">Head to head</h1>
        <p className="lede mt-2">
          {backendDown ? "The backend isn't responding. Start it on port 8080 and reload." : "No 2026 race has been run yet."}
        </p>
      </>
    )
  }

  const c1 = TEAM_COLORS[d1] ?? "#888888"
  let c2 = TEAM_COLORS[d2] ?? "#BBBBBB"
  const teammates = c1 === c2
  if (teammates) c2 = "#CFCFCF" // keep teammates apart
  const dash2 = teammates ? "7 5" : undefined

  const dr1 = data ? data.drivers[d1] : undefined
  const dr2 = data ? data.drivers[d2] : undefined
  const dMax = dr1 && dr2 ? Math.max(...dr1.distance, ...dr2.distance) : 1
  const lapGap = dr1?.lap_time != null && dr2?.lap_time != null ? dr2.lap_time - dr1.lap_time : null
  const segments = data && dr1 && dr2 ? dominance(data.delta, dMax, c1, c2) : []
  const d1Sectors = segments.filter((s) => s.color === c1).length
  // 2026 cars have active aero instead of DRS, so the channel is flat unless a lap used it
  const usedDrs = !!(dr1?.drs.some(Boolean) || dr2?.drs.some(Boolean))

  const ch = (sel: (d: DriverChannels) => (number | null)[]): Series[] =>
    dr1 && dr2
      ? [
          { dist: dr1.distance, vals: sel(dr1), color: c1 },
          { dist: dr2.distance, vals: sel(dr2), color: c2, dash: dash2 },
        ]
      : []

  // Values for both drivers at the cursor
  const readout =
    cursor != null && dr1 && dr2
      ? [d1, d2].map((code, i) => {
          const c = i === 0 ? dr1 : dr2
          const k = closestIdx(c.distance, cursor * dMax)
          return { code, color: i === 0 ? c1 : c2, speed: c.speed[k], gear: c.gear[k], throttle: c.throttle[k], brake: c.brake[k] }
        })
      : null

  const chartProps = { dMax, cursor, onCursor: setCursor }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">Head to head</h1>
          <p className="lede mt-2">Two drivers&apos; fastest laps, compared metre by metre.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="label">Race</span>
            <select
              value={roundNum}
              onChange={(e) => setRoundNum(Number(e.target.value))}
              className="field mt-1.5 min-h-11 w-64 cursor-pointer text-[0.9375rem]"
            >
              {pastEvents.map((e) => (
                <option key={e.round_number} value={e.round_number}>
                  R{e.round_number} {e.event_name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setPicking(1)} className="btn btn-ghost min-h-11">
            <span className="h-4 w-0.75" style={{ background: c1 }} aria-hidden="true" />
            <span className="timing">{d1}</span>
            <span className="sr-only">Change driver one</span>
          </button>
          <span className="pb-3 text-[0.875rem] text-text-muted">vs</span>
          <button onClick={() => setPicking(2)} className="btn btn-ghost min-h-11">
            <span className="h-4 w-0.75" style={{ background: c2 }} aria-hidden="true" />
            <span className="timing">{d2}</span>
            <span className="sr-only">Change driver two</span>
          </button>
        </div>
      </div>

      {data === null ? (
        <div className="mt-10 animate-pulse space-y-2" aria-busy="true">
          <div className="h-40 bg-surface-1" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-24 bg-surface-1" />
          ))}
        </div>
      ) : !data || !dr1 || !dr2 ? (
        <p className="mt-10 border-t border-border-subtle pt-8 text-text-secondary">
          One of these drivers has no fastest-lap telemetry for this race. Try another pairing or round.
        </p>
      ) : (
        <>
          {/* The match-up */}
          <div className="mt-10 grid grid-cols-2 items-end gap-x-4 gap-y-5 border-y border-border-subtle py-6 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <Side code={d1} ch={dr1} color={c1} />
            <div className="order-last col-span-2 border-t border-border-subtle pt-4 text-center sm:order-none sm:col-span-1 sm:border-t-0 sm:pt-0 sm:pb-2">
              <p className="label">Lap gap</p>
              <p className="timing mt-1 text-[clamp(1.5rem,4vw,2.5rem)] leading-none">
                {lapGap == null ? "—" : `${Math.abs(lapGap).toFixed(3)}S`}
              </p>
              {lapGap != null && lapGap !== 0 && (
                <p className="mt-1.5 text-[0.8125rem] text-text-secondary">{lapGap > 0 ? d1 : d2} quicker</p>
              )}
            </div>
            <Side code={d2} ch={dr2} color={c2} mirror />
          </div>

          <div className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-6">
              <Chart label="Speed, km/h" series={ch((d) => d.speed)} height={170} {...chartProps} />
              {data.delta && (
                <Chart
                  label={`Gap to ${d1} in seconds (above zero: ${d2} behind)`}
                  series={[{ dist: data.delta.distance, vals: data.delta.delta, color: c2, dash: dash2 }]}
                  height={110}
                  baseline={0}
                  fmtY={(v) => v.toFixed(2)}
                  {...chartProps}
                />
              )}
              <Chart label="Throttle, %" series={ch((d) => d.throttle)} height={86} yMin={0} yMax={100} {...chartProps} />
              <Chart label="Brake" series={ch((d) => d.brake)} height={56} yMin={0} yMax={1} ticks={[0, 1]} fmtY={(v) => (v ? "ON" : "OFF")} {...chartProps} />
              <Chart label="Gear" series={ch((d) => d.gear)} height={86} yMin={0.5} yMax={8.5} {...chartProps} />
              {usedDrs && (
                <Chart label="DRS" series={ch((d) => d.drs)} height={56} yMin={0} yMax={1} ticks={[0, 1]} fmtY={(v) => (v ? "OPEN" : "SHUT")} {...chartProps} />
              )}
            </div>

            <aside className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:self-start">
              <h2 className="heading text-[1.25rem]">Who was faster where</h2>
              <p className="mt-1 text-[0.8125rem] text-text-muted">
                The lap split into {MINI_SECTORS} mini-sectors, each coloured by the driver who gained time there.
              </p>
              {map ? (
                <TrackMap
                  x={map.x}
                  y={map.y}
                  cursor={cursor}
                  onCursor={setCursor}
                  segments={segments}
                  label={`Track dominance, ${d1} against ${d2}`}
                  className="mt-4"
                />
              ) : (
                <div className="mt-4 aspect-square bg-surface-1" />
              )}
              <div className="mt-4 flex items-center justify-between text-[0.875rem]">
                <span className="flex items-center gap-2">
                  <span className="h-1 w-5" style={{ background: c1 }} />
                  <span className="timing">{d1}</span> <span className="timing text-text-secondary">{d1Sectors}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="timing text-text-secondary">{segments.length - d1Sectors}</span> <span className="timing">{d2}</span>
                  <span className="h-1 w-5" style={{ background: c2 }} />
                </span>
              </div>

              <dl className="mt-6 min-h-24 border-t border-border-subtle pt-4">
                {readout ? (
                  <>
                    <dt className="label">At {Math.round(cursor! * dMax)} m</dt>
                    {readout.map((r) => (
                      <dd key={r.code} className="timing mt-2 grid grid-cols-[3rem_1fr_1fr_1fr] gap-2 text-[0.8125rem]">
                        <span style={{ color: r.color }}>{r.code}</span>
                        <span>{Math.round(r.speed)} KM/H</span>
                        <span className="text-text-secondary">GEAR {r.gear ?? "—"}</span>
                        <span className={r.brake >= 0.5 ? "text-f1-red" : "text-text-secondary"}>
                          {r.brake >= 0.5 ? "BRAKE" : `${Math.round(r.throttle)}%`}
                        </span>
                      </dd>
                    ))}
                  </>
                ) : (
                  <dt className="text-[0.8125rem] text-text-muted">Move along any chart or the map to read both cars at that point.</dt>
                )}
              </dl>
            </aside>
          </div>
        </>
      )}

      {picking && (
        <DriverPicker
          open
          title={picking === 1 ? "First driver" : "Second driver"}
          value={picking === 1 ? d1 : d2}
          taken={new Map([[picking === 1 ? d2 : d1, picking === 1 ? "D2" : "D1"]])}
          onPick={(code) => {
            if (picking === 1) setD1(code)
            else setD2(code)
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  )
}
