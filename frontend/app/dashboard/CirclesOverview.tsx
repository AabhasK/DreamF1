"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSession } from "@/lib/auth"

interface Group {
  id: number
  name: string
  invite_code: string
  member_count: number
}

export default function CirclesOverview() {
  const { token } = useSession()
  const [groups, setGroups] = useState<Group[] | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/groups`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => setGroups([]))
  }, [token])

  if (token === undefined) return null
  const authed = !!token

  return (
    <section aria-labelledby="circles-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="circles-title" className="heading text-[1.125rem]">
          Your circles
        </h2>
        {authed && (
          <Link href="/circles" className="link text-[0.875rem]">
            Manage
          </Link>
        )}
      </div>

      {!authed ? (
        <>
          <p className="mt-3 text-[0.9375rem] text-text-secondary">
            Private leaderboards for you and your friends. Sign in to make picks and start one.
          </p>
          <Link href="/login" className="btn btn-primary btn-sm mt-4">
            Sign in
          </Link>
        </>
      ) : groups === null ? (
        <div className="mt-4 h-24 animate-pulse bg-surface-1" aria-busy="true" />
      ) : groups.length === 0 ? (
        <>
          <p className="mt-3 text-[0.9375rem] text-text-secondary">
            You&apos;re not in a circle yet. Start one and share the code, or join a friend&apos;s.
          </p>
          <Link href="/circles" className="btn btn-ghost btn-sm mt-4">
            Create or join
          </Link>
        </>
      ) : (
        <ul className="mt-3 border-t border-border-subtle">
          {groups.map((g) => (
            <li key={g.id} className="border-b border-border-subtle">
              <Link href={`/circles?circle=${g.id}`} className="group flex items-center justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold transition-colors group-hover:text-f1-red">{g.name}</span>
                  <span className="text-[0.8125rem] text-text-muted">
                    {g.member_count} members, code <span className="timing text-text-secondary">{g.invite_code}</span>
                  </span>
                </span>
                <span className="text-[0.8125rem] font-medium text-text-muted transition-colors group-hover:text-text-primary">
                  Table
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
