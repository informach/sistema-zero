import type {
  AiClassification,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../ticket/ticket'

export interface ListTicketsFilter {
  status?: TicketStatus
  category?: TicketCategory
  /** Busca LITERAL em subject/requester (escapeLike no adapter). */
  q?: string
  limit: number
  offset: number
}

/** Resultado da classificação da IA a persistir (guardas: categoria/prioridade). */
export interface AiClassificationUpdate {
  category: TicketCategory
  priority: TicketPriority
  classification: AiClassification
  summary: string
  at: Date
}

export interface TicketRepository {
  create(ticket: Ticket): Promise<void>
  byId(id: string): Promise<Ticket | null>
  byGmailThreadId(threadId: string): Promise<Ticket | null>
  /**
   * Update com concorrência otimista: confere `version` e incrementa; 0 linhas
   * atualizadas → false (o chamador traduz em CONCURRENCY_CONFLICT).
   */
  update(ticket: Ticket, expectedVersion: number): Promise<boolean>
  /**
   * Reserva ATÔMICA do envio (guard anti-double-send): bump de `version`
   * condicionado ao valor esperado. `false` = outra resposta venceu a corrida
   * (duplo-clique/stale) → 409 ANTES de mandar qualquer e-mail.
   */
  claimForReply(id: string, expectedVersion: number, at: Date): Promise<boolean>
  list(filter: ListTicketsFilter): Promise<{ items: Ticket[]; total: number }>

  // ── Fila de IA (ai_status/ai_next_attempt_at; sem tocar em `version`) ──
  /** Claim SKIP LOCKED de um ticket `pending` vencido → `processing` + lease. */
  claimAiDue(leaseMs: number, at: Date): Promise<Ticket | null>
  /**
   * Persiste a classificação: sempre grava summary/classification; a CATEGORIA só
   * quando não foi escolhida à mão (`category_manual`), a PRIORIDADE só quando
   * ainda é nula (preserva a escolha humana). NÃO mexe em `version`.
   */
  applyClassification(id: string, update: AiClassificationUpdate): Promise<void>
  /** Persiste o rascunho da IA (ai_draft/ai_draft_at, ai_draft_edited=false). */
  applyDraft(id: string, draft: string, at: Date): Promise<void>
  /** ai_status='done', zera erro/tentativas. */
  markAiDone(id: string, at: Date): Promise<void>
  /** Falha transitória: volta a `pending` com backoff + erro (attempts já bumpado no claim). */
  scheduleAiRetry(id: string, nextAt: Date, error: string, at: Date): Promise<void>
  /** Teto de tentativas: `failed` (o ticket segue 100% usável sem IA). */
  markAiFailed(id: string, error: string, at: Date): Promise<void>

  // ── Auto-resposta (guard de fase `auto_reply_state`) ──
  /**
   * Reserva ATÔMICA da auto-resposta: `none` → `sending`. `false` = já respondida
   * / em andamento / abortada (nunca envia duas vezes). É o guard de fase.
   */
  claimAutoReply(id: string, at: Date): Promise<boolean>
  /**
   * Fecha a auto-resposta: `sending` → `sent` (+ auto_replied_at) ou `aborted`
   * (falha no envio; NUNCA re-tenta). Grava o motivo.
   */
  finishAutoReply(
    id: string,
    state: 'sent' | 'aborted',
    reason: string | null,
    at: Date,
  ): Promise<void>
  /** Motivo de NÃO ter auto-respondido (visível na UI); não mexe no state. */
  setAutoReplyReason(id: string, reason: string | null, at: Date): Promise<void>
}
