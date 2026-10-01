import { DEMO_MODE } from "@/lib/demo"

/** Slim notice shown site-wide while the site serves snapshots instead of the live backend. */
export default function DemoBar() {
  if (!DEMO_MODE) return null
  return (
    <div className="border-b border-border-subtle bg-surface-1">
      <p className="shell flex items-center gap-2.5 py-2 text-[0.8125rem] leading-snug text-text-muted">
        <span className="timing shrink-0 bg-text-primary px-1.5 py-0.5 text-[0.625rem] text-surface-0">DEMO</span>
        <span className="sm:hidden">A snapshot of real 2026 data. Any username signs in.</span>
        <span className="hidden sm:inline">
          The live backend is paused, so you&apos;re browsing a snapshot of real 2026 data. Any username signs in.
        </span>
      </p>
    </div>
  )
}
