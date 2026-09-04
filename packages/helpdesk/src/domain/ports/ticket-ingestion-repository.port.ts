import type { Ticket } from '../ticket/ticket'
import type { TicketMessage } from '../ticket/ticket-message'

/** Mensagem vinda da Gmail API; ao contrário de notas, sempre tem ID global. */
export interface IngestedGmailMessage extends TicketMessage {
  gmailMessageId: string
}

export interface TicketIngestionInput {
  /** Ticket candidato; é criado somente quando a thread ainda não existe. */
  ticket: Ticket
  /** Mensagem Gmail já parseada. O adapter troca ticketId quando a thread existe. */
  message: IngestedGmailMessage
  /** Direção determinada pela caixa conectada, nunca por dado do cliente. */
  direction: 'inbound' | 'outbound'
  aiEnabled: boolean
  at: Date
}

export interface TicketIngestionResult {
  status: 'created' | 'appended' | 'duplicate'
  ticketId?: string
}

/**
 * Fronteira transacional da ingestão Gmail. Dedupe, criação/append da mensagem
 * e bookkeeping do ticket são uma operação indivisível; separar essas escritas
 * permite que um crash deixe um ticket sem mensagem ou contadores incorretos.
 */
export interface TicketIngestionRepository {
  ingest(input: TicketIngestionInput): Promise<TicketIngestionResult>
}
