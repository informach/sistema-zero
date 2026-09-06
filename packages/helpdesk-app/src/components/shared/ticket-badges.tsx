import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TRIAGE_COLORS,
  TRIAGE_LABELS,
} from '@/lib/categories'
import { cn } from '@/lib/cn'
import { SLA_STATE_COLORS, SLA_STATE_LABELS } from '@/lib/sla'
import type {
  TicketCategory,
  TicketPriority,
  TicketSlaView,
  TicketSource,
  TicketStatus,
  TriageKind,
} from '@/lib/types'

const BASE =
  'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium'

/** Chip do status do ticket (cores/rótulos da lib pura — padrão do marketing-app). */
export function TicketStatusBadge({
  status,
  className,
}: {
  status: TicketStatus
  className?: string
}) {
  return <span className={cn(BASE, STATUS_COLORS[status], className)}>{STATUS_LABELS[status]}</span>
}

/** Chip da categoria do ticket (nulo = sem badge; a IA ainda não classificou). */
export function TicketCategoryBadge({
  category,
  className,
}: {
  category: TicketCategory | null
  className?: string
}) {
  if (!category) return null
  return (
    <span className={cn(BASE, CATEGORY_COLORS[category], className)}>
      {CATEGORY_LABELS[category]}
    </span>
  )
}

/** Chip da prioridade do ticket (nulo = sem badge). */
export function TicketPriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority | null
  className?: string
}) {
  if (!priority) return null
  return (
    <span className={cn(BASE, PRIORITY_COLORS[priority], className)}>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

/** Situação operacional da meta de primeira resposta; `null` significa relógio pausado. */
export function TicketSlaBadge({
  sla,
  className,
}: {
  sla: TicketSlaView | null
  className?: string
}) {
  if (!sla) return null
  return (
    <span className={cn(BASE, SLA_STATE_COLORS[sla.state], className)}>
      {SLA_STATE_LABELS[sla.state]}
    </span>
  )
}

/** Veredito da triagem; `human` (atendimento) não ganha chip, só o que está fora da fila. */
export function TicketTriageBadge({
  triage,
  className,
}: {
  triage: TriageKind
  className?: string
}) {
  if (triage === 'human') return null
  return <span className={cn(BASE, TRIAGE_COLORS[triage], className)}>{TRIAGE_LABELS[triage]}</span>
}

/** Canal de entrada visível para a equipe, sem diferenciar o tratamento da fila. */
export function TicketSourceBadge({
  source,
  className,
}: {
  source: TicketSource
  className?: string
}) {
  return (
    <span className={cn(BASE, 'bg-muted text-muted-foreground', className)}>
      {source === 'portal' ? 'Portal' : 'E-mail'}
    </span>
  )
}
