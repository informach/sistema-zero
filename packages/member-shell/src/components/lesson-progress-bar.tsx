'use client'

import type { SectionProgressView } from '@sistemazero/core/learning'
import {
  type AtividadeDaAula,
  type PosicaoNaAula,
  vistaProgressoAula,
} from '../lib/lesson-progress'
import { ProgressBar } from './progress-bar'

export function LessonProgressBar({
  progress,
  compact = false,
  position = null,
  activities,
}: {
  progress?: SectionProgressView
  compact?: boolean
  position?: PosicaoNaAula | null
  activities?: readonly AtividadeDaAula[]
}) {
  if (compact) {
    const view = vistaProgressoAula(progress, position, activities)
    if (!view.medivel) return <div className="flex-1" />
    return (
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className="sz-progress flex-1"
          role="progressbar"
          aria-label="Progresso da aula"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(view.percent)}
          aria-valuetext={view.texto}
        >
          <span style={{ width: `${view.percent}%` }} />
        </div>
        {view.numero ? (
          <span
            aria-hidden="true"
            className="shrink-0 whitespace-nowrap font-extrabold text-[0.9375rem] tabular-nums"
          >
            {view.numero}
          </span>
        ) : null}
        <span className="sr-only" aria-live="polite">
          {view.texto}
        </span>
      </div>
    )
  }
  if (!progress) return null
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <ProgressBar value={progress.percent} label="Progresso da aula" />
      <p
        className={`text-sm text-muted-foreground ${compact ? 'hidden sm:block' : ''}`}
        aria-live="polite"
      >
        {progress.completed} de {progress.total} seções concluídas ·{' '}
        {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(progress.percent)}%
      </p>
    </div>
  )
}
