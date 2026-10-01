import type { Metadata } from "next"
import RegisterForm from "./RegisterForm"
import { DEMO_MODE } from "@/lib/demo"

export const metadata: Metadata = { title: "Create account" }

export default function RegisterPage() {
  return <RegisterForm demo={DEMO_MODE} />
}
