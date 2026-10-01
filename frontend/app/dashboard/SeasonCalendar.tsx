"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { getTrackImage } from "@/lib/trackData"
import { flagUrl, splitRaceName, weekendRange, type F1Event } from "@/lib/f1"

/**
 * Every round of the season on one swipeable strip, opened at the next race.
 * Run rounds link to their analysis; the next one links to the picks form.
 */
export default function SeasonCalendar({
  events,
  nextRaceId,
  completed,
}: {
  events: F1Event[]
  nextRaceId: number | null
  completed: number
}) {
  const stripRef = useRef<HTMLOListElement>(null)
  const nextRef = useRef<HTMLLIElement>(null)
  const pct = events.length ? (completed / events.length) * 100 : 0

  // Open the strip at the next race (without scrolling the page itself).
  useEffect(() => {
    const strip = stripRef.current
    const next = nextRef.current
    if (!strip || !next) return
    strip.scrollLeft = Math.max(0, next.offsetLeft - strip.offsetLeft)
  }, [])

  function nudge(dir: 1 | -1) {
    const strip = stripRef.current
    if (!strip) return
    strip.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: "smooth" })
  }

  return (
    <section className="py-6" aria-labelledby="calendar-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="calendar-title" className="heading text-[1.125rem]">
            2026 calendar
          </h2>
          <p className="mt-1 text-[0.875rem] text-text-muted">
            {completed} of {events.length} rounds run
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button onClick={() => nudge(-1)} className="btn btn-ghost btn-sm" aria-label="Earlier rounds">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
              <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          </button>
          <button onClick={() => nudge(1)} className="btn btn-ghost btn-sm" aria-label="Later rounds">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
              <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          </button>
        </div>
      </div>

      {/* Season progress, drawn as a kerb */}
      <div
        className="mt-4 h-1.5 bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={events.length}
        aria-valuenow={completed}
        aria-label="Season progress"
      >
        <div className="kerb h-full" style={{ width: `${pct}%` }} />
      </div>

      <ol ref={stripRef} className="scroll-x -mx-4 mt-2 px-4 sm:mx-0 sm:px-0">
        {events.map((e, i) => {
          const isNext = e.id === nextRaceId
          const done = !isNext && i < completed
          const track = getTrackImage(e.country, e.event_name)
          const { place } = splitRaceName(e.event_name)
          const href = done ? `/telemetry?round=${e.round_number}` : isNext ? "/predict" : null

          const body = (
            <>
              {isNext && <span className="absolute inset-x-0 top-0 h-0.5 bg-f1-red" aria-hidden="true" />}
              <div className="flex items-center justify-between gap-2">
                <span className="timing text-[0.8125rem] text-text-muted">R{String(e.round_number).padStart(2, "0")}</span>
                {isNext ? (
                  <span className="text-[0.75rem] font-semibold text-f1-red">Next</span>
                ) : done ? (
                  <span className="chequer size-3 opacity-70" aria-label="Completed" role="img" />
                ) : null}
              </div>
              <div className="my-2 flex h-12 items-center justify-center">
                {track && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track}
                    alt=""
                    loading="lazy"
                    className={`max-h-full w-auto object-contain transition-opacity ${
                      isNext ? "opacity-95" : done ? "opacity-35 group-hover:opacity-60" : "opacity-55 group-hover:opacity-80"
                    }`}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(e.country, 32)} alt="" loading="lazy" className="h-3 w-auto" />
                <span className={`truncate font-semibold ${done ? "text-text-secondary" : ""}`}>{place}</span>
              </div>
              <p className="timing mt-1 text-[0.75rem] text-text-muted">{weekendRange(e).toUpperCase()}</p>
            </>
          )

          return (
            <li
              key={e.id}
              ref={isNext ? nextRef : undefined}
              className="relative w-36 shrink-0 border-l border-border-subtle first:border-l-0 sm:w-40"
            >
              {href ? (
                <Link
                  href={href}
                  className="group relative block h-full px-3 py-3 transition-colors hover:bg-surface-1"
                  aria-label={`${e.event_name}${isNext ? ", next race" : ""}`}
                >
                  {body}
                </Link>
              ) : (
                <div className="group relative h-full px-3 py-3">{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
