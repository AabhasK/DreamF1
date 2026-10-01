import type { Metadata } from "next"
import PredictClient from "./PredictClient"
import { getSchedule } from "@/lib/schedule"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Predict" }

export default async function PredictPage() {
  const { events, backendDown } = await getSchedule()
  const today = new Date().toISOString().split("T")[0]
  const nextRace = events.find((e) => e.event_date >= today) ?? null

  // Lock predictions once the first session (FP1) starts.
  // Falls back to race day noon UTC when session dates are unavailable.
  let predictionsLocked = false
  if (nextRace) {
    const raw = nextRace.session1_date
    const fp1 = raw
      ? new Date(raw.endsWith("Z") ? raw : raw + "Z")
      : new Date(nextRace.event_date + "T12:00:00Z")
    predictionsLocked = new Date() >= fp1
  }

  return (
    <div className="shell pt-8 sm:pt-10">
      <PredictClient nextRace={nextRace} backendDown={backendDown} locked={predictionsLocked} />
    </div>
  )
}
