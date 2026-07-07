'use client'

import { useDraggable } from '@dnd-kit/core'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { NetworkChip } from '@/components/shared/network-chip'
import { cn } from '@/lib/cn'
import { formatTimeSp } from '@/lib/dates'
import { canSchedule, STATUS_COLORS } from '@/lib/publications'
import type { PublicationListItemView } from '@/lib/types'

/** Rota do composer da publicação (Lote B3). */
export function publicationHref(pub: PublicationListItemView): string {
  return `/conteudos/${pub.contentId}/publicacoes/${pub.id}`
}

/** Miolo visual do chip (compartilhado entre o draggable e o DragOverlay). */
export function PublicationChipBody({
  pub,
  className,
}: {
  pub: PublicationListItemView
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex w-full items-center gap-1 overflow-hidden rounded-md px-1.5 py-0.5 text-xs',
        STATUS_COLORS[pub.status],
        className,
      )}
      title={pub.contentTitle}
    >
      {pub.scheduledAt ? (
        <span className="shrink-0 font-medium tabular-nums">{formatTimeSp(pub.scheduledAt)}</span>
      ) : null}
      <NetworkChip format={pub.format} showLabel={false} className="shrink-0 border-0 p-0" />
      <span className="truncate">{pub.contentTitle}</span>
    </span>
  )
}

/**
 * Chip draggable do calendário (arrastar reagenda o dia; travado quando o
 * status não permite reagendar). Clique navega pro composer — o
 * `activationConstraint distance 5` do sensor separa o clique do arrasto.
 */
export function PublicationChip({ pub }: { pub: PublicationListItemView }) {
  const router = useRouter()
  const dragDisabled = !canSchedule(pub.status)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: pub.id,
    disabled: dragDisabled,
  })
  // Depois de um arrasto que termina sobre o próprio chip, o browser ainda
  // dispara `click` — este ref o suprime (só navega em clique "limpo").
  const wasDragging = useRef(false)
  useEffect(() => {
    if (isDragging) wasDragging.current = true
  }, [isDragging])

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => {
        if (wasDragging.current) {
          wasDragging.current = false
          return
        }
        router.push(publicationHref(pub))
      }}
      className={cn(
        'block w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'opacity-40',
        !dragDisabled && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <PublicationChipBody pub={pub} />
    </button>
  )
}
