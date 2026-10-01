import type { Metadata } from "next"
import TelemetryClient from "./TelemetryClient"
import { getSchedule } from "@/lib/schedule"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Telemetry" }

export default async function TelemetryPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const { events, backendDown } = await getSchedule()
  const { round } = await searchParams

  return (
    <div className="shell pt-8 sm:pt-10">
      <TelemetryClient
        events={events}
        backendDown={backendDown}
        initialRound={round && /^\d+$/.test(round) ? Number(round) : null}
      />
    </div>
  )
}
