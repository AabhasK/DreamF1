import type { Metadata } from "next"
import CirclesClient from "./CirclesClient"

export const metadata: Metadata = { title: "Circles" }

export default async function CirclesPage({ searchParams }: { searchParams: Promise<{ circle?: string }> }) {
  const { circle } = await searchParams
  const initialCircle = circle && /^\d+$/.test(circle) ? Number(circle) : null

  return (
    <div className="shell pt-8 sm:pt-10">
      <CirclesClient initialCircle={initialCircle} />
    </div>
  )
}
