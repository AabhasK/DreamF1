// Single entry point for every browser `/api/*` call.
//
// Live mode (DEMO_MODE=false): proxies to the FastAPI backend at API_URL. This
// replaces the old vercel.json rewrite — the EC2 address now lives in one env var
// instead of being committed, so an IP change is a Vercel setting, not a code change.
//
// Demo mode (default): answers from the static snapshots in demo-data/ — see lib/demo.ts.
import { NextRequest, NextResponse } from "next/server"
import {
  DEMO_MODE,
  DEMO_GROUPS,
  demoCompare,
  demoLeaderboard,
  demoPredictions,
  demoToken,
  demoUser,
  readDemo,
} from "@/lib/demo"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ path: string[] }> }

const BACKEND = process.env.API_URL ?? "http://localhost:8080"

async function proxy(req: NextRequest, segments: string[]) {
  const url = `${BACKEND}/api/${segments.join("/")}${req.nextUrl.search}`
  const headers: Record<string, string> = {}
  for (const h of ["authorization", "content-type"]) {
    const v = req.headers.get(h)
    if (v) headers[h] = v
  }
  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: req.method === "GET" ? undefined : await req.text(),
      cache: "no-store",
    })
    return new NextResponse(res.body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    })
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 })
  }
}

const notFound = (what = "Not in demo snapshot") =>
  NextResponse.json({ detail: what, _error: what }, { status: 404 })

const readOnly = () =>
  NextResponse.json(
    { detail: "Demo mode — the live backend is paused, so this can't be saved right now." },
    { status: 403 },
  )

async function file(rel: string) {
  const data = await readDemo(rel)
  return data == null ? notFound() : NextResponse.json(data)
}

async function demoGet(req: NextRequest, p: string[]) {
  const user = demoUser(req.headers.get("authorization"))
  const [head, ...rest] = p

  switch (head) {
    case "schedule":
      return file("schedule")
    case "standings":
      return file(`standings/${rest[0]}`)
    case "circuit_history":
      return file(`circuit_history/${rest[1]}`)
    case "telemetry": {
      const [, rn, kind, d1, d2] = rest
      if (kind === "compare" && d1 && d2) {
        const data = await demoCompare(rn, d1.toUpperCase(), d2.toUpperCase())
        return data ? NextResponse.json(data) : notFound("No fastest lap found for that pair")
      }
      return file(`telemetry/${rn}/${kind}`)
    }
  }

  if (!user) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  if (head === "me") return NextResponse.json({ id: 1, username: user, email: `${user}@demo.local`, total_points: 0 })
  if (head === "predictions") return NextResponse.json(await demoPredictions(user))
  if (head === "groups" && rest.length === 0) return NextResponse.json(DEMO_GROUPS)
  if (head === "groups" && rest[1] === "leaderboard") return NextResponse.json(await demoLeaderboard(user))
  return notFound()
}

async function demoPost(req: NextRequest, p: string[]) {
  if (p[0] === "login" || p[0] === "register") {
    const body = await req.json().catch(() => ({}))
    const username = String(body.username ?? "").trim() || "guest"
    return NextResponse.json({ access_token: demoToken(username), token_type: "bearer", username })
  }
  return readOnly()
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { path } = await params
  return DEMO_MODE ? demoGet(req, path) : proxy(req, path)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { path } = await params
  return DEMO_MODE ? demoPost(req, path) : proxy(req, path)
}
