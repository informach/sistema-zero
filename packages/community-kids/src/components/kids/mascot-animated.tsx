'use client'
import { prefetchAnimationRuntime } from '@sistemazero/edisvg/react'
import { economiaDeDados } from '@/lib/economia-de-dados'

export { ZappyAnimated as KidsMascotAnimated } from '@sistemazero/member-shell/components/lesson-ui/mascot-animated'

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
