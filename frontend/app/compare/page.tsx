import NavHeader from "@/components/NavHeader"
import CompareClient from "./CompareClient"
import type { F1Event } from "../dashboard/page"
import { getSchedule } from "@/lib/schedule"

export const dynamic = "force-dynamic"

export default async function ComparePage() {
  const { events, backendDown } = await getSchedule()

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <NavHeader active="compare" />
      <CompareClient events={events} backendDown={backendDown} />
    </div>
  )
}
