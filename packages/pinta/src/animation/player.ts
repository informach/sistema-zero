/**
 * O relógio da prévia de animação. A conta é PURA (`frameIndexAt`) — o hook só
 * liga o requestAnimationFrame e re-renderiza quando o índice MUDA (não a cada
 * frame do navegador), pausando em `document.hidden`.
 */
import { useEffect, useRef, useState } from 'react'

/**
 * Índice do quadro em `elapsedMs`. Com `loop` dá a volta; sem loop TRAVA no
 * último quadro (a prévia mostra o fim, não some).
 */
export function frameIndexAt(
  elapsedMs: number,
  fps: number,
  frameCount: number,
  loop: boolean,
): number {
  if (frameCount <= 0) return 0
  const safeFps = Math.min(Math.max(fps, 1), 60)
  const step = Math.floor(Math.max(elapsedMs, 0) / (1000 / safeFps))
  if (loop) return step % frameCount
  return Math.min(step, frameCount - 1)
}

/**
 * Toca a animação: devolve o índice do quadro atual. `playing: false` congela
 * (e zera o relógio ao voltar a tocar — a prévia recomeça do início).
 */
export function useAnimationPlayer(input: {
  playing: boolean
  fps: number
  frameCount: number
  loop: boolean
}): number {
  const { playing, fps, frameCount, loop } = input
  const [frame, setFrame] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!playing || frameCount <= 1) {
      startRef.current = null
      setFrame(0)
      return
    }
    let rafId = 0
    let cancelled = false

    const tick = (now: number): void => {
      if (cancelled) return
      // Pausa em aba oculta: o rAF já não roda em hidden na maioria dos
      // browsers, mas o guard evita um salto gigante ao voltar (re-ancora).
      if (document.hidden) {
        startRef.current = null
        rafId = requestAnimationFrame(tick)
        return
      }
      if (startRef.current === null) startRef.current = now
      const index = frameIndexAt(now - startRef.current, fps, frameCount, loop)
      setFrame((current) => (current === index ? current : index))
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      startRef.current = null
    }
  }, [playing, fps, frameCount, loop])

  return Math.min(frame, Math.max(frameCount - 1, 0))
}
