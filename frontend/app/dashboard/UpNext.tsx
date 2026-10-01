import { flagUrl, splitRaceName, weekendRange, type F1Event } from "@/lib/f1"

/** The few rounds after the next one, so the season ahead is one glance away. */
export default function UpNext({ events }: { events: F1Event[] }) {
  if (events.length === 0) return null
  return (
    <section aria-labelledby="up-next-title">
      <h2 id="up-next-title" className="heading text-[1.125rem]">
        After that
      </h2>
      <ol className="mt-3 border-t border-border-subtle">
        {events.map((e) => (
          <li key={e.id} className="flex items-center gap-3 border-b border-border-subtle py-2.5">
            <span className="timing w-8 text-[0.75rem] text-text-muted">R{e.round_number}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(e.country, 32)} alt="" className="h-3 w-auto" />
            <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{splitRaceName(e.event_name).place}</span>
            <span className="timing text-[0.75rem] text-text-muted">{weekendRange(e).toUpperCase()}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
