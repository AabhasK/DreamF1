"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import DriverSelect from "./DriverSelect"
import FormGuide from "./FormGuide"
import DriverPicker from "@/components/DriverPicker"
import StartLights from "@/components/StartLights"
import { useNow } from "@/lib/useNow"
import { useSession } from "@/lib/auth"
import { eventSessions, flagUrl, fmtDay, fmtTime, shortCountdown, type F1Event } from "@/lib/f1"

type SlotKey =
  | "pole_position"
  | "first_place"
  | "second_place"
  | "third_place"
  | "fourth_place"
  | "fifth_place"
  | "fastest_lap"
  | "dnf_driver"

interface FormState {
  pole_position: string | null
  first_place: string | null
  second_place: string | null
  third_place: string | null
  fourth_place: string | null
  fifth_place: string | null
  fastest_lap: string | null
  dnf_driver: string | null
  safety_car: boolean | null
}

interface ExistingPrediction extends FormState {
  event_id: number
  points?: number | null
  points_earned?: number | null
  is_scored?: boolean
  score_breakdown?: string | null
}

interface SlotDef {
  key: SlotKey
  label: string
  title: string
  points: number
  optional?: boolean
}

const SLOTS: Record<SlotKey, SlotDef> = {
  first_place: { key: "first_place", label: "P1", title: "Race winner", points: 10 },
  second_place: { key: "second_place", label: "P2", title: "Second place", points: 10 },
  third_place: { key: "third_place", label: "P3", title: "Third place", points: 10 },
  fourth_place: { key: "fourth_place", label: "P4", title: "Fourth place", points: 8, optional: true },
  fifth_place: { key: "fifth_place", label: "P5", title: "Fifth place", points: 6, optional: true },
  pole_position: { key: "pole_position", label: "Pole", title: "Pole position", points: 5 },
  fastest_lap: { key: "fastest_lap", label: "FL", title: "Fastest lap", points: 5 },
  dnf_driver: { key: "dnf_driver", label: "DNF", title: "A driver who won't finish", points: 5, optional: true },
}

// Golden Rule 4: only these five gate submission. One start light each.
const REQUIRED: SlotKey[] = ["pole_position", "first_place", "second_place", "third_place", "fastest_lap"]
const LIGHT_LABELS = ["Pole", "P1", "P2", "P3", "FL"]

// Only finishing positions must be unique; pole, fastest lap and DNF can repeat a driver.
const POSITION_KEYS = new Set<SlotKey>(["first_place", "second_place", "third_place", "fourth_place", "fifth_place"])

const BLANK: FormState = {
  pole_position: null,
  first_place: null,
  second_place: null,
  third_place: null,
  fourth_place: null,
  fifth_place: null,
  fastest_lap: null,
  dnf_driver: null,
  safety_car: null,
}

// Score breakdown keys from the backend, per slot.
const BREAKDOWN_KEY: Record<SlotKey, string> = {
  pole_position: "pole",
  first_place: "p1",
  second_place: "p2",
  third_place: "p3",
  fourth_place: "p4",
  fifth_place: "p5",
  fastest_lap: "fl",
  dnf_driver: "dnf",
}

function RaceHeading({ event, lockAt }: { event: F1Event; lockAt: Date | null }) {
  const now = useNow(30_000)
  const open = lockAt && now !== null && lockAt.getTime() > now
  return (
    <header>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem] text-text-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flagUrl(event.country)} alt="" className="h-4 w-auto" />
        <span>
          Round {event.round_number}, {event.event_name}
        </span>
      </p>
      <h1 className="display mt-3 text-[clamp(2rem,4.5vw,3.25rem)]">Your picks</h1>
      {lockAt && now !== null && (
        <p className="lede mt-2">
          {open ? (
            <>
              Picks lock when practice starts, {fmtDay(lockAt)} at {fmtTime(lockAt)}.{" "}
              <span className="timing text-[0.95em] text-text-primary">
                {shortCountdown(lockAt.getTime(), now).toUpperCase()}
              </span>{" "}
              left.
            </>
          ) : (
            <>Practice has started, so picks for this round are closed.</>
          )}
        </p>
      )}
    </header>
  )
}

