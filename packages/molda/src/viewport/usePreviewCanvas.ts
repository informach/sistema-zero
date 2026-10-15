import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from './reducedMotion'

/** The renderer and its canvas have the same lifetime, including StrictMode remounts.
 * A disposed WebGL context must never be reused by the next renderer. */
export function usePreviewCanvas<T extends { dispose(): void }>(
  create: (canvas: HTMLCanvasElement, options: { reducedMotion: boolean }) => T,
  label: string,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<T | null>(null)
  const [unsupported, setUnsupported] = useState(false)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const canvas = container.ownerDocument.createElement('canvas')
    canvas.className = 'mld-viewport block size-full'
    canvas.setAttribute('aria-label', label)
    container.append(canvas)
    let instance: T
    try {
      instance = create(canvas, { reducedMotion: prefersReducedMotion() })
    } catch {
      canvas.remove()
      setUnsupported(true)
      return
    }
    setUnsupported(false)
    setPreview(instance)
    return () => {
      instance.dispose()
      canvas.remove()
      setPreview(null)
    }
  }, [create, label])
  return { containerRef, preview, unsupported }
}
