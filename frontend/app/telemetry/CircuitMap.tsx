"use client"

import { useState } from "react"
import TrackMap from "@/components/TrackMap"
import { getCircuitImageCandidates, getCircuitFacts } from "@/lib/circuits"

export interface MapData {
  session: string
  x: number[]
  y: number[]
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="timing mt-1.5 text-[1.5rem] leading-none">{value}</dd>
      {sub && <p className="mt-1.5 text-[0.75rem] text-text-muted">{sub}</p>}
    </div>
  )
}

export default function CircuitMap({
  data,
  country,
  eventName,
  fastestLap,
}: {
  data: MapData
  country?: string
  eventName?: string
  fastestLap?: { driver: string; time: string } | null
}) {
  const candidates = country && eventName ? getCircuitImageCandidates(country, eventName) : []
  const facts = country && eventName ? getCircuitFacts(country, eventName) : null

  // Walk the candidate images; once they have all failed, draw the GPS outline instead.
  const [imgIdx, setImgIdx] = useState(0)

  const showImage = imgIdx < candidates.length
  const raceDistance = facts ? (facts.length_km * facts.laps).toFixed(1) : null

  return (
    <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center">
      <div className="flex items-center justify-center">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidates[imgIdx]}
            alt={`${facts?.name ?? eventName} circuit map`}
            className="h-auto w-full object-contain"
            onError={() => setImgIdx((i) => i + 1)}
          />
        ) : (
          <TrackMap x={data.x} y={data.y} cursor={null} label={`${eventName} circuit, from fastest-lap GPS`} className="max-w-xl" />
        )}
      </div>

      <div>
        <p className="heading text-[1.5rem]">{facts?.name ?? data.session}</p>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border-subtle pt-6">
          <Stat label="Circuit length" value={facts ? `${facts.length_km} km` : "—"} />
          <Stat label="Laps" value={facts ? `${facts.laps}` : "—"} />
          <Stat label="Race distance" value={raceDistance ? `${raceDistance} km` : "—"} />
          <Stat label="First Grand Prix" value={facts ? `${facts.first_gp}` : "—"} />
          <Stat
            label="Fastest lap"
            value={fastestLap?.time ?? "—"}
            sub={fastestLap ? `${fastestLap.driver}, this race` : undefined}
          />
        </dl>
        {!showImage && <p className="mt-6 text-[0.8125rem] text-text-muted">Outline drawn from fastest-lap GPS.</p>}
      </div>
    </div>
  )
}
