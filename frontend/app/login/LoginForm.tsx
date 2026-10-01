"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AuthShell from "@/components/AuthShell"
import PasswordField from "@/components/PasswordField"
import { setSession } from "@/lib/auth"

const LABEL = "mb-2 block text-[0.875rem] font-medium text-text-secondary"

export default function LoginForm({ demo }: { demo: boolean }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [lightsOut, setLightsOut] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setBusy(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const detail = (data as { detail?: string | unknown[] }).detail
        setError(
          typeof detail === "string"
            ? detail
            : response.status === 401
              ? "That username and password don't match."
              : `Sign-in failed (${response.status}). Try again.`,
        )
        setBusy(false)
        return
      }

      const data = await response.json()
      setSession(data.access_token, data.username ?? username)
      // Lights out, and away we go.
      setLightsOut(true)
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      setTimeout(() => router.push("/dashboard"), reduce ? 0 : 450)
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.")
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      intro="Welcome back. Your circle is waiting."
      lightsOut={lightsOut}
      demo={demo}
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="link">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5">
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
            aria-invalid={!!error}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="password" className={LABEL}>
            Password
          </label>
          <PasswordField
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={!!error}
          />
        </div>

        {error && (
          <p role="alert" className="text-[0.875rem] text-f1-red">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {lightsOut ? "Away we go" : busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  )
}
