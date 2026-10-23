'use client'
import type { LiveGuidance } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { ArrowDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const labels: Record<LiveGuidance['target'], string> = {
  'studio-run': 'Aqui você executa o projeto',
  'studio-stop': 'Aqui você para o projeto',
  'studio-blocks': 'Aqui estão os blocos',
  'studio-code': 'Aqui está o código',
  'studio-save': 'Aqui você guarda o projeto',
  'room-hand': 'Aqui você pede para falar',
  'room-help': 'Aqui você pede ajuda',
}

/** A semantic pointer only. It never clicks, scrolls or changes the child's project. */
export function LiveGuidancePointer({
  guidance,
  actorId,
  serverTime,
  onReveal,
}: {
  guidance: LiveGuidance | null | undefined
  actorId: string
  serverTime: string
  onReveal?(target: LiveGuidance['target']): void
}) {
  const [offscreen, setOffscreen] = useState<'hidden' | 'missing' | null>(null)
  const [rect, setRect] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)
  useEffect(() => {
    setRect(null)
    setOffscreen(null)
    if (!guidance || (guidance.learnerId && guidance.learnerId !== actorId)) return
    const expires =
      performance.now() +
      Math.max(0, Math.min(8000, Date.parse(guidance.expiresAt) - Date.parse(serverTime)))
    const update = () => {
      if (performance.now() >= expires) {
        setRect(null)
        setOffscreen(null)
        return
      }
      const target = document.querySelector<HTMLElement>(`[data-live-target="${guidance.target}"]`)
      if (!target || target.closest('[inert]')) {
        setRect(null)
        setOffscreen('missing')
        return
      }
      const next = target.getBoundingClientRect()
      if (!next.width || !next.height || next.bottom < 0 || next.top > window.innerHeight) {
        setRect(null)
        setOffscreen('hidden')
        return
      }
      setRect({ top: next.top, left: next.left, width: next.width, height: next.height })
      setOffscreen(null)
    }
    update()
    const timer = setInterval(update, 250)
    window.addEventListener('resize', update)
    document.addEventListener('scroll', update, true)
    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', update)
      document.removeEventListener('scroll', update, true)
    }
  }, [guidance, actorId, serverTime])
  if (!guidance || (!rect && !offscreen)) return null
  if (!rect)
    return createPortal(
      <div className="fixed bottom-24 left-1/2 z-[120] w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border bg-card p-4 shadow-xl">
        <p role="status" className="text-sm font-bold">
          Professora: {labels[guidance.target]}
        </p>
        {offscreen === 'hidden' ? (
          <Button
            className="mt-2 min-h-11"
            variant="outline"
            onClick={() => {
              onReveal?.(guidance.target)
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  const target = document.querySelector<HTMLElement>(
                    `[data-live-target="${guidance.target}"]`,
                  )
                  target?.scrollIntoView({ block: 'center', behavior: 'auto' })
                }),
              )
            }}
          >
            Ver onde
          </Button>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Esse botão não está disponível na área aberta agora.
          </p>
        )}
      </div>,
      document.body,
    )
  return createPortal(
    <div
      className="pointer-events-none fixed z-[120] rounded-lg ring-4 ring-primary ring-offset-4 motion-safe:animate-pulse"
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
    >
      <span
        role="status"
        className="absolute bottom-full left-1/2 mb-4 flex w-max max-w-64 -translate-x-1/2 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-center text-sm font-bold text-primary-foreground shadow-lg"
      >
        <ArrowDown className="size-4 shrink-0" aria-hidden />
        Professora: {labels[guidance.target]}
      </span>
    </div>,
    document.body,
  )
}
