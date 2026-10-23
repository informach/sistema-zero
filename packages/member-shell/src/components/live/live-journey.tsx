'use client'

import { CalendarPlus, Check, Clock3 } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { downloadLiveCalendar, type LiveCalendarEvent } from '../../lib/live/calendar'
import { DEVICE_CHECK_EVENT, type DeviceCheck, readDeviceCheck } from '../../lib/live/device-check'
import type { LiveTimelineStep } from '../../lib/live/journey'

/**
 * Peças da jornada de um encontro (proposta de 23/10/2026), usadas pela agenda e pela sala. Elas
 * não carregam pele própria: quem chama passa as cores do lugar onde pousam (o destaque azul do
 * Kids, a âncora escura do adulto, um cartão claro).
 */

/**
 * O teste do computador lembrado neste aparelho. `null` até montar: o servidor não enxerga o
 * `localStorage`, e decidir no primeiro quadro faria o texto trocar na hidratação.
 */
export function useDeviceCheck(): DeviceCheck | null {
  const [check, setCheck] = useState<DeviceCheck | null>(null)
  useEffect(() => {
    const sync = () => setCheck(readDeviceCheck())
    sync()
    window.addEventListener(DEVICE_CHECK_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(DEVICE_CHECK_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return check
}

/** "Marcado · Sala abre às 14h45 · Ao vivo às 15h · Gravação · Rever até…", com o passo atual. */
export function LiveTimeline({
  steps,
  onDark = false,
  className = '',
}: {
  steps: LiveTimelineStep[]
  /** Sobre o destaque (azul do Kids ou escuro do adulto) ou sobre um cartão claro. */
  onDark?: boolean
  className?: string
}) {
  return (
    <ol
      aria-label="Linha do tempo do encontro"
      className={`flex flex-wrap gap-x-5 gap-y-2 rounded-2xl px-4 py-3 font-bold text-sm ${onDark ? 'bg-white/12' : 'border bg-card'} ${className}`}
    >
      {steps.map((step) => (
        <li
          key={step.key}
          aria-current={step.status === 'current' ? 'step' : undefined}
          className={`flex items-center gap-2 ${step.status === 'next' ? 'opacity-75' : ''}`}
        >
          <span
            aria-hidden
            className={`grid size-5 shrink-0 place-items-center rounded-full ${
              step.status === 'done'
                ? onDark
                  ? 'bg-white text-primary'
                  : 'bg-primary text-primary-foreground'
                : step.status === 'current'
                  ? 'bg-[var(--sz-kids-amarelo,#ffc02e)] shadow-[0_0_0_4px_rgb(255_192_46/0.35)]'
                  : `border-2 ${onDark ? 'border-white/70' : 'border-border'}`
            }`}
          >
            {step.status === 'done' ? <Check className="size-3" strokeWidth={3.4} /> : null}
          </span>
          {step.label}
          {step.status === 'current' ? <span className="sr-only"> (agora)</span> : null}
        </li>
      ))}
    </ol>
  )
}

/** O selo da última semana para rever ("Faltam 5 dias para rever"). */
export function ReviewDeadlineChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sz-kids-amarelo-bg,var(--aviso-tint,#fff3c4))] px-3 py-1 font-extrabold text-[var(--sz-kids-tinta,var(--aviso-texto,#5c4000))] text-xs">
      <Clock3 className="size-3.5" aria-hidden />
      {label}
    </span>
  )
}

/** "Adicionar à minha agenda": baixa o arquivo de calendário do encontro. */
export function AddToCalendarButton({
  event,
  className,
  children = 'Adicionar à minha agenda',
}: {
  event: Omit<LiveCalendarEvent, 'url'> & { path: string }
  className: string
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const { path, ...rest } = event
        downloadLiveCalendar({ ...rest, url: new URL(path, window.location.origin).toString() })
      }}
    >
      <CalendarPlus className="size-5" aria-hidden />
      {children}
    </button>
  )
}
