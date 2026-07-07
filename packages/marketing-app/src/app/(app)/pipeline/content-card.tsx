'use client'

import { useDraggable } from '@dnd-kit/core'
import { Progress } from '@sistemazero/ui/progress'
import { MessageSquare } from 'lucide-react'
import { ContentTypeBadge } from '@/components/shared/content-type-badge'
import { NetworkChip } from '@/components/shared/network-chip'
import { cn } from '@/lib/cn'
import { formatDateOnly } from '@/lib/format'
import { PUBLICATION_FORMATS, type PublicationFormat } from '@/lib/networks'
import { isProductionStage } from '@/lib/pipeline'
import type { ContentSummaryView } from '@/lib/types'

function isPublicationFormat(value: string): value is PublicationFormat {
  return (PUBLICATION_FORMATS as readonly string[]).includes(value)
}

/** Formatos das publicações do card, dedupados e restritos ao vocabulário conhecido. */
function cardFormats(content: ContentSummaryView): PublicationFormat[] {
  return [...new Set(content.publicationFormats)].filter(isPublicationFormat)
}

function CardBody({ content }: { content: ContentSummaryView }) {
  // dueDate é fim do dia em SP: vencido quando o agora já passou desse instante.
  const overdue = content.dueDate !== null && new Date(content.dueDate).getTime() < Date.now()
  const formats = cardFormats(content)
  return (
    <>
      <p className="line-clamp-2 text-sm font-medium leading-snug">{content.title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <ContentTypeBadge contentType={content.contentType} />
        {formats.map((format) => (
          <NetworkChip key={format} format={format} showLabel={false} />
        ))}
      </div>
      {content.ownerName || content.dueDate ? (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{content.ownerName}</span>
          {content.dueDate ? (
            <span
              className={cn('whitespace-nowrap', overdue && 'font-medium text-destructive')}
              title={overdue ? 'Prazo vencido' : undefined}
            >
              {formatDateOnly(content.dueDate)}
            </span>
          ) : null}
        </div>
      ) : null}
      {content.checklistTotal > 0 || content.commentCount > 0 ? (
        <div className="flex items-center gap-2">
          {content.checklistTotal > 0 ? (
            <>
              <Progress
                value={content.checklistDone / content.checklistTotal}
                className="h-1 flex-1"
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {content.checklistDone}/{content.checklistTotal}
              </span>
            </>
          ) : null}
          {content.commentCount > 0 ? (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="size-3" aria-hidden />
              {content.commentCount}
              <span className="sr-only">comentários</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

/**
 * Card do kanban: arrastável nas etapas de produção (o PointerSensor com
 * distance 5 separa clique de arrasto) e clicável para abrir o detalhe.
 */
export function ContentCard({
  content,
  onOpen,
}: {
  content: ContentSummaryView
  onOpen: (contentId: string) => void
}) {
  const draggable = isProductionStage(content.stage)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: content.id,
    disabled: !draggable,
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Abrir conteúdo ${content.title}`}
      onClick={() => onOpen(content.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(content.id)
        }
      }}
      className={cn(
        'cursor-pointer space-y-2 rounded-lg border border-border bg-card p-3 shadow-sm outline-none transition-colors',
        'hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring',
        draggable && 'touch-none',
        isDragging && 'opacity-40',
      )}
    >
      <CardBody content={content} />
    </div>
  )
}

/** Versão simplificada do card p/ o DragOverlay (fantasma que segue o cursor). */
export function ContentCardGhost({ content }: { content: ContentSummaryView }) {
  return (
    <div className="w-[264px] space-y-2 rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="line-clamp-2 text-sm font-medium leading-snug">{content.title}</p>
      <ContentTypeBadge contentType={content.contentType} />
    </div>
  )
}
