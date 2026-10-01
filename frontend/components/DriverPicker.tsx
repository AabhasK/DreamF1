"use client"

import { useEffect, useRef } from "react"
import DriverPortrait from "@/components/DriverPortrait"
import { DRIVER_NAMES, TEAMS, teamColor } from "@/lib/design"

/**
 * Modal driver grid on the native <dialog>: focus is trapped, Escape closes it
 * and the page behind is inert. A bottom sheet on phones, a panel on desktop.
 * `taken` maps a driver code to the slot it is already used in.
 */
export default function DriverPicker({
  open,
  title,
  value,
  taken,
  onPick,
  onClear,
  onClose,
}: {
  open: boolean
  title: string
  value: string | null
  taken?: Map<string, string>
  onPick: (code: string) => void
  onClear?: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      document.documentElement.style.overflow = "hidden"
    } else if (!open && dialog.open) {
      dialog.close()
    }
    return () => {
      document.documentElement.style.overflow = ""
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // backdrop click
      }}
      aria-labelledby="picker-title"
      data-lenis-prevent
      className="picker"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4 sm:px-6">
        <h2 id="picker-title" className="heading text-[1.25rem]">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {onClear && value && (
            <button type="button" onClick={onClear} className="btn btn-ghost btn-sm">
              Clear
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" autoFocus>
            Close
          </button>
        </div>
      </div>

      <div className="max-h-[70dvh] overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6" data-lenis-prevent>
        {TEAMS.map((team) => (
          <section key={team.slug} className="border-b border-border-subtle py-4 last:border-b-0">
            <h3 className="label mb-3 flex items-center gap-2">
              <span className="h-3 w-[3px]" style={{ background: teamColor(team.slug) }} aria-hidden="true" />
              {team.name}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {team.drivers.map((code) => {
                const usedIn = code !== value ? taken?.get(code) : undefined
                const selected = code === value
                return (
                  <button
                    key={code}
                    type="button"
                    disabled={!!usedIn}
                    onClick={() => onPick(code)}
                    aria-pressed={selected}
                    className={`group relative flex items-end gap-3 overflow-hidden border px-3 pt-2 text-left transition-colors corner-sm disabled:cursor-not-allowed disabled:opacity-35 ${
                      selected
                        ? "border-text-primary bg-surface-2"
                        : "border-border-subtle bg-surface-1 enabled:hover:border-border-muted enabled:hover:bg-surface-2"
                    }`}
                  >
                    <DriverPortrait code={code} slug={team.slug} crop="bust" className="h-16 w-12 shrink-0 sm:h-20 sm:w-14" />
                    <span className="min-w-0 pb-2.5">
                      <span className="timing block text-[1.1rem]" style={{ color: teamColor(team.slug) }}>
                        {code}
                      </span>
                      <span className="block truncate text-[0.8125rem] text-text-secondary">
                        {DRIVER_NAMES[code]?.last}
                      </span>
                    </span>
                    {usedIn && (
                      <span className="timing absolute right-2 top-2 text-[0.6875rem] text-text-muted">{usedIn}</span>
                    )}
                    {selected && (
                      <span className="absolute right-2 top-2 text-[0.75rem] font-semibold text-text-primary">Picked</span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </dialog>
  )
}
