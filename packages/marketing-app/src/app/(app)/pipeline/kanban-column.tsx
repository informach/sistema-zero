'use client'

import { useDroppable } from '@dnd-kit/core'
import { Lock } from 'lucide-react'
import { StageBadge } from '@/components/shared/stage-badge'
import { cn } from '@/lib/cn'
import {
  type ContentStage,
  isProductionStage,
  isValidManualMove,
  STAGE_LABELS,
} from '@/lib/pipeline'
import type { ContentSummaryView } from '@/lib/types'
import { ContentCard } from './content-card'

/** Coluna do kanban: droppable nas etapas de produção; derivadas são só leitura. */
export function KanbanColumn({
  stage,
  items,
  countLabel,
  activeStage,
  onOpen,
}: {
  stage: ContentStage
  items: ContentSummaryView[]
  /** "N" ou "N de M" quando o banco tem mais itens do que o board carregou. */
  countLabel: string
  /** Etapa do card em arrasto (highlight só quando o alvo é válido). */
  activeStage: ContentStage | null
  onOpen: (contentId: string) => void
}) {
  const production = isProductionStage(stage)
  const { isOver, setNodeRef } = useDroppable({ id: stage, disabled: !production })
  const validTarget = activeStage !== null && isValidManualMove(activeStage, stage)

  return (
    <section
      ref={setNodeRef}
      aria-label={STAGE_LABELS[stage]}
      className={cn(
        'flex w-[280px] min-w-[280px] shrink-0 flex-col rounded-xl border border-border bg-muted/40 transition-colors',
        isOver && validTarget && 'border-primary/60 bg-primary/5',
      )}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <StageBadge stage={stage} />
        <span className="text-xs tabular-nums text-muted-foreground">{countLabel}</span>
        {production ? null : (
          <span
            className="ml-auto inline-flex items-center text-muted-foreground"
            title="Etapa derivada das publicações"
          >
            <Lock className="size-3.5" aria-hidden />
            <span className="sr-only">Etapa derivada das publicações</span>
          </span>
        )}
      </header>
      <div className="flex max-h-[calc(100dvh-20rem)] min-h-24 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Sem conteúdos aqui</p>
        ) : (
          items.map((content) => <ContentCard key={content.id} content={content} onOpen={onOpen} />)
        )}
      </div>
    </section>
  )
}
