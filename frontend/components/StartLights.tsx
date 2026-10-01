/**
 * The five-column start gantry, two lamps per column like the real thing.
 * Pass `lit` to light columns from the left, or `states` to light them individually.
 */
const LAMP = {
  sm: "size-3",
  md: "size-5 sm:size-6",
  lg: "size-7 sm:size-10",
}

export default function StartLights({
  lit = 0,
  states,
  size = "md",
  labels,
  className = "",
}: {
  lit?: number
  states?: boolean[]
  size?: keyof typeof LAMP
  labels?: string[]
  className?: string
}) {
  return (
    <div className={`flex gap-1.5 sm:gap-2.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const on = states ? !!states[i] : i < lit
        return (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="flex flex-col gap-1.5 border border-border-subtle bg-surface-0 p-1.5 corner-sm sm:p-2">
              <span className={`lamp ${LAMP[size]}`} data-on={on} />
              <span className={`lamp ${LAMP[size]}`} data-on={on} />
            </div>
            {labels && (
              <span className={`timing text-[0.6875rem] ${on ? "text-text-primary" : "text-text-muted"}`}>{labels[i]}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
