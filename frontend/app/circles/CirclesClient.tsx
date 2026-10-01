"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { PODIUM_COLOR } from "@/lib/format"
import { useSession } from "@/lib/auth"

interface Circle {
  id: number
  name: string
  invite_code: string
  member_count: number
}

interface LeaderboardEntry {
  username: string
  total_points: number
  rank: number
}

type View = "list" | "create" | "join" | "leaderboard"

const API = `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api`

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
}

/** Copies a code and confirms in place, no toast. */
function CopyCode({ code, large = false }: { code: string; large?: boolean }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be blocked; the code is still on screen to copy by hand.
    }
  }
  return (
    <span className="inline-flex items-center gap-3">
      <span className={`timing tracking-[0.12em] ${large ? "text-[clamp(2rem,6vw,3.25rem)] text-text-primary" : "text-[0.9375rem] text-text-secondary"}`}>
        {code}
      </span>
      <button type="button" onClick={copy} className="btn btn-ghost btn-sm min-w-20" aria-live="polite">
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 text-[0.9375rem] text-text-muted transition-colors hover:text-text-primary">
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </svg>
      All circles
    </button>
  )
}

function Leaderboard({ rows, me }: { rows: LeaderboardEntry[]; me: string | null }) {
  const leader = rows[0]?.total_points || 1
  const top = rows.slice(0, 3)
  const order = [top[1], top[0], top[2]]

  return (
    <>
      {top.length >= 2 && (
        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 items-end gap-2 sm:gap-4">
          {order.map((e, i) =>
            e ? (
              <div key={e.username} className="flex min-w-0 flex-col items-center">
                <p className={`max-w-full truncate text-center text-[0.9375rem] font-semibold ${e.username === me ? "text-f1-red" : ""}`}>
                  {e.username}
                </p>
                <p className="timing mb-3 mt-1 text-[1.25rem]">{e.total_points}</p>
                <div
                  className="flex w-full items-start justify-center border-t-2 bg-surface-1 pt-2"
                  style={{
                    borderColor: PODIUM_COLOR[e.rank] ?? "var(--color-border-muted)",
                    height: `calc(2.5rem + ${(e.total_points / leader) * 6}rem)`,
                  }}
                >
                  <span className="timing text-[1.6rem]" style={{ color: PODIUM_COLOR[e.rank] }}>
                    {e.rank}
                  </span>
                </div>
              </div>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
      )}

      <ol className="mt-8 border-t border-border-subtle">
        {rows.map((e) => {
          const isMe = e.username === me
          const gap = (rows[0]?.total_points ?? 0) - e.total_points
          return (
            <li
              key={e.username}
              className={`grid h-14 grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] items-center gap-x-4 border-b border-border-subtle sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,14rem)_4rem_4rem] ${
                isMe ? "bg-surface-1" : ""
              }`}
            >
              <span className="timing text-right text-[1.05rem]" style={{ color: PODIUM_COLOR[e.rank] ?? "var(--color-text-muted)" }}>
                {e.rank}
              </span>
              <span className="flex min-w-0 items-center gap-2.5">
                {isMe && <span className="h-6 w-0.5 bg-f1-red" aria-hidden="true" />}
                <span className="truncate font-medium">{e.username}</span>
                {isMe && <span className="text-[0.8125rem] text-f1-red">You</span>}
              </span>
              <span className="hidden h-[3px] bg-surface-2 sm:block" aria-hidden="true">
                <span className="block h-full bg-text-secondary" style={{ width: `${(e.total_points / leader) * 100}%` }} />
              </span>
              <span className="timing text-right text-[1.05rem]">{e.total_points}</span>
              <span className="timing hidden text-right text-[0.875rem] text-text-muted sm:block">
                {gap > 0 ? `-${gap}` : "Leader"}
              </span>
            </li>
          )
        })}
      </ol>
    </>
  )
}

export default function CirclesClient({ initialCircle }: { initialCircle: number | null }) {
  const { token, username } = useSession()
  const me = username ?? null
  const [circles, setCircles] = useState<Circle[] | null>(null)
  const [view, setView] = useState<View>("list")

  const [createName, setCreateName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; invite_code: string } | null>(null)

  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joined, setJoined] = useState(false)

  const [active, setActive] = useState<Circle | null>(null)
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)

  const fetchCircles = useCallback((t: string) => {
    return fetch(`${API}/groups`, { headers: authHeaders(t) })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((data: Circle[]) => {
        const list = Array.isArray(data) ? data : []
        setCircles(list)
        return list
      })
  }, [])

  const openLeaderboard = useCallback(
    (circle: Circle, t: string) => {
      setActive(circle)
      setBoard(null)
      setView("leaderboard")
      setBoardLoading(true)
      fetch(`${API}/groups/${circle.id}/leaderboard`, { headers: authHeaders(t) })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((data: LeaderboardEntry[] | null) => setBoard(Array.isArray(data) ? data : []))
        .finally(() => setBoardLoading(false))
    },
    [],
  )

  useEffect(() => {
    if (!token) return
    fetchCircles(token).then((list) => {
      const target = initialCircle != null ? list.find((c) => c.id === initialCircle) : undefined
      if (target) openLeaderboard(target, token)
    })
  }, [token, initialCircle, fetchCircles, openLeaderboard])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !createName.trim()) return
    setCreateError(null)
    try {
      const res = await fetch(`${API}/groups`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ name: createName.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCreateError(typeof data.detail === "string" ? data.detail : "The circle wasn't created. Try again.")
        return
      }
      setCreated({ name: data.name, invite_code: data.invite_code })
      fetchCircles(token)
    } catch {
      setCreateError("Couldn't reach the server. Check your connection and try again.")
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !joinCode.trim()) return
    setJoinError(null)
    try {
      const res = await fetch(`${API}/groups/join`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ invite_code: joinCode.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setJoinError(typeof data.detail === "string" ? data.detail : "That code didn't work. Check it and try again.")
        return
      }
      setJoined(true)
      fetchCircles(token)
    } catch {
      setJoinError("Couldn't reach the server. Check your connection and try again.")
    }
  }

  function backToList() {
    setView("list")
    setActive(null)
    setCreateName("")
    setCreated(null)
    setCreateError(null)
    setJoinCode("")
    setJoined(false)
    setJoinError(null)
  }

  if (token === undefined) return null

  if (!token) {
    return (
      <>
        <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">Circles</h1>
        <p className="lede mt-2">Private leaderboards for you and your friends, scored on the same races.</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-border-subtle pt-8">
          <p className="max-w-[46ch] text-text-secondary">Sign in to start a circle or join one with a code.</p>
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </>
    )
  }

  // ── Leaderboard ──────────────────────────────────────────────────
  if (view === "leaderboard" && active) {
    const mine = board?.find((e) => e.username === me)
    return (
      <>
        <BackLink onClick={backToList} />
        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div className="min-w-0">
            <h1 className="display text-[clamp(1.75rem,4vw,2.75rem)]">{active.name}</h1>
            <p className="mt-4 text-text-muted">
              {active.member_count} members. Invite code <span className="timing text-text-secondary">{active.invite_code}</span>
            </p>
          </div>
          {mine && board && (
            <div className="text-right">
              <p className="label">Your position</p>
              <p className="timing mt-1 text-[clamp(2.5rem,5vw,3.75rem)] leading-none">
                P{mine.rank}
                <span className="ml-2 text-[0.4em] text-text-muted">of {board.length}</span>
              </p>
            </div>
          )}
        </div>

        {boardLoading || board === null ? (
          <div className="mt-8 animate-pulse space-y-2" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-14 bg-surface-1" />
            ))}
          </div>
        ) : board.length === 0 ? (
          <p className="mt-8 border-t border-border-subtle pt-8 text-text-secondary">
            No scored picks yet. The table fills in after the next race is scored.
          </p>
        ) : (
          <Leaderboard rows={board} me={me} />
        )}
      </>
    )
  }

  // ── Create ───────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <>
        <BackLink onClick={backToList} />
        <h1 className="display mt-6 text-[clamp(1.75rem,4vw,2.75rem)]">New circle</h1>
        <div className="mt-10 max-w-xl border border-border-default bg-surface-1 p-6 corner sm:p-8">
          {created ? (
            <>
              <p className="heading text-[1.5rem]">{created.name} is ready.</p>
              <p className="mt-2 text-text-secondary">Share this code so friends can join.</p>
              <div className="mt-6">
                <CopyCode code={created.invite_code} large />
              </div>
              <button onClick={backToList} className="btn btn-light mt-8">
                Done
              </button>
            </>
          ) : (
            <form onSubmit={handleCreate}>
              <label htmlFor="circle-name" className="label block">
                Circle name
              </label>
              <input
                id="circle-name"
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Sunday Sofa Stewards"
                maxLength={60}
                autoFocus
                aria-invalid={!!createError}
                aria-describedby={createError ? "create-error" : undefined}
                className="field mt-2"
              />
              {createError && (
                <p id="create-error" role="alert" className="mt-3 text-[0.875rem] text-f1-red">
                  {createError}
                </p>
              )}
              <button type="submit" disabled={!createName.trim()} className="btn btn-primary mt-6">
                Create circle
              </button>
            </form>
          )}
        </div>
      </>
    )
  }

  // ── Join ─────────────────────────────────────────────────────────
  if (view === "join") {
    return (
      <>
        <BackLink onClick={backToList} />
        <h1 className="display mt-6 text-[clamp(1.75rem,4vw,2.75rem)]">Join a circle</h1>
        <div className="mt-10 max-w-xl border border-border-default bg-surface-1 p-6 corner sm:p-8">
          {joined ? (
            <>
              <p className="heading text-[1.5rem]">You&apos;re in.</p>
              <p className="mt-2 text-text-secondary">Your picks now count on that circle&apos;s leaderboard.</p>
              <button onClick={backToList} className="btn btn-light mt-8">
                See your circles
              </button>
            </>
          ) : (
            <form onSubmit={handleJoin}>
              <label htmlFor="invite-code" className="label block">
                Invite code
              </label>
              <input
                id="invite-code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="From the friend who made it"
                autoComplete="off"
                autoCapitalize="characters"
                autoFocus
                aria-invalid={!!joinError}
                aria-describedby={joinError ? "join-error" : undefined}
                className="field timing mt-2 tracking-[0.12em] placeholder:font-sans placeholder:tracking-normal"
              />
              {joinError && (
                <p id="join-error" role="alert" className="mt-3 text-[0.875rem] text-f1-red">
                  {joinError}
                </p>
              )}
              <button type="submit" disabled={!joinCode.trim()} className="btn btn-primary mt-6">
                Join circle
              </button>
            </form>
          )}
        </div>
      </>
    )
  }

  // ── List ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <h1 className="display text-[clamp(2rem,4.5vw,3.25rem)]">Circles</h1>
          <p className="lede mt-2">Private leaderboards for you and your friends, scored on the same races.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setView("join")} className="btn btn-ghost">
            Join with a code
          </button>
          <button onClick={() => setView("create")} className="btn btn-primary">
            Create a circle
          </button>
        </div>
      </div>

      {circles === null ? (
        <div className="mt-8 animate-pulse space-y-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-20 bg-surface-1" />
          ))}
        </div>
      ) : circles.length === 0 ? (
        <p className="mt-8 max-w-[52ch] border-t border-border-subtle pt-8 text-text-secondary">
          You&apos;re not in a circle yet. Create one and share the code, or ask a friend for theirs.
        </p>
      ) : (
        <ul className="mt-8 border-t border-border-subtle">
          {circles.map((c) => (
            <li
              key={c.id}
              className="grid gap-x-8 gap-y-3 border-b border-border-subtle py-6 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="heading truncate text-[1.5rem] sm:text-[1.75rem]">{c.name}</p>
                <p className="mt-1 text-[0.9375rem] text-text-muted">
                  <span className="timing text-text-primary">{c.member_count}</span> members
                </p>
              </div>
              <CopyCode code={c.invite_code} />
              <button onClick={() => openLeaderboard(c, token)} className="btn btn-light justify-self-start sm:justify-self-end">
                Leaderboard
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
