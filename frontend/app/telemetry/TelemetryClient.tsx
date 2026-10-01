"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import RaceClassification, { type RaceResult } from "./RaceClassification"
import TyreStrategy, { type TyreStint } from "./TyreStrategy"
import QualiTimes, { type QualiResult } from "./QualiTimes"
import SpeedTrace from "./SpeedTrace"
import PositionChart, { type PositionData } from "./PositionChart"
import GapChart, { type GapData } from "./GapChart"
import LapTimesChart, { type LapTimesData } from "./LapTimesChart"
import SectorTimes, { type SectorData } from "./SectorTimes"
import CircuitMap, { type MapData } from "./CircuitMap"
import RacePace, { type RacePaceData } from "./RacePace"
import Weather, { type WeatherData } from "./Weather"
import RaceControl, { type RaceControlData } from "./RaceControl"
import TrackArt from "@/components/TrackArt"
import TrackMap from "@/components/TrackMap"
import { TEAM_COLORS } from "@/lib/design"
import { getCircuitFacts } from "@/lib/circuits"
import { getTrackImage, parseUTC } from "@/lib/trackData"
import { flagUrl, fmtLap, splitRaceName, type F1Event } from "@/lib/f1"

type Tab = "race" | "laptimes" | "racepace" | "positions" | "gaps" | "tyres" | "quali" | "sectors" | "speed" | "map" | "weather" | "racecontrol"

interface RaceSummary { session: string; results: RaceResult[] }
interface TyreData { session: string; stints: TyreStint[] }
interface QualiData { session: string; results: QualiResult[] }
interface SpeedData { session: string; drivers: Record<string, { distance: number[]; speed: number[] }> }

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

const TABS: { key: Tab; label: string }[] = [
  { key: "race", label: "Race" },
  { key: "laptimes", label: "Lap times" },
  { key: "racepace", label: "Race pace" },
  { key: "positions", label: "Positions" },
  { key: "gaps", label: "Gaps" },
  { key: "tyres", label: "Tyres" },
  { key: "quali", label: "Qualifying" },
  { key: "sectors", label: "Sectors" },
  { key: "speed", label: "Speed trace" },
  { key: "map", label: "Circuit" },
  { key: "weather", label: "Weather" },
  { key: "racecontrol", label: "Race control" },
]

function Code({ code }: { code?: string }) {
  if (!code) return <span className="text-text-muted">—</span>
  return (
    <span className="timing" style={{ color: TEAM_COLORS[code] }}>
      {code}
    </span>
  )
}

export default function TelemetryClient({
  events: allEvents,
  backendDown,
  initialRound,
}: {
  events: F1Event[]
  backendDown: boolean
  initialRound: number | null
}) {
  const now = new Date()
  // Only include a race once its race session (session5) has started.
  // Falls back to strict event_date < today when session dates aren't populated yet.
  const events = allEvents.filter((e) => {
    const raceStart = parseUTC(e.session5_date) ?? new Date(e.event_date + "T23:59:59Z")
    return raceStart <= now
  })

  const latest = events.at(-1)?.round_number ?? 0
  const requested = initialRound != null && events.some((e) => e.round_number === initialRound) ? initialRound : null
  const [roundNum, setRoundNum] = useState<number>(requested ?? latest)
  const [userPicked, setUserPicked] = useState(requested != null)
  const [tab, setTab] = useState<Tab>("race")

  if (backendDown || events.length === 0) {
    return (
      <>
        <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">Telemetry</h1>
        <p className="lede mt-2">
          {backendDown
            ? "The backend isn't responding. Start it with uvicorn main:app --reload in backend/."
            : "No 2026 race has been run yet. Analysis appears here after the first race."}
        </p>
      </>
    )
  }

  function pickRound(n: number) {
    setUserPicked(true)
    setRoundNum(n)
    setTab("race")
  }

  // Until someone picks a round, a round with no data yet falls back to the one before.
  function handleNoData() {
    if (userPicked) return
    const previous = events.filter((e) => e.round_number < roundNum).at(-1)
    if (previous) setRoundNum(previous.round_number)
  }

  // Keyed by round, so switching rounds starts with fresh, empty data.
  return (
    <RoundAnalysis
      key={roundNum}
      events={events}
      roundNum={roundNum}
      tab={tab}
      onTab={setTab}
      onPickRound={pickRound}
      onNoData={handleNoData}
    />
  )
}

