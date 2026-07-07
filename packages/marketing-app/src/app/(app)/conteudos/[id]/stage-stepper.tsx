'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  type ContentStage,
  isProductionStage,
  PRODUCTION_STAGES,
  type ProductionStage,
  STAGE_LABELS,
} from '@/lib/pipeline'

/**
 * Stepper horizontal das 7 etapas de produção. Clique em outra etapa move o
 * conteúdo (otimista, no pai). Em `scheduled`/`published` o stepper trava:
 * essas etapas são DERIVADAS das publicações (o backend sincroniza).
 */
export function StageStepper({
  stage,
  onMove,
}: {
  stage: ContentStage
  onMove: (to: ProductionStage) => void
}) {
  const derived = stage === 'scheduled' || stage === 'published'
  const locked = !isProductionStage(stage)
  const currentIndex = isProductionStage(stage)
    ? PRODUCTION_STAGES.indexOf(stage)
    : derived
      ? PRODUCTION_STAGES.length
      : -1

  return (
    <div className="space-y-3">
      <div className="flex items-start overflow-x-auto pb-1">
        {PRODUCTION_STAGES.map((step, index) => {
          const isCurrent = step === stage
          const isDone = index < currentIndex
          return (
            <div key={step} className="relative flex min-w-16 flex-1 flex-col items-center gap-1.5">
              {index > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-[calc(-50%+0.875rem)] right-[calc(50%+0.875rem)] top-3 h-0.5 -translate-y-1/2',
                    index <= currentIndex ? 'bg-primary' : 'bg-border',
                  )}
                />
              ) : null}
              <button
                type="button"
                disabled={locked || isCurrent}
                onClick={() => onMove(step)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={
                  isCurrent
                    ? `Etapa atual: ${STAGE_LABELS[step]}`
                    : `Mover para ${STAGE_LABELS[step]}`
                }
                title={locked || isCurrent ? undefined : `Mover para ${STAGE_LABELS[step]}`}
                className={cn(
                  'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-all',
                  isDone || isCurrent
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground',
                  isCurrent && 'ring-2 ring-primary/30',
                  !locked && !isCurrent && 'hover:ring-2 hover:ring-primary/40',
                  locked && 'cursor-not-allowed',
                )}
              >
                {isDone ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </button>
              <span
                className={cn(
                  'px-1 text-center text-xs leading-tight',
                  isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {STAGE_LABELS[step]}
              </span>
            </div>
          )
        })}
      </div>
      {derived ? (
        <p
          role="status"
          className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"
        >
          Etapa derivada das publicações. Cancele ou conclua as publicações para voltar a mover na
          mão.
        </p>
      ) : null}
    </div>
  )
}
