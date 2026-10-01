import type { Metadata } from "next"
import LoginForm from "./LoginForm"
import { DEMO_MODE } from "@/lib/demo"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
  return <LoginForm demo={DEMO_MODE} />
}
