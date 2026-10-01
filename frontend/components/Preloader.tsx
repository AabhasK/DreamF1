"use client"

import { useEffect, useRef, useState } from "react"
import StartLights from "@/components/StartLights"
import Logo from "@/components/Logo"

/**
 * Start-procedure preloader: five lights come on one by one, hold, then it's
 * lights out and the overlay lifts. Once per browser session, skippable with
 * any key or tap, and skipped entirely for reduced motion.
 */

const LIGHT_INTERVAL = 300
const HOLD = 600
const LIFT = 650

type Phase = "lights" | "out" | "done"

export default function Preloader() {
  const [phase, setPhase] = useState<Phase | null>(null)
  const [lit, setLit] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (sessionStorage.getItem("df1-preloaded")) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sessionStorage.setItem("df1-preloaded", "1")
      return
    }

    const t = timers.current
    const lightsOut = () => {
      // Marked as played only once it has actually run, so an interrupted
      // mount (StrictMode, fast navigation) simply starts it again.
      sessionStorage.setItem("df1-preloaded", "1")
      t.forEach(clearTimeout)
      setLit(0)
      setPhase("out")
      t.push(setTimeout(() => setPhase("done"), LIFT))
      window.removeEventListener("keydown", lightsOut)
      window.removeEventListener("pointerdown", lightsOut)
    }

    setPhase("lights")
    for (let i = 1; i <= 5; i++) t.push(setTimeout(() => setLit(i), LIGHT_INTERVAL * i))
    t.push(setTimeout(lightsOut, LIGHT_INTERVAL * 5 + HOLD))
    window.addEventListener("keydown", lightsOut)
    window.addEventListener("pointerdown", lightsOut)

    return () => {
      t.forEach(clearTimeout)
      window.removeEventListener("keydown", lightsOut)
      window.removeEventListener("pointerdown", lightsOut)
    }
  }, [])

  useEffect(() => {
    if (phase !== "lights") return
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = ""
    }
  }, [phase])

  if (phase === null || phase === "done") return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-60 flex flex-col items-center justify-center gap-10 bg-surface-0"
      style={{
        transform: phase === "out" ? "translateY(-100%)" : "none",
        transition: `transform ${LIFT}ms var(--ease-drive)`,
      }}
    >
      <StartLights lit={lit} size="lg" />
      <Logo className="text-[1.35rem]" />
    </div>
  )
}