function Message({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mt-10 max-w-2xl border-t border-border-subtle pt-8">
      <h2 className="heading text-[1.5rem]">{title}</h2>
      <div className="mt-3 text-text-secondary">{children}</div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export default function PredictClient({
  nextRace,
  backendDown,
  locked,
}: {
  nextRace: F1Event | null
  backendDown: boolean
  locked: boolean
}) {
  const { token } = useSession()
  const [form, setForm] = useState<FormState>(BLANK)
  // The saved prediction for this race, tagged with the token it was fetched for.
  const [saved, setSaved] = useState<{ token: string; prediction: ExistingPrediction | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [picking, setPicking] = useState<SlotKey | null>(null)

  const lockAt = useMemo(() => (nextRace ? (eventSessions(nextRace)[0]?.start ?? null) : null), [nextRace])

  useEffect(() => {
    if (!token || !nextRace) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/predictions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data: ExistingPrediction[] | null) => {
        setSaved({ token, prediction: data?.find((p) => p.event_id === nextRace.id) ?? null })
      })
  }, [token, nextRace])

  const loadingExisting = !!token && !!nextRace && saved?.token !== token
  const existing = saved && saved.token === token ? saved.prediction : null

  // Which position slot each driver already fills, so the picker can grey them out.
  function takenFor(current: SlotKey): Map<string, string> {
    const taken = new Map<string, string>()
    if (!POSITION_KEYS.has(current)) return taken
    for (const k of POSITION_KEYS) {
      const code = form[k]
      if (k !== current && code) taken.set(code, SLOTS[k].label)
    }
    return taken
  }

  function setSlot(key: SlotKey, code: string | null) {
    setForm((f) => ({ ...f, [key]: code }))
    setPicking(null)
  }

  const lights = REQUIRED.map((k) => !!form[k])
  const filled = lights.filter(Boolean).length
  const canSubmit = filled === REQUIRED.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !token) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSubmitError(typeof err.detail === "string" ? err.detail : "Your picks weren't saved. Try again.")
        return
      }
      setSubmitted(true)
    } catch {
      setSubmitError("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Edge states ──────────────────────────────────────────────────

  if (backendDown) {
    return (
      <Message title="The backend isn't responding">
        Start the API server with <code className="timing text-[0.85em]">uvicorn main:app --reload</code> in{" "}
        <code className="timing text-[0.85em]">backend/</code>, then reload.
      </Message>
    )
  }

  if (!nextRace) {
    return (
      <>
        <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">Your picks</h1>
        <Message title="Season complete">Every 2026 round has been run. See you next season.</Message>
      </>
    )
  }

  if (token === undefined) return <RaceHeading event={nextRace} lockAt={lockAt} />

  if (!token) {
    return (
      <>
        <RaceHeading event={nextRace} lockAt={lockAt} />
        <Message
          title="Sign in to make your picks"
          action={
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
          }
        >
          Call pole, the podium and the fastest lap before practice starts. Points land after the race.
        </Message>
      </>
    )
  }

  // ── Picks already in (from the server, or just submitted) ────────

  const lockedIn = submitted ? form : existing
  if (lockedIn) {
    const earned = existing?.points_earned ?? existing?.points ?? null
    let breakdown: Record<string, { pts: number } | null> | null = null
    try {
      breakdown = existing?.score_breakdown ? JSON.parse(existing.score_breakdown) : null
    } catch {
      breakdown = null
    }
    const hit = (k: SlotKey) => (breakdown ? (breakdown[BREAKDOWN_KEY[k]]?.pts ?? 0) > 0 : undefined)

    return (
      <>
        <RaceHeading event={nextRace} lockAt={lockAt} />
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5 border-y border-border-subtle py-6">
          <StartLights lit={0} labels={LIGHT_LABELS} />
          <div>
            <p className="heading text-[1.5rem]">Lights out. Your picks are in.</p>
            <p className="mt-1 text-text-muted">
              {breakdown
                ? `Scored: ${earned ?? 0} of 64 points.`
                : "They're locked for this round. Points land after the race is scored."}
            </p>
          </div>
        </div>
        <PicksGrid
          form={lockedIn}
          hit={hit}
          scHit={breakdown && lockedIn.safety_car !== null ? (breakdown.sc?.pts ?? 0) > 0 : undefined}
        />
      </>
    )
  }

  if (locked) {
    return (
      <>
        <RaceHeading event={nextRace} lockAt={lockAt} />
        <Message
          title="Picks are closed for this round"
          action={
            <Link href="/telemetry" className="btn btn-ghost">
              Follow the data
            </Link>
          }
        >
          They lock when the first practice session starts, so nobody can pick with the timing screens in front of
          them. Come back before practice for the next round.
        </Message>
      </>
    )
  }

  // ── The form ─────────────────────────────────────────────────────

  return (
    <>
      <RaceHeading event={nextRace} lockAt={lockAt} />

      {loadingExisting ? (
        <div className="mt-8 grid animate-pulse gap-4 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-32 bg-surface-1" />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8">
          <PicksGrid form={form} onOpen={setPicking} onSafetyCar={(v) => setForm((f) => ({ ...f, safety_car: v }))} />

          {/* Start gantry + submit, pinned to the bottom of the screen while picking */}
          <div className="sticky bottom-0 z-20 -mx-4 mt-10 border-t border-border-default bg-surface-0/95 px-4 py-3 backdrop-blur-md sm:mx-0 sm:px-0 sm:py-4">
            {submitError && (
              <p role="alert" className="mb-2 text-[0.8125rem] text-f1-red sm:hidden">
                {submitError}
              </p>
            )}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <StartLights states={lights} size="sm" labels={LIGHT_LABELS} />
                <p className="sr-only text-[0.875rem] text-text-secondary sm:not-sr-only" aria-live="polite">
                  {canSubmit ? (
                    <span className="text-text-primary">All five lights on.</span>
                  ) : (
                    <>
                      <span className="timing text-text-primary">{filled}/5</span> required picks
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {submitError && (
                  <p role="alert" className="hidden max-w-[28ch] text-[0.875rem] text-f1-red sm:block">
                    {submitError}
                  </p>
                )}
                <button type="submit" disabled={!canSubmit || submitting} className="btn btn-primary">
                  {submitting ? "Locking in…" : "Lock in picks"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="mt-14">
        <FormGuide />
      </div>

      {picking && (
        <DriverPicker
          open
          title={SLOTS[picking].title}
          value={form[picking]}
          taken={takenFor(picking)}
          onPick={(code) => setSlot(picking, code)}
          onClear={SLOTS[picking].optional ? () => setSlot(picking, null) : undefined}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  )
}

/** The picks laid out as a staggered starting grid, plus the qualifying and race extras. */
function PicksGrid({
  form,
  onOpen,
  onSafetyCar,
  hit,
  scHit,
}: {
  form: FormState
  onOpen?: (key: SlotKey) => void
  onSafetyCar?: (v: boolean | null) => void
  hit?: (key: SlotKey) => boolean | undefined
  scHit?: boolean
}) {
  const slot = (key: SlotKey) => {
    const def = SLOTS[key]
    return (
      <DriverSelect
        key={key}
        label={def.label}
        points={def.points}
        value={form[key]}
        optional={def.optional}
        onOpen={onOpen ? () => onOpen(key) : undefined}
        result={hit?.(key)}
      />
    )
  }

  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section aria-labelledby="grid-race">
        <h2 id="grid-race" className="heading text-[1.25rem]">
          Race result
        </h2>
        <p className="mt-1 text-[0.9375rem] text-text-muted">P1 to P3 are required, P4 and P5 are bonus picks.</p>
        {/* Staggered like a real grid: the right-hand column sits half a box back */}
        <div className="mt-6 grid grid-cols-2 gap-x-4 sm:gap-x-8">
          <div className="space-y-8">
            {slot("first_place")}
            {slot("third_place")}
            {slot("fifth_place")}
          </div>
          <div className="space-y-8 pt-14">
            {slot("second_place")}
            {slot("fourth_place")}
          </div>
        </div>
      </section>

      <section aria-labelledby="grid-extras">
        <h2 id="grid-extras" className="heading text-[1.25rem]">
          Qualifying and extras
        </h2>
        <p className="mt-1 text-[0.9375rem] text-text-muted">Pole and fastest lap are required.</p>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-8">
          {slot("pole_position")}
          {slot("fastest_lap")}
          {slot("dnf_driver")}

          <fieldset className="grid-box min-w-0" data-optional="true">
            <legend className="sr-only">Will the safety car come out?</legend>
            <span className="flex items-baseline justify-between gap-2 pl-3.5 pt-2.5">
              <span className="timing text-[1.35rem] leading-none sm:text-[1.6rem]">SC</span>
              <span className={`timing text-[0.75rem] ${scHit ? "text-f1-green" : "text-text-muted"}`}>
                {scHit === false ? "+0" : "+5"}
                {scHit === undefined && <span className="ml-1 font-sans">bonus</span>}
              </span>
            </span>
            <p className="mt-2 pl-3.5 text-[0.8125rem] text-text-secondary">Safety car deployed?</p>
            <div className="mt-2.5 flex gap-2 pl-3.5">
              {([true, false] as const).map((val) => {
                const on = form.safety_car === val
                return onSafetyCar ? (
                  <button
                    key={String(val)}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSafetyCar(on ? null : val)}
                    className={`btn btn-sm min-w-14 ${on ? "btn-light" : "btn-ghost"}`}
                  >
                    {val ? "Yes" : "No"}
                  </button>
                ) : (
                  <span
                    key={String(val)}
                    className={`btn btn-sm min-w-14 cursor-default ${on ? "btn-light" : "btn-ghost opacity-40"}`}
                  >
                    {val ? "Yes" : "No"}
                  </span>
                )
              })}
            </div>
          </fieldset>
        </div>
      </section>
    </div>
  )
}
