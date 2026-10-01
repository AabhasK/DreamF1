import Link from "next/link"
import Logo from "@/components/Logo"
import StartLights from "@/components/StartLights"

/**
 * Split screen for sign-in and sign-up: the start gantry and a statement on
 * the left, the form panel on the right. `lightsOut` switches the gantry off
 * the moment a sign-in succeeds.
 */
export default function AuthShell({
  title,
  intro,
  lightsOut = false,
  demo = false,
  footer,
  children,
}: {
  title: string
  intro: string
  lightsOut?: boolean
  demo?: boolean
  footer: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="@container relative hidden flex-col justify-between overflow-hidden border-r border-border-subtle p-12 lg:flex xl:p-16">
        <Link href="/dashboard" className="self-start text-[1.35rem]" aria-label="DreamF1 home">
          <Logo />
        </Link>
        <div>
          <StartLights lit={lightsOut ? 0 : 5} size="lg" />
          <p className="display mt-12 text-[clamp(3.5rem,16cqi,9rem)]" aria-hidden="true">
            Lights
            <br />
            out.
          </p>
          <p className="lede mt-8 max-w-[38ch]">
            Call pole, the podium and the fastest lap before practice starts. Settle it with your friends on Sunday.
          </p>
        </div>
        <p className="text-[0.8125rem] text-text-muted">Scored on real 2026 results from FastF1.</p>
      </aside>

      <section className="flex flex-col px-4 py-6 sm:px-10 lg:py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 self-start text-[0.9375rem] text-text-muted transition-colors hover:text-text-primary"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.75" />
          </svg>
          Back to the paddock
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo className="text-[1.25rem]" />
            <StartLights lit={lightsOut ? 0 : 5} size="sm" />
          </div>

          <div className="border border-border-default bg-surface-1 p-6 corner sm:p-10">
            <h1 className="heading text-[clamp(1.75rem,4vw,2.25rem)]">{title}</h1>
            <p className="mt-2 text-text-secondary">{intro}</p>
            <div className="mt-8">{children}</div>
          </div>

          <p className="mt-6 text-center text-[0.9375rem] text-text-muted">{footer}</p>
          {demo && (
            <p className="mt-3 text-center text-[0.8125rem] text-text-muted">
              Demo mode: any username and password gets you in.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
