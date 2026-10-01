// Static circuit facts keyed by an internal circuit key. Only stable,
// circuit-level facts live here — the fastest lap is pulled live from each
// race's results. Missing fields degrade gracefully in the UI.
//
// length_km  — official track length
// first_gp   — year of the first F1 World Championship race at this circuit
// laps       — scheduled race distance in laps

export interface CircuitFacts {
  name: string
  length_km: number
  first_gp: number
  laps: number
}

export const CIRCUITS: Record<string, CircuitFacts> = {
  Malaysia: { name: "Sepang International Circuit", length_km: 5.543, first_gp: 1999, laps: 56 },
  Bahrain: { name: "Bahrain International Circuit", length_km: 5.412, first_gp: 2004, laps: 57 },
  SaudiArabia: { name: "Jeddah Corniche Circuit", length_km: 6.174, first_gp: 2021, laps: 50 },
  Imola: { name: "Autodromo Enzo e Dino Ferrari", length_km: 4.909, first_gp: 1980, laps: 63 },
  Australia: { name: "Albert Park Circuit", length_km: 5.278, first_gp: 1996, laps: 58 },
  China: { name: "Shanghai International Circuit", length_km: 5.451, first_gp: 2004, laps: 56 },
  Japan: { name: "Suzuka Circuit", length_km: 5.807, first_gp: 1987, laps: 53 },
  Miami: { name: "Miami International Autodrome", length_km: 5.412, first_gp: 2022, laps: 57 },
  Canada: { name: "Circuit Gilles Villeneuve", length_km: 4.361, first_gp: 1978, laps: 70 },
  Monaco: { name: "Circuit de Monaco", length_km: 3.337, first_gp: 1950, laps: 78 },
  Spain: { name: "Circuit de Barcelona-Catalunya", length_km: 4.657, first_gp: 1991, laps: 66 },
  Madrid: { name: "Madring", length_km: 5.474, first_gp: 2026, laps: 57 },
  Austria: { name: "Red Bull Ring", length_km: 4.318, first_gp: 1970, laps: 71 },
  UnitedKingdom: { name: "Silverstone Circuit", length_km: 5.891, first_gp: 1950, laps: 52 },
  Belgium: { name: "Circuit de Spa-Francorchamps", length_km: 7.004, first_gp: 1950, laps: 44 },
  Hungary: { name: "Hungaroring", length_km: 4.381, first_gp: 1986, laps: 70 },
  Netherlands: { name: "Circuit Zandvoort", length_km: 4.259, first_gp: 1952, laps: 72 },
  Italy: { name: "Autodromo Nazionale Monza", length_km: 5.793, first_gp: 1950, laps: 53 },
  Azerbaijan: { name: "Baku City Circuit", length_km: 6.003, first_gp: 2016, laps: 51 },
  Singapore: { name: "Marina Bay Street Circuit", length_km: 4.94, first_gp: 2008, laps: 62 },
  UnitedStates: { name: "Circuit of the Americas", length_km: 5.513, first_gp: 2012, laps: 56 },
  Mexico: { name: "Autódromo Hermanos Rodríguez", length_km: 4.304, first_gp: 1963, laps: 71 },
  Brazil: { name: "Autódromo José Carlos Pace", length_km: 4.309, first_gp: 1973, laps: 71 },
  LasVegas: { name: "Las Vegas Strip Circuit", length_km: 6.201, first_gp: 2023, laps: 50 },
  Qatar: { name: "Lusail International Circuit", length_km: 5.419, first_gp: 2021, laps: 57 },
  UnitedArabEmirates: { name: "Yas Marina Circuit", length_km: 5.281, first_gp: 2009, laps: 58 },
}

// Circuit key → detailed diagram filename (in /public/assets/2026tracks/, .avif).
// Circuits not listed here keep the GPS telemetry glow-map fallback.
const IMAGE_FILE: Record<string, string> = {
  Malaysia: "2026trackkualalumpurdetailed",
  Australia: "2026trackmelbournedetailed",
  China: "2026trackshanghaidetailed",
  Japan: "2026tracksuzukadetailed",
  Miami: "2026trackmiamidetailed",
  Canada: "2026trackmontrealdetailed",
  Monaco: "2026trackmontecarlodetailed",
  Spain: "2026trackcatalunyadetailed",
  Madrid: "2026trackmadringdetailed",
  Austria: "2026trackspielbergdetailed",
  UnitedKingdom: "2026tracksilverstonedetailed",
  Belgium: "2026trackspafrancorchampsdetailed",
  Hungary: "2026trackhungaroringdetailed",
  Netherlands: "2026trackzandvoortdetailed",
  Italy: "2026trackmonzadetailed",
  Azerbaijan: "2026trackbakudetailed",
  Singapore: "2026tracksingaporedetailed",
  UnitedStates: "2026trackaustindetailed",
  Mexico: "2026trackmexicocitydetailed",
  Brazil: "2026trackinterlagosdetailed",
  LasVegas: "2026tracklasvegasdetailed",
  UnitedArabEmirates: "2026trackyasmarinacircuitdetailed",
}

/**
 * 2026 rounds held away from the country FastF1 files them under. The Bahrain
 * Grand Prix runs at Sepang this year ("Bahrain Grand Prix in Malaysia",
 * FastF1 location Kuala Lumpur), but the schedule API only carries the country.
 */
export const RELOCATED: Record<string, { key: string; country: string; city: string }> = {
  "Bahrain Grand Prix": { key: "Malaysia", country: "Malaysia", city: "Kuala Lumpur" },
}

/** Resolve a country + event name to the circuit key (handles shared countries). */
export function getCircuitKey(country: string, eventName: string): string | null {
  if (RELOCATED[eventName]) return RELOCATED[eventName].key
  const n = eventName.toLowerCase()
  if (country === "United States") {
    if (n.includes("miami")) return "Miami"
    if (n.includes("las vegas")) return "LasVegas"
    return "UnitedStates"
  }
  if (country === "Spain") {
    // Two Spanish rounds in 2026: Barcelona (Catalunya) and the new Madrid race.
    if (n.includes("madrid") || n.includes("spanish")) return "Madrid"
    return "Spain"
  }
  if (country === "Italy") {
    if (n.includes("emilia") || n.includes("imola")) return "Imola"
    return "Italy"
  }
  const map: Record<string, string> = {
    Australia: "Australia", China: "China", Japan: "Japan", Canada: "Canada",
    Monaco: "Monaco", Austria: "Austria", "Great Britain": "UnitedKingdom",
    "United Kingdom": "UnitedKingdom", Belgium: "Belgium", Hungary: "Hungary",
    Netherlands: "Netherlands", Azerbaijan: "Azerbaijan", Singapore: "Singapore",
    Mexico: "Mexico", Brazil: "Brazil", Qatar: "Qatar",
    "Abu Dhabi": "UnitedArabEmirates", "United Arab Emirates": "UnitedArabEmirates",
    Bahrain: "Bahrain", "Saudi Arabia": "SaudiArabia",
  }
  return map[country] ?? null
}

/** Candidate circuit-diagram image paths, or [] to use the GPS glow-map fallback. */
export function getCircuitImageCandidates(country: string, eventName: string): string[] {
  const key = getCircuitKey(country, eventName)
  const file = key ? IMAGE_FILE[key] : null
  return file ? [`/assets/2026tracks/${file}.avif`] : []
}

export function getCircuitFacts(country: string, eventName: string): CircuitFacts | null {
  const key = getCircuitKey(country, eventName)
  return key ? CIRCUITS[key] ?? null : null
}
