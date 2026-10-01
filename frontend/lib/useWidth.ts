"use client"

import { useCallback, useState } from "react"

/**
 * Rendered width of an element in CSS pixels, kept current by a ResizeObserver.
 * Charts draw with it so one SVG unit is one pixel: axis text stays readable on a
 * phone instead of shrinking with a fixed-width viewBox.
 */
export function useWidth(fallback = 1000) {
  const [width, setWidth] = useState(fallback)
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}
