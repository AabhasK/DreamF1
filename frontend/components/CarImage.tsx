"use client"

import { useState } from "react"
import { TEAMS } from "@/lib/design"

// Maps the canonical team slug to the car asset filename (kept as supplied).
const CAR_FILES: Record<string, string> = {
  alpine: "2026alpinecarright.avif",
  astonmartin: "2026astonmartincarright.avif",
  audi: "2026audicarright.avif",
  cadillac: "2026cadillaccarright.avif",
  ferrari: "2026ferraricarright.avif",
  haas: "2026haasf1teamcarright.avif",
  mclaren: "2026mclarencarright.avif",
  mercedes: "2026mercedescarright.avif",
  racingbulls: "2026racingbullscarright.avif",
  redbull: "2026redbullracingcarright.avif",
  williams: "2026williamscarright.avif",
}

export default function CarImage({
  slug,
  className,
  style,
}: {
  slug: string
  className?: string
  style?: React.CSSProperties
}) {
  const [failed, setFailed] = useState(false)
  const file = CAR_FILES[slug]
  if (failed || !file) return null
  const team = TEAMS.find((t) => t.slug === slug)?.name ?? slug
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/assets/cars/${file}`}
      alt={`${team} 2026 car`}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={className}
      style={style}
    />
  )
}
