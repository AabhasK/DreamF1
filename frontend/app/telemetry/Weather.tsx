"use client"

export interface WeatherData {
  session: string
  time: number[]
  track_temp: (number | null)[] | null
  air_temp: (number | null)[] | null
  humidity: (number | null)[] | null
  wind_speed: (number | null)[] | null
  summary: {
    track_temp_min: number | null
    track_temp_max: number | null
    track_temp_avg: number | null
    air_temp_min: number | null
    air_temp_max: number | null
    air_temp_avg: number | null
    humidity_avg: number | null
    wind_avg: number | null
    wind_max: number | null
    rained: boolean
  }
}

// Chart series colours
const TRACK = "#F47600"
const AIR = "#4781D7"
const HUMIDITY = "#00D7B6"
const WIND = "#C084FC"

const W = 900
const H = 240
const PAD = { l: 38, r: 14, t: 14, b: 26 }

function scaleX(t: number, xMin: number, xMax: number) {
  return PAD.l + ((t - xMin) / (xMax - xMin || 1)) * (W - PAD.l - PAD.r)
}
function scaleY(v: number, yMin: number, yMax: number) {
  return H - PAD.b - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b)
}

function linePath(
  time: number[],
  vals: (number | null)[] | null,
  yMin: number,
  yMax: number,
  xMin: number,
  xMax: number,
): string {
  if (!vals) return ""
  let d = ""
  let started = false
  for (let i = 0; i < time.length; i++) {
    const v = vals[i]
    if (v == null) {
      started = false
      continue
    }
    d += `${started ? "L" : "M"}${scaleX(time[i], xMin, xMax).toFixed(1)},${scaleY(v, yMin, yMax).toFixed(1)} `
    started = true
  }
  return d.trim()
}

/** Closed area path (line + baseline) for a soft gradient fill. */
function areaPath(
  time: number[],
  vals: (number | null)[] | null,
  yMin: number,
  yMax: number,
  xMin: number,
  xMax: number,
): string {
  const line = linePath(time, vals, yMin, yMax, xMin, xMax)
  if (!line) return ""
  const first = line.match(/M([\d.]+),/)
  const lastX = [...line.matchAll(/[ML]([\d.]+),/g)].pop()
  if (!first || !lastX) return ""
  const base = (H - PAD.b).toFixed(1)
  return `${line} L${lastX[1]},${base} L${first[1]},${base} Z`
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="sm:border-l sm:border-border-subtle sm:pl-6 sm:first:border-l-0 sm:first:pl-0">
      <dt className="label">{label}</dt>
      <dd className="timing mt-1.5 text-[1.5rem] leading-none">{value}</dd>
      {sub && <p className="timing mt-1.5 text-[0.6875rem] text-text-muted">{sub}</p>}
    </div>
  )
}

