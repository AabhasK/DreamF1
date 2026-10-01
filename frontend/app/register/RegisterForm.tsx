"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AuthShell from "@/components/AuthShell"
import PasswordField from "@/components/PasswordField"
import { setSession } from "@/lib/auth"

const LABEL = "mb-2 block text-[0.875rem] font-medium text-text-secondary"

export default function RegisterForm({ demo }: { demo: boolean }) {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [lightsOut, setLightsOut] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setBusy(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const detail = (data as { detail?: unknown }).detail
        setError(typeof detail === "string" ? detail : "Your account wasn't created. Check the details and try again.")
        setBusy(false)
        return
      }

      // Backend signs you in on register (returns a token), so go straight in.
      const data = await response.json().catch(() => ({}))
      if (data.access_token) {
        setSession(data.access_token, data.username ?? username)
        setLightsOut(true)
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        setTimeout(() => router.push("/dashboard"), reduce ? 0 : 450)
      } else {
        router.push("/login")
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.")
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      intro="Start a circle, call every race, settle it on Sunday."
      lightsOut={lightsOut}
      demo={demo}
      footer={
        <>
          Already racing?{" "}
          <Link href="/login" className="link">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label htmlFor="username" className={LABEL}>
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="field"
          />
        </div>

        <div>
          <label htmlFor="email" className={LABEL}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="field"
          />
        </div>

        <div>
          <label htmlFor="password" className={LABEL}>
            Password
          </label>
          <PasswordField id="password" value={password} onChange={setPassword} autoComplete="new-password" />
        </div>

        {error && (
          <p role="alert" className="text-[0.875rem] text-f1-red">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {lightsOut ? "Away we go" : busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  )
}
