/** Static circuit image. Outline PNGs are dimmed so they sit back; detailed diagrams show as they are. */
export default function TrackArt({
  src,
  alt,
  className = "",
  dim = 0.55,
}: {
  src: string
  alt: string
  className?: string
  dim?: number
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={`h-auto w-full object-contain ${className}`}
      style={src.endsWith(".png") ? { opacity: dim } : undefined}
    />
  )
}