/** Compact single-series sparkline card (humidity, wind). */
function Sparkline({
  label,
  unit,
  vals,
  time,
  color,
  avg,
  peak,
}: {
  label: string
  unit: string
  vals: (number | null)[] | null
  time: number[]
  color: string
  avg: number | null
  peak?: number | null
}) {
  const nums = (vals ?? []).filter((v): v is number => v != null)
  const sw = 320
  const sh = 64
  const sp = { l: 2, r: 2, t: 6, b: 6 }
  const yMin = nums.length ? Math.min(...nums) : 0
  const yMax = nums.length ? Math.max(...nums) : 1
  const xMin = time[0] ?? 0
  const xMax = time[time.length - 1] ?? 1
  const sx = (t: number) => sp.l + ((t - xMin) / (xMax - xMin || 1)) * (sw - sp.l - sp.r)
  const sy = (v: number) => sh - sp.b - ((v - yMin) / (yMax - yMin || 1)) * (sh - sp.t - sp.b)
  let d = ""
  let started = false
  if (vals) {
    for (let i = 0; i < time.length; i++) {
      const v = vals[i]
      if (v == null) {
        started = false
        continue
      }
      d += `${started ? "L" : "M"}${sx(time[i]).toFixed(1)},${sy(v).toFixed(1)} `
      started = true
    }
  }

  return (
    <div className="border-t border-border-subtle pt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[0.875rem] font-semibold">{label}</span>
        <span className="timing text-[0.875rem]" style={{ color }}>
          {avg != null ? `${avg}${unit}` : "—"}
          {peak != null && (
            <span className="ml-2 text-[0.6875rem] text-text-muted">
              MAX {peak}
              {unit}
            </span>
          )}
        </span>
      </div>
      <svg viewBox={`0 0 ${sw} ${sh}`} className="w-full" style={{ height: "auto" }}>
        <line x1={sp.l} y1={sh - sp.b} x2={sw - sp.r} y2={sh - sp.b} className="stroke-border-subtle" strokeWidth={1} />
        <path d={d.trim()} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function Weather({ data }: { data: WeatherData }) {
  const s = data.summary
  const temps = [...(data.track_temp ?? []), ...(data.air_temp ?? [])].filter(
    (v): v is number => v != null,
  )
  const yMin = temps.length ? Math.floor(Math.min(...temps) - 1) : 0
  const yMax = temps.length ? Math.ceil(Math.max(...temps) + 1) : 50
  const xMin = data.time[0] ?? 0
  const xMax = data.time[data.time.length - 1] ?? 1

  const yTicks = [yMin, Math.round((yMin + yMax) / 2), yMax]

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-5">
        <div>
          <dt className="label">Conditions</dt>
          <dd className={`heading mt-1.5 text-[1.5rem] leading-none ${s.rained ? "text-f1-yellow" : ""}`}>
            {s.rained ? "Wet" : "Dry"}
          </dd>
        </div>
        <Stat
          label="Track"
          value={s.track_temp_avg != null ? `${s.track_temp_avg}°` : "—"}
          sub={s.track_temp_min != null ? `${s.track_temp_min}° TO ${s.track_temp_max}°` : undefined}
        />
        <Stat
          label="Air"
          value={s.air_temp_avg != null ? `${s.air_temp_avg}°` : "—"}
          sub={s.air_temp_min != null ? `${s.air_temp_min}° TO ${s.air_temp_max}°` : undefined}
        />
        <Stat label="Humidity" value={s.humidity_avg != null ? `${s.humidity_avg}%` : "—"} />
        <Stat
          label="Wind"
          value={s.wind_avg != null ? `${s.wind_avg} m/s` : "—"}
          sub={s.wind_max != null ? `GUSTS ${s.wind_max} M/S` : undefined}
        />
      </dl>

      <figure>
        <figcaption className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[0.875rem] font-semibold">Track and air temperature through the race</span>
          <span className="flex items-center gap-4 text-[0.8125rem] text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ background: TRACK }} /> Track
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ background: AIR }} /> Air
            </span>
          </span>
        </figcaption>
        <div className="mt-3 overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="timing w-full min-w-[36rem]" style={{ height: "auto" }}>
            <defs>
              <linearGradient id="trackFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TRACK} stopOpacity="0.22" />
                <stop offset="100%" stopColor={TRACK} stopOpacity="0" />
              </linearGradient>
            </defs>
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={PAD.l} y1={scaleY(v, yMin, yMax)} x2={W - PAD.r} y2={scaleY(v, yMin, yMax)} className="stroke-border-subtle" strokeWidth={1} />
                <text x={PAD.l - 6} y={scaleY(v, yMin, yMax) + 3} textAnchor="end" className="fill-text-muted" fontSize={10}>
                  {v}°
                </text>
              </g>
            ))}
            <text x={PAD.l} y={H - 7} className="fill-text-muted" fontSize={10}>0 MIN</text>
            <text x={W - PAD.r} y={H - 7} textAnchor="end" className="fill-text-muted" fontSize={10}>
              {Math.round(xMax)} MIN
            </text>
            <path d={areaPath(data.time, data.track_temp, yMin, yMax, xMin, xMax)} fill="url(#trackFill)" />
            <path d={linePath(data.time, data.track_temp, yMin, yMax, xMin, xMax)} fill="none" stroke={TRACK} strokeWidth={1.9} strokeLinejoin="round" />
            <path d={linePath(data.time, data.air_temp, yMin, yMax, xMin, xMax)} fill="none" stroke={AIR} strokeWidth={1.9} strokeLinejoin="round" />
          </svg>
        </div>
      </figure>

      <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
        <Sparkline label="Humidity" unit="%" vals={data.humidity} time={data.time} color={HUMIDITY} avg={s.humidity_avg} />
        <Sparkline label="Wind speed" unit=" m/s" vals={data.wind_speed} time={data.time} color={WIND} avg={s.wind_avg} peak={s.wind_max} />
      </div>
    </div>
  )
}
