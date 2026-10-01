"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TEAM_COLORS } from "@/lib/design"
import { useSession } from "@/lib/auth"
import { flagUrl, splitRaceName, type F1Event } from "@/lib/f1"

interface BreakdownEntry {
  pick: string | null
  actual: string | null
  pts: number
}

interface Prediction {
  id: number
  event_id: number
  first_place: string
  second_place: string
  third_place: string
  fourth_place: string | null
  fifth_place: string | null
  fastest_lap: string | null
  dnf_driver: string | null
  pole_position: string | null
  safety_car: boolean | null
  points_earned: number
  score_breakdown: string | null // JSON string keyed by slot
}

interface Race {
  prediction: Prediction
  event: F1Event
  status: "scored" | "pending" | "upcoming"
}

const MAX_PER_RACE = 64

const SLOTS: { key: string; field: keyof Prediction; label: string; max: number }[] = [
  { key: "pole", field: "pole_position", label: "Pole", max: 5 },
  { key: "p1", field: "first_place", label: "P1", max: 10 },
  { key: "p2", field: "second_place", label: "P2", max: 10 },
  { key: "p3", field: "third_place", label: "P3", max: 10 },
  { key: "p4", field: "fourth_place", label: "P4", max: 8 },
  { key: "p5", field: "fifth_place", label: "P5", max: 6 },
  { key: "fl", field: "fastest_lap", label: "FL", max: 5 },
  { key: "dnf", field: "dnf_driver", label: "DNF", max: 5 },
  { key: "sc", field: "safety_car", label: "SC", max: 5 },
]

