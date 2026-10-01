export const TEAM_COLORS: Record<string, string> = {
  VER: "#4781D7",
  HAD: "#4781D7",
  NOR: "#F47600",
  PIA: "#F47600",
  LEC: "#ED1131",
  HAM: "#ED1131",
  RUS: "#00D7B6",
  ANT: "#00D7B6",
  ALO: "#229971",
  STR: "#229971",
  GAS: "#00A1E8",
  COL: "#00A1E8",
  ALB: "#1868DB",
  SAI: "#1868DB",
  LAW: "#6C98FF",
  LIN: "#6C98FF",
  HUL: "#F50537",
  BOR: "#F50537",
  BEA: "#9C9FA2",
  OCO: "#9C9FA2",
  BOT: "#909090",
  PER: "#909090",
};

export const DRIVERS_2026 = [
  "VER",
  "HAD",
  "NOR",
  "PIA",
  "LEC",
  "HAM",
  "RUS",
  "ANT",
  "ALO",
  "STR",
  "GAS",
  "COL",
  "ALB",
  "SAI",
  "LAW",
  "LIN",
  "HUL",
  "BOR",
  "BEA",
  "OCO",
  "BOT",
  "PER",
] as const; //so typescipty infers a literal union type

export type DriverCode = (typeof DRIVERS_2026)[number];

// Team colours keyed by the canonical slug the backend emits (team_slug).
export const TEAM_SLUG_COLORS: Record<string, string> = {
  mercedes: "#00D7B6",
  ferrari: "#ED1131",
  mclaren: "#F47600",
  redbull: "#4781D7",
  alpine: "#00A1E8",
  astonmartin: "#229971",
  williams: "#1868DB",
  racingbulls: "#6C98FF",
  audi: "#F50537",
  haas: "#9C9FA2",
  cadillac: "#909090",
};

export function teamColor(slug: string | null | undefined): string {
  return (slug && TEAM_SLUG_COLORS[slug]) || "#888888";
}

// The 2026 grid, in constructor order. Drives every driver picker.
export const TEAMS: { slug: string; name: string; drivers: [DriverCode, DriverCode] }[] = [
  { slug: "redbull", name: "Red Bull", drivers: ["VER", "HAD"] },
  { slug: "mclaren", name: "McLaren", drivers: ["NOR", "PIA"] },
  { slug: "ferrari", name: "Ferrari", drivers: ["LEC", "HAM"] },
  { slug: "mercedes", name: "Mercedes", drivers: ["RUS", "ANT"] },
  { slug: "astonmartin", name: "Aston Martin", drivers: ["ALO", "STR"] },
  { slug: "alpine", name: "Alpine", drivers: ["GAS", "COL"] },
  { slug: "williams", name: "Williams", drivers: ["ALB", "SAI"] },
  { slug: "racingbulls", name: "Racing Bulls", drivers: ["LAW", "LIN"] },
  { slug: "audi", name: "Audi", drivers: ["HUL", "BOR"] },
  { slug: "haas", name: "Haas", drivers: ["BEA", "OCO"] },
  { slug: "cadillac", name: "Cadillac", drivers: ["BOT", "PER"] },
];

export const DRIVER_NAMES: Record<string, { first: string; last: string }> = {
  VER: { first: "Max", last: "Verstappen" },
  HAD: { first: "Isack", last: "Hadjar" },
  NOR: { first: "Lando", last: "Norris" },
  PIA: { first: "Oscar", last: "Piastri" },
  LEC: { first: "Charles", last: "Leclerc" },
  HAM: { first: "Lewis", last: "Hamilton" },
  RUS: { first: "George", last: "Russell" },
  ANT: { first: "Kimi", last: "Antonelli" },
  ALO: { first: "Fernando", last: "Alonso" },
  STR: { first: "Lance", last: "Stroll" },
  GAS: { first: "Pierre", last: "Gasly" },
  COL: { first: "Franco", last: "Colapinto" },
  ALB: { first: "Alex", last: "Albon" },
  SAI: { first: "Carlos", last: "Sainz" },
  LAW: { first: "Liam", last: "Lawson" },
  LIN: { first: "Arvid", last: "Lindblad" },
  HUL: { first: "Nico", last: "Hülkenberg" },
  BOR: { first: "Gabriel", last: "Bortoleto" },
  BEA: { first: "Oliver", last: "Bearman" },
  OCO: { first: "Esteban", last: "Ocon" },
  BOT: { first: "Valtteri", last: "Bottas" },
  PER: { first: "Sergio", last: "Pérez" },
};

const DRIVER_TEAM: Record<string, string> = Object.fromEntries(
  TEAMS.flatMap((t) => t.drivers.map((d) => [d, t.slug])),
);

export function driverTeam(code: string | null | undefined): string | undefined {
  return code ? DRIVER_TEAM[code] : undefined;
}

export function driverLastName(code: string): string {
  return DRIVER_NAMES[code]?.last ?? code;
}

// Teammates share a colour, so give the 2nd/3rd car of a colour a dash pattern
// to keep overlapping line charts distinguishable. Returns code -> SVG dasharray
// ("" = solid line).
export function teammateDashes(codes: string[]): Record<string, string> {
  const seenByColor: Record<string, number> = {};
  const out: Record<string, string> = {};
  for (const code of codes) {
    const color = TEAM_COLORS[code] ?? "#666";
    const n = seenByColor[color] ?? 0;
    seenByColor[color] = n + 1;
    out[code] = n === 0 ? "" : n === 1 ? "7 5" : "2 4";
  }
  return out;
}
