import type { Metadata } from "next"
import CompareClient from "./CompareClient"
import { getSchedule } from "@/lib/schedule"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Compare" }

export default async function ComparePage() {
  const { events, backendDown } = await getSchedule()

  return (
    <div className="shell pt-8 sm:pt-10">
      <CompareClient events={events} backendDown={backendDown} />
    </div>
  )
}
