'use client'

import { useDroppable } from '@dnd-kit/core'
import type { CalendarCell } from '@/lib/calendar'
import { dayOfMonth, WEEKDAY_LABELS } from '@/lib/calendar'
import { cn } from '@/lib/cn'
import type { PublicationListItemView } from '@/lib/types'
import { PublicationChip } from './publication-chip'

/** Coluna da semana: droppable (id = dayKey) com os chips em ordem de horário. */
function DayColumn({
  cell,
  weekday,
  pubs,
}: {
  cell: CalendarCell
  weekday: string
  pubs: PublicationListItemView[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cell.dayKey })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-96 flex-col gap-1.5 border-r border-border bg-card p-2 last:border-r-0',
        isOver && 'bg-primary/10 ring-2 ring-inset ring-primary/60',
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-border pb-1.5">
        <span className="text-xs text-muted-foreground">{weekday}</span>
        <span
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-full text-xs font-medium',
            cell.isToday && 'bg-primary text-primary-foreground',
          )}
        >
          {dayOfMonth(cell.dayKey)}
        </span>
      </div>
      {pubs.map((pub) => (
        <PublicationChip key={pub.id} pub={pub} />
      ))}
    </div>
  )
}

/** Visão semanal: 7 colunas altas, chips com a hora visível. */
export function WeekView({
  cells,
  pubsByDay,
}: {
  cells: CalendarCell[]
  pubsByDay: Map<string, PublicationListItemView[]>
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[42rem] grid-cols-7 overflow-hidden rounded-xl border border-border">
        {cells.map((cell, index) => (
          <DayColumn
            key={cell.dayKey}
            cell={cell}
            weekday={WEEKDAY_LABELS[index % 7] ?? ''}
            pubs={pubsByDay.get(cell.dayKey) ?? []}
          />
        ))}
      </div>
    </div>
  )
}
