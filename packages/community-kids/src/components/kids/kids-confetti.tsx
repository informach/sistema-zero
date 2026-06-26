'use client'

import { type CSSProperties, useEffect, useMemo, useState } from 'react'

const CONFETTI_COLORS = ['var(--kids-cyan)', 'var(--kids-lime)', 'var(--sz-hot)'] as const
const CONFETTI_COUNT = 24
/** Cleanup por TEMPO: reduced-motion zera a animação (animationend não dispara). */
const CONFETTI_LIFETIME_MS = 3600

interface ConfettiPiece {
  id: number
  left: number
  duration: number
  delay: number
  color: (typeof CONFETTI_COLORS)[number]
}

/**
 * Burst de confete em CSS puro (zero dep — um único burst não justifica lib). Posiciona-se
 * `absolute inset-0` (o pai deve ser `relative`/`fixed`) e some sozinho após ~3.6s. As peças usam
 * a classe `kids-confetti-piece` (animação no globals.css, que respeita `prefers-reduced-motion`).
 * Compartilhado pela celebração de aula e pela de publicação no Mural.
 */
export function KidsConfetti() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShow(false), CONFETTI_LIFETIME_MS)
    return () => clearTimeout(t)
  }, [])

  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        duration: 2 + Math.random() * 1.2,
        delay: Math.random() * 0.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] as ConfettiPiece['color'],
      })),
    [],
  )

  if (!show) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="kids-confetti-piece"
          style={
            {
              left: `${piece.left}%`,
              backgroundColor: piece.color,
              '--confetti-duration': `${piece.duration}s`,
              '--confetti-delay': `${piece.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
