import Logo from "@/components/Logo"

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16">
      {/* The finish line */}
      <div className="chequer h-3 opacity-80" aria-hidden="true" />

      <div className="border-t border-border-subtle">
        <div className="shell grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Logo className="text-[1.5rem]" />
            <p className="mt-3 max-w-md text-[0.9375rem] text-text-muted">
              Predictions for private friend groups, scored on real 2026 race results from FastF1.
            </p>
          </div>

          <a
            href="https://github.com/AabhasK/DreamF1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 self-start text-[0.9375rem] font-medium text-text-secondary transition-colors hover:text-text-primary md:self-end"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Source on GitHub
          </a>
        </div>

        <div className="shell flex flex-col gap-1.5 border-t border-border-subtle py-5 text-[0.8125rem] text-text-muted sm:flex-row sm:justify-between">
          <p>© {year} Aabhas Khandelwal</p>
          <p>Not affiliated with Formula 1 or the FIA.</p>
        </div>
      </div>
    </footer>
  )
}
