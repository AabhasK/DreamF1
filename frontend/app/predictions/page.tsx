import type { Metadata } from "next"
import PredictionsClient from "./PredictionsClient"

export const metadata: Metadata = { title: "My picks" }

export default function PredictionsPage() {
  return (
    <div className="shell pt-8 sm:pt-10">
      <PredictionsClient />
    </div>
  )
}
