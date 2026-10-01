export interface DriverStanding {
  position: number
  code: string
  driver: string
  team: string
  team_slug: string
  points: number
  wins: number
  podiums: number
  poles: number
  fastest_laps: number
  dnfs: number
  best_finish: number | null
  avg_finish: number | null
  races: number
  points_per_race: number | null
  last3_points: number
  gap_to_leader: number
  gap_to_next: number
}

export interface ConstructorStanding {
  position: number
  team: string
  team_slug: string
  points: number
  wins: number
  podiums: number
  one_twos: number
  poles: number
  fastest_laps: number
  gap_to_leader: number
  gap_to_next: number
}

export interface StandingsData {
  year: number
  drivers: DriverStanding[]
  constructors: ConstructorStanding[]
  _error?: string
}

// One request per year per page load, however many sections ask for it.
const cache = new Map<number, Promise<StandingsData | null>>()

export function fetchStandings(year = 2026): Promise<StandingsData | null> {
  if (!cache.has(year)) {
    cache.set(
      year,
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/standings/${year}`)
        .then((res) => (res.ok ? (res.json() as Promise<StandingsData>) : null))
        .then((data) => (data && !data._error ? data : null))
        .catch(() => null),
    )
  }
  return cache.get(year)!
}