function Code({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-text-dim">—</span>
  // DNF results can list several drivers ("VER, NOR"); safety car is Yes/No.
  return (
    <span className="timing">
      {value.split(", ").map((c, i) => (
        <span key={c}>
          {i > 0 && <span className="text-text-muted">, </span>}
          <span style={{ color: TEAM_COLORS[c] }}>{c}</span>
        </span>
      ))}
    </span>
  )
}

function parseBreakdown(raw: string | null): Record<string, BreakdownEntry | null> | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function SeasonBars({ events, byEvent }: { events: F1Event[]; byEvent: Map<number, Race> }) {
  return (
    <figure className="mt-10">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="heading text-[1.25rem]">Points by round</span>
        <span className="label">out of {MAX_PER_RACE}</span>
      </figcaption>
      <ol className="mt-5 grid h-40 auto-cols-fr grid-flow-col items-end gap-1 border-b border-border-default sm:gap-1.5">
        {events.map((e) => {
          const r = byEvent.get(e.id)
          const pts = r?.status === "scored" ? r.prediction.points_earned : 0
          const label = `${e.event_name}: ${
            !r ? "no pick" : r.status === "scored" ? `${pts} points` : r.status === "upcoming" ? "picked, not raced yet" : "awaiting results"
          }`
          return (
            <li key={e.id} className="group relative flex h-full flex-col justify-end" title={label}>
              <span className="sr-only">{label}</span>
              {r?.status === "scored" ? (
                <span
                  className="block w-full bg-f1-red transition-colors group-hover:bg-text-primary"
                  style={{ height: `${Math.max(2, (pts / MAX_PER_RACE) * 100)}%` }}
                />
              ) : r ? (
                <span className="block h-1.5 w-full border border-text-muted" />
              ) : (
                <span className="block h-px w-full bg-border-muted" />
              )}
            </li>
          )
        })}
      </ol>
      <div className="mt-2 grid auto-cols-fr grid-flow-col gap-1 sm:gap-1.5" aria-hidden="true">
        {events.map((e) => (
          <span
            key={e.id}
            // every other round on phones, where 20-odd numbers would run together
            className={`timing text-center text-[0.625rem] text-text-muted ${e.round_number % 2 ? "" : "max-sm:invisible"}`}
          >
            {e.round_number}
          </span>
        ))}
      </div>
    </figure>
  )
}

function RaceRow({ race, open }: { race: Race; open: boolean }) {
  const { prediction: p, event: e, status } = race
  const breakdown = status === "scored" ? parseBreakdown(p.score_breakdown) : null
  const { place, suffix } = splitRaceName(e.event_name)
  const date = new Date(e.event_date + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })

  return (
    <li className="border-b border-border-subtle">
      <details open={open} className="group">
        <summary className="grid cursor-pointer list-none grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-4 py-5 sm:grid-cols-[3.5rem_minmax(0,1fr)_8rem_6rem] [&::-webkit-details-marker]:hidden">
          <span className="timing text-[1rem] text-text-muted">R{String(e.round_number).padStart(2, "0")}</span>
          <span className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(e.country, 32)} alt="" className="h-3.5 w-auto shrink-0" />
            <span className="heading truncate text-[1.125rem] sm:text-[1.25rem]">
              {place}
              {suffix && <span className="max-sm:hidden"> {suffix}</span>}
            </span>
          </span>
          <span className="hidden text-[0.875rem] text-text-muted sm:block">
            {date}
            <span className="ml-2">
              {status === "scored" ? "Scored" : status === "upcoming" ? "Upcoming" : "Awaiting results"}
            </span>
          </span>
          <span className="text-right">
            {status === "scored" ? (
              <span className="timing text-[1.75rem] leading-none">{p.points_earned}</span>
            ) : (
              <span className="text-[0.875rem] text-text-muted">{status === "upcoming" ? "Locked" : "Pending"}</span>
            )}
          </span>
        </summary>

        <div className="pb-6 sm:pl-[4.5rem]">
          <table className="w-full max-w-2xl border-collapse text-[0.9375rem]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th scope="col" className="label h-9 w-16 text-left font-medium">Pick</th>
                <th scope="col" className="label h-9 pr-3 text-left font-medium">Yours</th>
                {breakdown && <th scope="col" className="label h-9 text-left font-medium">Result</th>}
                {breakdown && <th scope="col" className="label h-9 w-16 text-right font-medium">Points</th>}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((s) => {
                const entry = breakdown?.[s.key]
                const raw = p[s.field]
                const yours = s.key === "sc" ? (raw === null ? null : raw ? "Yes" : "No") : (raw as string | null)
                if (!breakdown && yours == null) return null
                const hit = (entry?.pts ?? 0) > 0
                return (
                  <tr key={s.key} className="h-10 border-b border-border-subtle last:border-b-0">
                    <th scope="row" className="timing text-left font-normal text-text-secondary">
                      {s.label}
                    </th>
                    <td className="pr-3">{s.key === "sc" ? <span>{yours ?? "—"}</span> : <Code value={yours} />}</td>
                    {breakdown && (
                      <td>{s.key === "sc" ? <span className="text-text-secondary">{entry?.actual ?? "—"}</span> : <Code value={entry?.actual} />}</td>
                    )}
                    {breakdown && (
                      <td className={`timing text-right ${hit ? "text-f1-green" : "text-text-dim"}`}>
                        {hit ? `+${entry?.pts}` : "0"}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </details>
    </li>
  )
}

export default function PredictionsClient() {
  const { token } = useSession()
  const [races, setRaces] = useState<Race[] | null>(null)
  const [events, setEvents] = useState<F1Event[]>([])
  const authed = token === undefined ? null : !!token

  useEffect(() => {
    if (!token) return

    const today = new Date().toISOString().split("T")[0]
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/predictions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/schedule`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([preds, evs]: [Prediction[], F1Event[]]) => {
      const eventMap = new Map(evs.map((e) => [e.id, e]))
      const joined = preds
        .map((p): Race | null => {
          const event = eventMap.get(p.event_id)
          if (!event) return null
          // Date-based, per Rule 3: is_completed only means the admin has scored it.
          const status: Race["status"] =
            event.event_date >= today ? "upcoming" : event.is_completed ? "scored" : "pending"
          return { prediction: p, event, status }
        })
        .filter((r): r is Race => r !== null)
        .sort((a, b) => b.event.round_number - a.event.round_number)
      setEvents(evs)
      setRaces(joined)
    })
  }, [token])

  const scored = races?.filter((r) => r.status === "scored") ?? []
  const total = races?.reduce((s, r) => s + r.prediction.points_earned, 0) ?? 0
  const accuracy = scored.length ? Math.round((total / (scored.length * MAX_PER_RACE)) * 100) : null
  const best = scored.reduce<Race | null>((b, r) => (!b || r.prediction.points_earned > b.prediction.points_earned ? r : b), null)

  return (
    <>
      <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">My picks</h1>
      <p className="lede mt-2">Every call you&apos;ve made this season, and what it scored.</p>

      {authed === false ? (
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-border-subtle pt-8">
          <p className="max-w-[46ch] text-text-secondary">Sign in to see your picks and how they scored.</p>
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      ) : races === null ? (
        <div className="mt-8 animate-pulse space-y-2" aria-busy="true">
          <div className="h-24 bg-surface-1" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-16 bg-surface-1" />
          ))}
        </div>
      ) : races.length === 0 ? (
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-border-subtle pt-8">
          <p className="max-w-[46ch] text-text-secondary">No picks yet. Make your first call before the next race.</p>
          <Link href="/predict" className="btn btn-primary">
            Make your picks
          </Link>
        </div>
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-border-subtle py-8 sm:grid-cols-4">
            <div>
              <dt className="label">Points</dt>
              <dd className="timing mt-2 text-[clamp(2.5rem,5vw,4rem)] leading-none text-f1-red">{total}</dd>
            </div>
            <div className="sm:border-l sm:border-border-subtle sm:pl-6">
              <dt className="label">Races predicted</dt>
              <dd className="timing mt-2 text-[clamp(2.5rem,5vw,4rem)] leading-none">{races.length}</dd>
            </div>
            <div className="sm:border-l sm:border-border-subtle sm:pl-6">
              <dt className="label">Accuracy</dt>
              <dd className="timing mt-2 text-[clamp(2.5rem,5vw,4rem)] leading-none">
                {accuracy != null ? `${accuracy}%` : "—"}
              </dd>
            </div>
            <div className="sm:border-l sm:border-border-subtle sm:pl-6">
              <dt className="label">Best round</dt>
              <dd className="mt-2">
                <span className="timing text-[clamp(2.5rem,5vw,4rem)] leading-none">{best?.prediction.points_earned ?? "—"}</span>
                {best && (
                  <span className="mt-1 block truncate text-[0.8125rem] text-text-muted">{best.event.event_name}</span>
                )}
              </dd>
            </div>
          </dl>

          {events.length > 0 && <SeasonBars events={events} byEvent={new Map(races.map((r) => [r.event.id, r]))} />}

          <ol className="mt-10 border-t border-border-subtle">
            {races.map((r, i) => (
              <RaceRow key={r.prediction.id} race={r} open={i === 0} />
            ))}
          </ol>
        </>
      )}
    </>
  )
}
