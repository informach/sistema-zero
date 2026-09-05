import type {
  AiClassification,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../ticket/ticket'
import type { TicketSlaFilter } from '../ticket/ticket-sla'
import type { TicketStats } from '../ticket/ticket-stats'

export interface ListTicketsFilter {
  status?: TicketStatus
  category?: TicketCategory
  /** Situação operacional calculada a partir da última mensagem do cliente. */
  sla?: TicketSlaFilter
  assignment?: 'assigned' | 'unassigned'
  /** Fila de trabalho ativa sem responsável; não inclui resolvidos/encerrados. */
  queue?: 'unassigned'
  /** Busca LITERAL em subject/requester (escapeLike no adapter). */
  q?: string
  limit: number
  cursor: TicketQueueCursor | null
}

export interface TicketQueueCursor {
  snapshotAt: Date
  operationalRank: number
  deadlineAt: Date
  lastMessageAt: Date
  id: string
}

/** Resultado da classificação da IA a persistir (guardas: categoria/prioridade). */
export interface AiClassificationUpdate {
  category: TicketCategory
  priority: TicketPriority
  classification: AiClassification
  summary: string
  at: Date
}

/** CAS das escritas assíncronas; `processingAttempt` separa leases da mesma conversa. */
export interface AiWriteGuard {
  generation: number
  /** Presente no worker; ausente nas ações síncronas disparadas pela equipe. */
  processingAttempt?: number
}

export interface TicketRepository {
  create(ticket: Ticket): Promise<void>
  byId(id: string): Promise<Ticket | null>
  /**
   * Update com concorrência otimista: confere `version` e incrementa; 0 linhas
   * atualizadas → false (o chamador traduz em CONCURRENCY_CONFLICT).
   */
  update(ticket: Ticket, expectedVersion: number): Promise<boolean>
  list(filter: ListTicketsFilter, now: Date): Promise<{ items: Ticket[]; total: number }>
  /** Agregados do painel (contagens por status + resolvidos + série). */
  stats(now: Date): Promise<TicketStats>

  // ── Fila de IA (ai_status/ai_next_attempt_at; sem tocar em `version`) ──
  /**
   * Claim SKIP LOCKED de um ticket pendente ou com lease `processing` vencido
   * → `processing` + novo lease. O segundo caso recupera crash do worker.
   */
  claimAiDue(leaseMs: number, at: Date): Promise<Ticket | null>
  /**
   * Persiste a classificação: sempre grava summary/classification; a CATEGORIA só
   * quando não foi escolhida à mão (`category_manual`), a PRIORIDADE só quando
   * ainda é nula (preserva a escolha humana). NÃO mexe em `version`.
   */
  applyClassification(
    id: string,
    guard: AiWriteGuard,
    update: AiClassificationUpdate,
  ): Promise<boolean>
  /** Persiste o rascunho da IA (ai_draft/ai_draft_at, ai_draft_edited=false). */
  applyDraft(id: string, guard: AiWriteGuard, draft: string, at: Date): Promise<boolean>
  /** ai_status='done', zera erro/tentativas. */
  markAiDone(id: string, guard: AiWriteGuard, at: Date): Promise<boolean>
  /** Falha transitória: volta a `pending` com backoff + erro (attempts já bumpado no claim). */
  scheduleAiRetry(
    id: string,
    guard: AiWriteGuard,
    nextAt: Date,
    error: string,
    at: Date,
  ): Promise<boolean>
  /** Teto de tentativas: `failed` (o ticket segue 100% usável sem IA). */
  markAiFailed(id: string, guard: AiWriteGuard, error: string, at: Date): Promise<boolean>
}
