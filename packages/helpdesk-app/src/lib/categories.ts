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
  TRIAGE_HEADER_RULES,
  TRIAGE_KINDS,
  TRIAGE_LABELS,
  type TriageKind,
} from '@sistemazero/helpdesk-contracts'

export {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TRIAGE_HEADER_RULES,
  TRIAGE_KINDS,
  TRIAGE_LABELS,
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

// ── Triagem ──

/**
 * Classes de cor por veredito da triagem. `human` nunca vira badge (o chip só
 * aparece fora da fila), mas o mapa é completo para o teste de conformidade.
 */
export const TRIAGE_COLORS: Record<TriageKind, string> = {
  human: 'bg-muted text-muted-foreground',
  auto_reply: 'bg-chart-5/15 text-chart-5',
  bounce: 'bg-destructive/15 text-destructive',
  bulk: 'bg-chart-3/15 text-chart-3',
  system: 'bg-chart-4/15 text-chart-4',
  internal: 'bg-muted text-muted-foreground',
}

/** Regras de provenância (decisão humana e promoção automática), fora das de cabeçalho. */
const TRIAGE_PROVENANCE_RULES: Record<string, string> = {
  'manual:promoted': 'Marcado como atendimento pela equipe.',
  'manual:demoted': 'Marcado como automático pela equipe.',
  'promoted:inbound': 'Voltou para a fila quando chegou uma mensagem de pessoa.',
}

/** Texto curto que explica a regra que decidiu (para a equipe entender o porquê). */
export function triageRuleDescription(rule: string | null): string | null {
  if (!rule) return null
  const provenance = TRIAGE_PROVENANCE_RULES[rule]
  if (provenance) return provenance
  return TRIAGE_HEADER_RULES.find((entry) => entry.rule === rule)?.description ?? null
}
