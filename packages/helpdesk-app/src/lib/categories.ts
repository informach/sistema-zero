/**
 * Rótulos semânticos vêm do contrato compartilhado; somente as cores do
 * console são definidas aqui. Módulo puro e coberto por testes.
 */

import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@sistemazero/helpdesk-contracts'

export {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
}

// ── Status ──

/** Classes de cor por status (tokens do tema — mesmo padrão dos badges do marketing-app). */
export const STATUS_COLORS: Record<TicketStatus, string> = {
  new: 'bg-primary/15 text-primary',
  open: 'bg-chart-1/15 text-chart-1',
  waiting: 'bg-chart-5/15 text-chart-5',
  resolved: 'bg-success/15 text-success-foreground',
  closed: 'bg-muted text-muted-foreground',
}

// ── Categorias ──

/** Classes de cor por categoria (tokens do tema). */
export const CATEGORY_COLORS: Record<TicketCategory, string> = {
  curso_acesso: 'bg-chart-2/15 text-chart-2',
  problema_tecnico: 'bg-chart-4/15 text-chart-4',
  studio: 'bg-primary/15 text-primary',
  pagamento_reembolso: 'bg-chart-3/15 text-chart-3',
  parceria_comercial: 'bg-chart-1/15 text-chart-1',
  outro: 'bg-muted text-muted-foreground',
}

// ── Prioridades ──

/** Classes de cor por prioridade (alta salta aos olhos; o resto fica discreto). */
export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  baixa: 'bg-muted text-muted-foreground',
  normal: 'bg-chart-1/15 text-chart-1',
  alta: 'bg-destructive/15 text-destructive',
}