function RoundAnalysis({
  events,
  roundNum,
  tab,
  onTab,
  onPickRound,
  onNoData,
}: {
  events: F1Event[]
  roundNum: number
  tab: Tab
  onTab: (t: Tab) => void
  onPickRound: (n: number) => void
  onNoData: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState<number | null>(null)

  const [summary, setSummary] = useState<RaceSummary | null>(null)
  const [tyres, setTyres] = useState<TyreData | null>(null)
  const [quali, setQuali] = useState<QualiData | null>(null)
  const [speed, setSpeed] = useState<SpeedData | false | null>(null)
  const [positions, setPositions] = useState<PositionData | false | null>(null)
  const [gaps, setGaps] = useState<GapData | false | null>(null)
  const [lapTimes, setLapTimes] = useState<LapTimesData | false | null>(null)
  const [racePace, setRacePace] = useState<RacePaceData | false | null>(null)
  const [weather, setWeather] = useState<WeatherData | false | null>(null)
  const [raceControl, setRaceControl] = useState<RaceControlData | false | null>(null)
  const [sectors, setSectors] = useState<SectorData | false | null>(null)
  const [mapData, setMapData] = useState<MapData | false | null>(null)

  const stripRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const selectedEvent = events.find((e) => e.round_number === roundNum)

  // Reads the latest callback without making the fetch below re-run.
  const reportNoData = useEffectEvent(() => onNoData())

  // Eager fetch for this round: race, tyres, quali
  useEffect(() => {
    const base = `${API_BASE}/api/telemetry/2026/${roundNum}`
    const get = (path: string) =>
      fetch(`${base}/${path}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((d) => (d && d._error ? null : d))

    let alive = true
    Promise.all([get("race_summary"), get("tyres"), get("quali")]).then(([s, t, q]) => {
      if (!alive) return
      if (!s) reportNoData()
      setSummary(s); setTyres(t); setQuali(q)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [roundNum])

  // Keep the selected round visible in the strip.
  useEffect(() => {
    const strip = stripRef.current
    const chip = strip?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (strip && chip) strip.scrollLeft = Math.max(0, chip.offsetLeft - strip.offsetLeft - 16)
  }, [])

  // Lazy loaders — fire only on first visit to that tab.
  // null = not yet fetched, false = tried and failed, T = data ready.
  const lazyFetch = (url: string, set: (v: never | false) => void) =>
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => set((d && !d._error ? d : false) as never))

  useEffect(() => {
    if (tab !== "laptimes" || lapTimes !== null || !roundNum) return
    lazyFetch(`${API_BASE}/api/telemetry/2026/${roundNum}/laptimes`, setLapTimes)
  }, [tab, roundNum, lapTimes])

  useEffect(() => {
    if (tab !== "racepace" || racePace !== null || !roundNum) return
    lazyFetch(`${API_BASE}/api/telemetry/2026/${roundNum}/race_pace`, setRacePace)
  }, [tab, roundNum, racePace])

  useEffect(() => {
    if (tab !== "weather" || weather !== null || !roundNum) return
    lazyFetch(`${API_BASE}/api/telemetry/2026/${roundNum}/weather`, setWeather)
  }, [tab, roundNum, weather])

  useEffect(() => {
    if (tab !== "racecontrol" || raceControl !== null || !roundNum) return
    lazyFetch(`${API_BASE}/api/telemetry/2026/${roundNum}/race_control`, setRaceControl)
  }, [tab, roundNum, raceControl])

  useEffect(() => {
    if (tab !== "positions" || positions !== null || !roundNum) return
    lazyFetch(`${API_BASE}/api/telemetry/2026/${roundNum}/positions`, setPositions)
  }, [tab, roundNum, positions])

  useEffect(() => {
    if (tab !== "gaps" || gaps !== null || !roundNum) return
    lazyFetch(`${API_BASE}/api/telemetry/2026/${roundNum}/gaps`, setGaps)
  }, [tab, roundNum, gaps])

  useEffect(() => {
    if (tab !== "sectors" || sectors !== null || !roundNum) return
    lazyFetch(`${API_BASE}/api/telemetry/2026/${roundNum}/sector_times`, setSectors)
  }, [tab, roundNum, sectors])

  useEffect(() => {
    if (tab !== "speed" || speed !== null || !roundNum) return
    lazyFetch(`${API_BASE}/api/telemetry/2026/${roundNum}/speed`, setSpeed)
  }, [tab, roundNum, speed])

  // The speed tab shows the circuit next to the trace, so it needs the map too.
  useEffect(() => {
    if ((tab !== "map" && tab !== "speed") || mapData !== null || !roundNum) return
    lazyFetch(`${API_BASE}/api/telemetry/2026/${roundNum}/map`, setMapData)
  }, [tab, roundNum, mapData])

  // Arrow keys move between tabs, as in the ARIA tabs pattern.
  function onTabKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    const i = TABS.findIndex((t) => t.key === tab)
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].key
    onTab(next)
    tabRefs.current[next]?.focus()
  }

  const track = selectedEvent ? getTrackImage(selectedEvent.country, selectedEvent.event_name) : null
  const facts = selectedEvent ? getCircuitFacts(selectedEvent.country, selectedEvent.event_name) : null
  const { place, suffix } = splitRaceName(selectedEvent?.event_name ?? "")
  const driverOrder = summary?.results.map((r) => r.abbreviation) ?? []
  const winner = summary?.results.find((r) => r.finish_position === 1)
  const flResult = summary?.results.find((r) => r.fastest_lap)
  const pole = quali?.results[0]?.Abbreviation
  const circuitFastestLap =
    flResult && flResult.best_lap_time ? { driver: flResult.abbreviation, time: fmtLap(flResult.best_lap_time) } : null

  return (
    <>
      <header className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-center">
        <div className="min-w-0">
          {selectedEvent && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem] text-text-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagUrl(selectedEvent.country)} alt="" className="h-4 w-auto" />
              <span>Round {selectedEvent.round_number}</span>
              {facts && (
                <>
                  <span className="h-3.5 w-px bg-border-muted" aria-hidden="true" />
                  <span>{facts.name}</span>
                </>
              )}
            </p>
          )}
          <h1 className="display mt-3 text-[clamp(2rem,4.5vw,3.25rem)]">
            {place}
            {suffix && <span className="mt-2 block text-[0.36em] text-text-muted">{suffix}</span>}
          </h1>
          <p className="mt-4 flex min-h-6 flex-wrap gap-x-6 gap-y-1 text-[0.9375rem] text-text-secondary">
            {winner && (
              <span>
                Won by <Code code={winner.abbreviation} />
              </span>
            )}
            {pole && (
              <span>
                Pole <Code code={pole} />
              </span>
            )}
            {flResult && (
              <span>
                Fastest lap <Code code={flResult.abbreviation} />{" "}
                <span className="timing text-f1-purple">{fmtLap(flResult.best_lap_time)}</span>
              </span>
            )}
          </p>
        </div>
        {track && (
          <TrackArt
            src={track}
            alt={`${facts?.name ?? selectedEvent?.event_name} layout`}
            dim={0.55}
            className="hidden max-h-36 lg:block"
          />
        )}
      </header>

      {/* Round picker */}
      <div ref={stripRef} className="scroll-x mt-6 gap-1 border-y border-border-subtle py-2" role="group" aria-label="Choose a round">
        {events.map((e) => {
          const on = e.round_number === roundNum
          return (
            <button
              key={e.round_number}
              onClick={() => onPickRound(e.round_number)}
              aria-pressed={on}
              className={`flex h-10 shrink-0 items-center gap-2 px-3 text-[0.875rem] transition-colors corner-sm ${
                on ? "bg-text-primary text-surface-0" : "text-text-muted hover:bg-surface-1 hover:text-text-primary"
              }`}
            >
              <span className="timing text-[0.75rem]">R{e.round_number}</span>
              <span className="font-semibold">{splitRaceName(e.event_name).place}</span>
            </button>
          )
        })}
      </div>

      {/* Analysis tabs, pinned under the site header */}
      <div className="sticky top-(--nav-h) z-30 -mx-4 border-b border-border-subtle bg-surface-0/92 px-4 backdrop-blur-md sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Analysis" onKeyDown={onTabKey} className="scroll-x">
          {TABS.map(({ key, label }) => {
            const on = tab === key
            return (
              <button
                key={key}
                ref={(el) => {
                  tabRefs.current[key] = el
                }}
                role="tab"
                id={`tab-${key}`}
                aria-selected={on}
                aria-controls="analysis-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => onTab(key)}
                className={`relative h-12 shrink-0 px-3 text-[0.875rem] font-medium transition-colors ${
                  on ? "text-text-primary" : "text-text-muted hover:text-text-primary"
                }`}
              >
                {label}
                {on && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-f1-red" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>

      <div id="analysis-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-6 min-h-96">
        {loading ? (
          <Loading />
        ) : (
          <div key={tab} className="animate-tab-in">
            {tab === "race" && (
              summary
                ? <RaceClassification results={summary.results} />
                : <EmptyState message="Race data isn't available for this round yet." />
            )}

            {tab === "laptimes" && (
              lapTimes === null ? <Loading /> :
              lapTimes ? <LapTimesChart data={lapTimes} /> :
              <EmptyState message="Lap times aren't available for this round." />
            )}

            {tab === "racepace" && (
              racePace === null ? <Loading /> :
              racePace ? <RacePace data={racePace} /> :
              <EmptyState message="Race pace isn't available for this round." />
            )}

            {tab === "positions" && (
              positions === null ? <Loading /> :
              positions ? <PositionChart data={positions} /> :
              <EmptyState message="Position data isn't available for this round." />
            )}

            {tab === "gaps" && (
              gaps === null ? <Loading /> :
              gaps ? <GapChart data={gaps} /> :
              <EmptyState message="Gap data isn't available for this round." />
            )}

            {tab === "tyres" && (
              tyres && driverOrder.length > 0
                ? <TyreStrategy stints={tyres.stints} driverOrder={driverOrder} />
                : <EmptyState message="Tyre data isn't available for this round." />
            )}

            {tab === "quali" && (
              quali
                ? <QualiTimes results={quali.results} />
                : <EmptyState message="Qualifying data isn't available for this round." />
            )}

            {tab === "sectors" && (
              sectors === null ? <Loading /> :
              sectors ? <SectorTimes data={sectors} /> :
              <EmptyState message="Sector times aren't available for this round." />
            )}

            {tab === "speed" && (
              speed === null ? <Loading /> :
              speed ? (
                <div className="grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
                  <SpeedTrace drivers={speed.drivers} cursor={cursor} onCursor={setCursor} />
                  {mapData && mapData.x.length > 1 && (
                    <figure className="xl:pt-12">
                      <TrackMap
                        x={mapData.x}
                        y={mapData.y}
                        cursor={cursor}
                        onCursor={setCursor}
                        label={`${selectedEvent?.event_name} circuit`}
                        className="mx-auto max-w-80"
                      />
                      <figcaption className="mt-4 text-[0.8125rem] text-text-muted">
                        Move along the trace or the track. The marker shows where on the lap you are.
                      </figcaption>
                    </figure>
                  )}
                </div>
              ) :
              <EmptyState message="Speed traces aren't available for this round." />
            )}

            {tab === "map" && (
              mapData === null ? <Loading /> :
              <CircuitMap
                data={mapData || { session: selectedEvent?.event_name ?? "", x: [], y: [] }}
                country={selectedEvent?.country}
                eventName={selectedEvent?.event_name}
                fastestLap={circuitFastestLap}
              />
            )}

            {tab === "weather" && (
              weather === null ? <Loading /> :
              weather ? <Weather data={weather} /> :
              <EmptyState message="Weather data isn't available for this round." />
            )}

            {tab === "racecontrol" && (
              raceControl === null ? <Loading /> :
              raceControl ? <RaceControl data={raceControl} /> :
              <EmptyState message="Race control messages aren't available for this round." />
            )}
          </div>
        )}
      </div>
    </>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="border-t border-border-subtle pt-8 text-text-secondary">{message}</p>
}

function Loading() {
  return (
    <div className="animate-pulse space-y-2" aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-10 bg-surface-1" />
      ))}
    </div>
  )
}
