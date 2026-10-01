"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import ConstructorsRace from "@/components/ConstructorsRace"
import { fetchStandings, type ConstructorStanding } from "@/lib/standings"

/** All eleven teams as a race of cars, split over two columns on wide screens. */
export default function Constructors() {
  const [rows, setRows] = useState<ConstructorStanding[] | null>(null)

  useEffect(() => {
    fetchStandings(2026).then((d) => setRows(d?.constructors ?? []))
  }, [])

  if (rows !== null && rows.length === 0) return null
  const max = Math.max(1, ...(rows ?? []).map((c) => c.points))
  const half = Math.ceil((rows?.length ?? 0) / 2)

  return (
    <section className="border-b border-border-subtle py-6" aria-labelledby="constructors-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="constructors-title" className="heading text-[1.125rem]">
          Constructors
        </h2>
        <Link href="/standings" className="link text-[0.875rem]">
          Team standings
        </Link>
      </div>

      {rows === null ? (
        <div className="mt-3 h-64 animate-pulse bg-surface-1" aria-busy="true" />
      ) : (
        <div className="mt-3 grid gap-x-10 lg:grid-cols-2">
          <ConstructorsRace rows={rows.slice(0, half)} max={max} />
          <ConstructorsRace rows={rows.slice(half)} max={max} />
        </div>
      )}
    </section>
  )
}
