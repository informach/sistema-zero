import type { TriageKind } from '@sistemazero/helpdesk-contracts'
import { isTerminalTicketStatus, type Ticket } from './ticket'

/**
 * Transições de triagem do TICKET (puras, mutam o objeto). São a fonte única da
 * regra que o SQL da ingestão replica e que o PATCH, o fake e o backfill usam.
 *
 * Invariante: `triage = 'human'` se e só se o ticket é do portal OU alguma
 * mensagem inbound dele é humana OU a equipe decidiu (`manual:*`).
 */

/** Prefixo das decisões humanas: a ingestão e o backfill nunca as desfazem. */
export const MANUAL_TRIAGE_RULE_PREFIX = 'manual:'
export const MANUAL_PROMOTED_RULE = 'manual:promoted'
export const MANUAL_DEMOTED_RULE = 'manual:demoted'
/** Promoção automática: chegou mensagem humana num ticket triado. */
export const PROMOTED_BY_INBOUND_RULE = 'promoted:inbound'

export function isManualTriageRule(rule: string | null): boolean {
  return rule?.startsWith(MANUAL_TRIAGE_RULE_PREFIX) ?? false
}

/** A ingestão e o backfill só re-triam o que não foi decidido à mão. */
export function canRetriage(ticket: Pick<Ticket, 'triageRule'>): boolean {
  return !isManualTriageRule(ticket.triageRule)
}

export interface PromoteTicketInput {
  rule: string
  at: Date
  /** Instante do último inbound HUMANO (nunca `firstMessageAt`, que pode ser nosso). */
  lastHumanInboundAt: Date | null
  aiEnabled: boolean
}

/**
 * "É atendimento": volta para a fila como novo, com SLA a partir do último inbound
 * humano e a IA re-armada numa geração nova (senão um worker antigo grava em cima).
 */
export function promoteTicket(ticket: Ticket, input: PromoteTicketInput): void {
  ticket.triage = 'human'
  ticket.triageRule = input.rule
  ticket.triagedAt = null
  ticket.status = 'new'
  ticket.resolvedAt = null
  ticket.lastInboundAt = input.lastHumanInboundAt
  ticket.aiGeneration += 1
  ticket.aiSummary = null
  ticket.aiSummaryAt = null
  ticket.aiDraft = null
  ticket.aiDraftAt = null
  ticket.aiDraftEdited = false
  ticket.aiClassification = null
  ticket.aiStatus = input.aiEnabled ? 'pending' : 'skipped'
  ticket.aiNextAttemptAt = input.aiEnabled ? input.at : null
  ticket.aiAttempts = 0
  ticket.aiLastError = null
  ticket.updatedAt = input.at
}

export interface DemoteTicketInput {
  kind: Exclude<TriageKind, 'human'>
  rule: string
  at: Date
}

/**
 * "Não é atendimento": sai da fila e do painel. `resolvedAt` só quando ainda não
 * era terminal (preserva o instante de um encerramento anterior); o SLA fica
 * inerte por construção (`closed`) e a IA não roda em ticket triado.
 */
export function demoteTicket(ticket: Ticket, input: DemoteTicketInput): void {
  ticket.triage = input.kind
  ticket.triageRule = input.rule
  ticket.triagedAt = input.at
  if (!isTerminalTicketStatus(ticket.status)) ticket.resolvedAt = input.at
  ticket.status = 'closed'
  ticket.aiStatus = 'skipped'
  ticket.aiNextAttemptAt = null
  ticket.updatedAt = input.at
}
