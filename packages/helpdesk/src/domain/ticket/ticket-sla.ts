import type { Ticket, TicketPriority } from './ticket'

/** Metas internas de primeira resposta. Não são uma promessa feita ao cliente. */
export const SLA_TARGET_MINUTES: Record<TicketPriority, number> = {
  alta: 4 * 60,
  normal: 12 * 60,
  baixa: 24 * 60,
}

/** O ticket entra em risco quando sobra no máximo um quarto da meta. */
export const SLA_RISK_REMAINING_RATIO = 0.25
export const SLA_RISK_START_RATIO = 1 - SLA_RISK_REMAINING_RATIO

export type TicketSlaState = 'on_track' | 'at_risk' | 'breached'
export type TicketSlaFilter = 'attention' | 'at_risk' | 'breached'

export interface TicketSla {
  state: TicketSlaState
  priority: TicketPriority
  targetMinutes: number
  deadlineAt: Date
  /** Negativo quando já passou da meta. */
  remainingMinutes: number
}

function isSlaActive(ticket: Ticket): boolean {
  return ticket.status === 'new' || ticket.status === 'open'
}

/**
 * Calcula a meta da última solicitação do cliente. Estados aguardando o cliente
 * e encerrados pausam o relógio ao retornarem `null`.
 */
export function ticketSla(ticket: Ticket, now: Date): TicketSla | null {
  if (!isSlaActive(ticket)) return null

  const priority = ticket.priority ?? 'normal'
  const targetMinutes = SLA_TARGET_MINUTES[priority]
  const startedAt = ticket.lastInboundAt ?? ticket.firstMessageAt
  const deadlineAt = new Date(startedAt.getTime() + targetMinutes * 60_000)
  const remainingMs = deadlineAt.getTime() - now.getTime()
  const remainingMinutes = Math.floor(remainingMs / 60_000)

  return {
    state:
      remainingMs <= 0
        ? 'breached'
        : remainingMs <= targetMinutes * SLA_RISK_REMAINING_RATIO * 60_000
          ? 'at_risk'
          : 'on_track',
    priority,
    targetMinutes,
    deadlineAt,
    remainingMinutes,
  }
}

export function matchesSlaFilter(sla: TicketSla | null, filter: TicketSlaFilter): boolean {
  if (!sla) return false
  if (filter === 'attention') return sla.state === 'at_risk' || sla.state === 'breached'
  return sla.state === filter
}

/** Ordem da fila: estourados, em risco, regulares e, por último, pausados. */
export function ticketSlaRank(ticket: Ticket, now: Date): number {
  const sla = ticketSla(ticket, now)
  if (!sla) return 3
  if (sla.state === 'breached') return 0
  if (sla.state === 'at_risk') return 1
  return 2
}
