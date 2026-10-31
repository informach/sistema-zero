'use client'

import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import { EdiAnimation, prefetchAnimationRuntime } from '@sistemazero/edisvg/react'
import { useZappyFala } from '@sistemazero/member-shell/components/zappy-fala-context'
import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { economiaDeDados } from '@/lib/economia-de-dados'
import { type MascotExpression, tocandoDoZappy } from './mascot'

export function prefetchZappyAnimation(): void {
  if (typeof window === 'undefined') return
  const warm = () => {
    if (economiaDeDados() || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    void prefetchAnimationRuntime().catch(() => {})
  }
  if (typeof window.requestIdleCallback === 'function')
    window.requestIdleCallback(warm, { timeout: 4000 })
  else window.setTimeout(warm, 1500)
}

/** Speech is controlled by the existing voice context. Other expressions retain their own clock. */
export function KidsMascotAnimated({
  expression = 'happy',
  className,
  stillClassName,
}: {
  expression?: MascotExpression
  className?: string
  stillClassName?: string
}) {
  const speech = useZappyFala()
  const controlled = tocandoDoZappy(expression, speech)
  const art = BUILTIN_ART[expression]
  const inputs = useMemo(
    () => (expression === 'speaking' ? { falando: controlled !== false } : undefined),
    [expression, controlled],
  )
  return (
    <EdiAnimation
      src={art.url}
      poster={art.poster.url}
      width={48}
      height={48}
      className={cn('size-12 shrink-0 select-none', className)}
      posterClassName={stillClassName}
      playing={controlled !== false}
      inputs={inputs}
    />
  )
}
