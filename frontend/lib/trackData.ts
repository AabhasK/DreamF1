import { RELOCATED, getCircuitImageCandidates } from "@/lib/circuits"

export const FLAG_CODES: Record<string, string> = {
  Australia: "AU", Bahrain: "BH", "Saudi Arabia": "SA", Japan: "JP",
  China: "CN", "United States": "US", Italy: "IT", Monaco: "MC",
  Spain: "ES", Canada: "CA", Austria: "AT", "Great Britain": "GB", "United Kingdom": "GB",
  Hungary: "HU", Belgium: "BE", Netherlands: "NL", Azerbaijan: "AZ",
  Singapore: "SG", Mexico: "MX", Brazil: "BR", Qatar: "QA",
  "Abu Dhabi": "AE", "United Arab Emirates": "AE", Malaysia: "MY",
}

const TRACK_IMAGES_MAP: Record<string, string> = {
  Australia: "Australia", Bahrain: "Bahrain", "Saudi Arabia": "SaudiArabia",
  Japan: "Japan", China: "China", Monaco: "Monaco", Spain: "Spain",
  Canada: "Canada", Austria: "Austria",
  "Great Britain": "UnitedKingdom", "United Kingdom": "UnitedKingdom",
  Hungary: "Hungary", Belgium: "Belgium", Netherlands: "Netherlands",
  Azerbaijan: "Azerbaijan", Singapore: "Singapore", Mexico: "Mexico",
  Brazil: "Brazil", Qatar: "Qatar",
  "Abu Dhabi": "UnitedArabEmirates", "United Arab Emirates": "UnitedArabEmirates",
}

export function getTrackImage(country: string, eventName: string): string | null {
  if (RELOCATED[eventName]) return getCircuitImageCandidates(country, eventName)[0] ?? null
  const n = eventName.toLowerCase()
  if (country === "United States") {
    if (n.includes("miami")) return "/assets/tracks/Miami.png"
    if (n.includes("las vegas")) return "/assets/tracks/LasVegas.png"
    return "/assets/tracks/UnitedStates.png"
  }
  if (country === "Italy") {
    if (n.includes("emilia") || n.includes("imola")) return "/assets/tracks/Imola.png"
    return "/assets/tracks/Italy.png"
  }
  if (country === "Spain") {
    // Two Spanish rounds in 2026: "Barcelona GP" (Catalunya) and the
    // "Spanish GP" at the new Madrid circuit, which has no simple outline —
    // use its detailed diagram instead of silently showing Catalunya.
    if (n.includes("madrid") || n.includes("spanish"))
      return "/assets/2026tracks/2026trackmadringdetailed.avif"
    return "/assets/tracks/Spain.png"
  }
  const key = TRACK_IMAGES_MAP[country]
  return key ? `/assets/tracks/${key}.png` : null
}

export function parseUTC(iso: string | null): Date | null {
  if (!iso) return null
  return new Date(iso.endsWith("Z") ? iso : iso + "Z")
}
