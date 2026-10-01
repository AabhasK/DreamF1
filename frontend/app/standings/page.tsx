import type { Metadata } from "next"
import StandingsClient from "./StandingsClient"

export const metadata: Metadata = { title: "Standings" }

export default function StandingsPage() {
  return (
    <div className="shell pt-8 sm:pt-10">
      <StandingsClient />
    </div>
  )
}
