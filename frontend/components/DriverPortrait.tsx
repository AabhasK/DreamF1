"use client"

import { useState } from "react"
import { DRIVER_NAMES, TEAM_COLORS, teamColor } from "@/lib/design"

/**
 * Full-height driver cutout standing in a pool of team-coloured light.
 * `crop="bust"` frames head to chest for tighter spots. Falls back to the
 * driver code when the photo is missing.
 */
export default function DriverPortrait({
  code,
  slug,
  crop = "full",
  mirror = false,
  glow = true,
  priority = false,
  className = "",
}: {
  code: string
  slug?: string
  crop?: "full" | "bust"
  mirror?: boolean
  glow?: boolean
  priority?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const color = slug ? teamColor(slug) : (TEAM_COLORS[code] ?? "#888888")
  const name = DRIVER_NAMES[code] ? `${DRIVER_NAMES[code].first} ${DRIVER_NAMES[code].last}` : code

  return (
    <div className={`relative isolate ${crop === "bust" ? "overflow-hidden" : ""} ${className}`}>
      {glow && (
        <div
          aria-hidden="true"
          className="absolute inset-x-[-25%] bottom-0 -z-10 h-3/4"
          style={{ background: `radial-gradient(55% 60% at 50% 100%, ${color}59, transparent 72%)` }}
        />
      )}
      {failed ? (
        <div className="flex h-full w-full items-end justify-center pb-6">
          <span className="timing text-[3rem]" style={{ color }}>
            {code}
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/Drivers/${code}.avif`}
          alt={name}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailed(true)}
          className={`h-full select-none ${
            crop === "bust" ? "w-full object-cover object-top" : "mx-auto w-auto object-contain object-bottom"
          }`}
          style={mirror ? { transform: "scaleX(-1)" } : undefined}
          draggable={false}
        />
      )}
    </div>
  )
}
