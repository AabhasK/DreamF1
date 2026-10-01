"use client"

import { useState } from "react"

/** Password input with an inline show/hide toggle. */
export default function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: "current-password" | "new-password"
  invalid?: boolean
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        aria-invalid={invalid}
        className="field pr-20"
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 px-4 text-[0.8125rem] font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  )
}
