/**
 * Rótulos e cores de status/categoria/prioridade dos tickets. PURO
 * (unit-testado) — ESPELHO dos enums do @sistemazero/helpdesk
 * (`interfaces/http/dtos.ts` e o domínio de ticket); mudou lá, mude aqui.
 */

import type { TicketCategory, TicketPriority, TicketStatus } from './types'

// ── Status ──

export const TICKET_STATUSES = [
  'new',
  'open',
  'waiting',
  'resolved',
  'closed',
] as const satisfies readonly TicketStatus[]

/** Rótulos PT por status (chips de filtro e badges da caixa de entrada). */
export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'Novo',
  open: 'Aberto',
  waiting: 'Aguardando resposta',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

/** Classes de cor por status (tokens do tema — mesmo padrão dos badges do marketing-app). */
export const STATUS_COLORS: Record<TicketStatus, string> = {
  new: 'bg-primary/15 text-primary',
  open: 'bg-chart-1/15 text-chart-1',
  waiting: 'bg-chart-5/15 text-chart-5',
  resolved: 'bg-success/15 text-success-foreground',
  closed: 'bg-muted text-muted-foreground',
}

// ── Categorias ──

export const TICKET_CATEGORIES = [
  'curso_acesso',
  'problema_tecnico',
  'studio',
  'pagamento_reembolso',
  'parceria_comercial',
  'outro',
] as const satisfies readonly TicketCategory[]

/** Rótulos PT por categoria (badges e checkboxes da auto-resposta). */
export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  curso_acesso: 'Curso e acesso',
  problema_tecnico: 'Problema técnico',
  studio: 'Studio',
  pagamento_reembolso: 'Pagamento e reembolso',
  parceria_comercial: 'Parceria e comercial',
  outro: 'Outro',
}

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

export const TICKET_PRIORITIES = [
  'baixa',
  'normal',
  'alta',
] as const satisfies readonly TicketPriority[]

/** Rótulos PT por prioridade. */
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
}

/** Classes de cor por prioridade (alta salta aos olhos; o resto fica discreto). */
export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  baixa: 'bg-muted text-muted-foreground',
  normal: 'bg-chart-1/15 text-chart-1',
  alta: 'bg-destructive/15 text-destructive',
}
