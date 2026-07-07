'use client'

import { useDroppable } from '@dnd-kit/core'
import type { CalendarCell } from '@/lib/calendar'
import { dayOfMonth, WEEKDAY_LABELS } from '@/lib/calendar'
import { cn } from '@/lib/cn'
import type { PublicationListItemView } from '@/lib/types'
import { PublicationChip } from './publication-chip'

const MAX_CHIPS = 3

/** Célula do mês: droppable (id = dayKey) + até 3 chips e o botão "+N". */
function DayCell({
  cell,
  pubs,
  onShowAll,
}: {
  cell: CalendarCell
  pubs: PublicationListItemView[]
  onShowAll: (dayKey: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cell.dayKey })
  const overflow = pubs.length - MAX_CHIPS

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-24 flex-col gap-1 border-b border-r border-border bg-card p-1.5',
        !cell.inMonth && 'bg-muted/30',
        isOver && 'bg-primary/10 ring-2 ring-inset ring-primary/60',
      )}
    >
      <span
        className={cn(
          'inline-flex size-6 items-center justify-center rounded-full text-xs font-medium',
          !cell.inMonth && 'text-muted-foreground/60',
          cell.isToday && 'bg-primary text-primary-foreground',
        )}
      >
        {dayOfMonth(cell.dayKey)}
      </span>
      {pubs.slice(0, MAX_CHIPS).map((pub) => (
        <PublicationChip key={pub.id} pub={pub} />
      ))}
      {overflow > 0 ? (
        <button
          type="button"
          onClick={() => onShowAll(cell.dayKey)}
          className="rounded-md px-1.5 py-0.5 text-left text-xs font-medium text-primary hover:bg-muted"
        >
          +{overflow}
        </button>
      ) : null}
    </div>
  )
}

/** Grade mensal 7×6 (CSS grid) com header dom..sáb. */
export function MonthGrid({
  cells,
  pubsByDay,
  onShowAll,
}: {
  cells: CalendarCell[]
  pubsByDay: Map<string, PublicationListItemView[]>
  onShowAll: (dayKey: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[42rem] overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="border-b border-r border-border bg-muted/50 px-2 py-1.5 text-center text-xs font-medium text-muted-foreground last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0 [&>*:nth-last-child(-n+7)]:border-b-0">
          {cells.map((cell) => (
            <DayCell
              key={cell.dayKey}
              cell={cell}
              pubs={pubsByDay.get(cell.dayKey) ?? []}
              onShowAll={onShowAll}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
