"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import CarImage from "@/components/CarImage"
import { useNow } from "@/lib/useNow"
import { TEAMS } from "@/lib/design"
import { fmtPoints } from "@/lib/format"
import { RELOCATED, getCircuitFacts, getCircuitImageCandidates } from "@/lib/circuits"
import type { ConstructorStanding } from "@/lib/standings"
import {
  eventSessions,
  flagUrl,
  fmtDay,
  fmtTime,
  splitRaceName,
  timeLeft,
  weekendRange,
  type F1Event,
  type Session,
} from "@/lib/f1"

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * The only part of the hero that ticks every second, so the rest renders once.
 * Rolls over to the following session at each start.
 */
function Countdown({ sessions, fallback }: { sessions: Session[]; fallback: number }) {
  const now = useNow(1000)
  const live = now === null ? undefined : sessions.find((s) => s.start.getTime() <= now && s.end.getTime() > now)
  const next = now === null ? undefined : sessions.find((s) => s.start.getTime() > now)
  const t = now === null ? null : timeLeft(next?.start.getTime() ?? fallback, now)

  const units: [string, number | null][] = [
    ["days", t?.days ?? null],
    ["hrs", t?.hours ?? null],
    ["min", t?.minutes ?? null],
    ["sec", t?.seconds ?? null],
  ]

  return (
    <div>
      <p className="flex min-h-5 items-center gap-2 text-[0.8125rem] text-text-secondary">
        {live && (
          <>
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inset-0 rounded-full bg-f1-red opacity-75 motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-f1-red" />
            </span>
            <span className="text-text-primary">{live.name} is running.</span>
          </>
        )}
        {next ? `${next.name} starts in` : now !== null && !live ? "Lights out in" : null}
      </p>
      <div
        role="timer"
        aria-label={t ? `${t.days} days ${t.hours} hours ${t.minutes} minutes` : "Countdown"}
        className="timing mt-1 flex items-start gap-[0.12em] text-[clamp(1.875rem,3.4vw,2.75rem)] leading-none"
      >
        {units.map(([label, value], i) => (
          <Fragment key={label}>
            {i > 0 && (
              <span className="text-text-dim" aria-hidden="true">
                :
              </span>
            )}
            <span className="flex flex-col items-center">
              <span key={value ?? "x"} className={value === null ? "text-text-dim" : "digit-in"}>
                {value === null ? "--" : pad(value)}
              </span>
              <span className="label mt-1.5 text-[0.625rem]">{label}</span>
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function SessionStrip({ sessions, now }: { sessions: Session[]; now: number | null }) {
  if (sessions.length === 0) return null
  const upcoming = now === null ? undefined : sessions.find((s) => s.end.getTime() > now)

  return (
    <div className="border-t border-border-subtle bg-surface-0/50">
      <ol className="shell grid grid-cols-5 gap-x-2 sm:gap-x-0" aria-label="Session times, in your timezone">
        {sessions.map((s) => {
          const done = now !== null && s.end.getTime() <= now
          const live = now !== null && s.start.getTime() <= now && !done
          const isNext = s === upcoming && !live
          return (
            <li
              key={s.name}
              className={`relative py-3 sm:border-l sm:border-border-subtle sm:pl-4 sm:first:border-l-0 sm:first:pl-0 ${
                done ? "opacity-45" : ""
              }`}
            >
              {(isNext || live) && <span className="absolute inset-x-0 top-0 h-0.5 bg-f1-red" aria-hidden="true" />}
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="timing text-[0.8125rem]">{s.abbrev}</span>
                {live && <span className="timing bg-f1-red px-1 text-[0.5625rem] text-white">LIVE</span>}
                {isNext && <span className="text-[0.75rem] font-semibold text-f1-red max-sm:sr-only">Next</span>}
              </span>
              <span className="mt-0.5 block text-[0.75rem] text-text-muted sm:text-[0.8125rem]">
                {now === null ? " " : fmtDay(s.start)}
                <span className="timing block text-[0.875rem] text-text-primary sm:ml-2 sm:inline sm:text-[0.9375rem]">
                  {now === null ? "--:--" : fmtTime(s.start)}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function NextRace({
  event,
  totalRounds,
  leader,
}: {
  event: F1Event
  totalRounds: number
  leader: ConstructorStanding | null
}) {
  const now = useNow(30_000)
  const [imageFailed, setImageFailed] = useState(false)
  const sessions = eventSessions(event)
  const fallback = new Date(event.event_date + "T12:00:00Z").getTime()
  const { place, suffix } = splitRaceName(event.event_name)
  const facts = getCircuitFacts(event.country, event.event_name)
  const circuitImage = getCircuitImageCandidates(event.country, event.event_name)[0]
  const lock = sessions[0] // picks lock when the first session starts
  const locked = now !== null && !!lock && lock.start.getTime() <= now
  const relocated = RELOCATED[event.event_name]
  const circuitName = facts?.name ?? event.event_name
  const leaderName = leader ? (TEAMS.find((t) => t.slug === leader.team_slug)?.name ?? leader.team) : null

  return (
    <section className="band">
      <div className="shell grid items-center gap-x-10 gap-y-6 py-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-text-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(relocated?.country ?? event.country)} alt="" className="h-3.5 w-auto" />
            <span>
              Round {event.round_number} of {totalRounds}
            </span>
            <span className="h-3 w-px bg-border-muted" aria-hidden="true" />
            <span>{weekendRange(event)}</span>
            <span className="h-3 w-px bg-border-muted" aria-hidden="true" />
            <span>
              {circuitName}
              {relocated && `, ${relocated.city}`}
            </span>
          </p>

          <h1 className="display mt-3 text-[clamp(2.25rem,5vw,4rem)]">
            {place}{" "}
            {suffix && <span className="whitespace-nowrap text-[0.5em] text-text-muted">{suffix}</span>}
          </h1>
          {relocated && (
            <p className="mt-2 text-[0.9375rem] text-text-secondary">
              Held in {relocated.country} this year, at Sepang.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4">
            <Countdown sessions={sessions} fallback={fallback} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4">
              {now === null ? null : locked ? (
                <>
                  <span className="btn btn-ghost btn-sm" aria-disabled="true">
                    Picks are locked
                  </span>
                  <Link href="/predict" className="link text-[0.875rem]">
                    See your picks
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/predict" className="btn btn-primary">
                    Make your picks
                  </Link>
                  {lock && (
                    <span className="text-[0.8125rem] text-text-muted">
                      Locks at {lock.abbrev}, {fmtDay(lock.start)} {fmtTime(lock.start)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {facts && (
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-border-subtle pt-3 text-[0.8125rem]">
              {[
                ["Length", `${facts.length_km.toFixed(3)} km`],
                ["Laps", `${facts.laps}`],
                ["Race distance", `${(facts.length_km * facts.laps).toFixed(1)} km`],
                ["First Grand Prix", `${facts.first_gp}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="timing text-[0.9375rem]">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* The circuit diagram, or the leading team's car where there isn't one */}
        {((circuitImage && !imageFailed) || leader) && (
          <figure className="corner flex min-w-0 items-center justify-center border border-border-subtle bg-surface-0/60 p-4 sm:p-5 lg:self-stretch">
            {circuitImage && !imageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={circuitImage}
                alt={`${circuitName} layout`}
                onError={() => setImageFailed(true)}
                className="max-h-56 w-full object-contain sm:max-h-64"
              />
            ) : leader ? (
              <div className="w-full">
                <CarImage slug={leader.team_slug} className="w-full drop-shadow-[0_10px_12px_rgb(0_0_0/0.55)]" />
                <figcaption className="mt-3 flex items-baseline justify-between gap-4 border-t border-border-subtle pt-2 text-[0.8125rem] text-text-muted">
                  <span>{leaderName} lead the constructors</span>
                  <span className="timing text-text-primary">{fmtPoints(leader.points)} PTS</span>
                </figcaption>
              </div>
            ) : null}
          </figure>
        )}
      </div>

      <SessionStrip sessions={sessions} now={now} />
    </section>
  )
}
