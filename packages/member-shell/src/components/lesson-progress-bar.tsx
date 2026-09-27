'use client'

import type { SectionProgressView } from '@sistemazero/core/learning'
import { ProgressBar } from './progress-bar'

export function LessonProgressBar({
  progress,
  compact = false,
}: {
  progress?: SectionProgressView
  compact?: boolean
}) {
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
