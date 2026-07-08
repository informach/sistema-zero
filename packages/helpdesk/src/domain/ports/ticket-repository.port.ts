import type { Ticket, TicketCategory, TicketStatus } from '../ticket/ticket'

export interface ListTicketsFilter {
  status?: TicketStatus
  category?: TicketCategory
  /** Busca LITERAL em subject/requester (escapeLike no adapter). */
  q?: string
  limit: number
  offset: number
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
}
