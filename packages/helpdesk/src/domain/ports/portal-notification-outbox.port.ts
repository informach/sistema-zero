import type { SendEmailInput } from './messaging-gateway.port'

export type PortalNotificationStatus = 'pending' | 'processing' | 'sent'

/** Snapshot completo: retries não dependem de ticket, mensagem ou configuração mutáveis. */
export interface PortalNotificationOutboxItem {
  id: string
  ticketId: string
  messageId: string
  payload: SendEmailInput
  status: PortalNotificationStatus
  attempts: number
  /** Próxima tentativa quando o item está pending. */
  nextAttemptAt: Date
  /** Vencimento do claim atual; null fora de processing. */
  leaseExpiresAt: Date | null
  lastError: string | null
  sentAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PortalNotificationOutboxRepository {
  /** Claim atômico; também recupera `processing` com lease vencido. */
  claimDue(leaseMs: number, at: Date): Promise<PortalNotificationOutboxItem | null>
  /** CAS pelo número da tentativa impede um worker vencido de alterar o claim atual. */
  markSent(id: string, attempt: number, at: Date): Promise<boolean>
  /** Volta a pending sem teto de tentativas; a idempotência fica no `messageId`. */
  scheduleRetry(
    id: string,
    attempt: number,
    nextAt: Date,
    error: string,
    at: Date,
  ): Promise<boolean>
}
