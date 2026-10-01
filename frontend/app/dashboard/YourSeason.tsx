"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Pred {
  points_earned: number
  score_breakdown: string | null
}

const MAX_PER_RACE = 64

/** Signed-in players' season in four numbers. Hidden until there's a pick. */
export default function YourSeason() {
  const [preds, setPreds] = useState<Pred[] | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/predictions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPreds(Array.isArray(d) ? d : []))
      .catch(() => setPreds([]))
  }, [])

  if (!preds || preds.length === 0) return null

  const total = preds.reduce((s, p) => s + (p.points_earned || 0), 0)
  const scored = preds.filter((p) => p.score_breakdown != null).length
  const accuracy = scored > 0 ? Math.round((total / (scored * MAX_PER_RACE)) * 100) : null
  const best = preds.reduce((m, p) => Math.max(m, p.points_earned || 0), 0)

  return (
    <section aria-labelledby="your-season-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="your-season-title" className="heading text-[1.125rem]">
          Your season
        </h2>
        <Link href="/predictions" className="link text-[0.875rem]">
          My picks
        </Link>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
        <div>
          <dt className="label">Points</dt>
          <dd className="timing mt-1 text-[2.25rem] leading-none text-f1-red">{total}</dd>
        </div>
        <div>
          <dt className="label">Accuracy</dt>
          <dd className="timing mt-1 text-[2.25rem] leading-none">{accuracy != null ? `${accuracy}%` : "—"}</dd>
        </div>
        <div>
          <dt className="label">Races predicted</dt>
          <dd className="timing mt-1 text-[1.5rem] leading-none">{preds.length}</dd>
        </div>
        <div>
          <dt className="label">Best race</dt>
          <dd className="timing mt-1 text-[1.5rem] leading-none">{best}</dd>
        </div>
      </dl>
    </section>
  )
}
