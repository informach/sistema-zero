export interface MarkReceivedInput {
  provider: string
  providerEventId: string
  eventType: string
  messageId: string | null
  payload: Record<string, unknown>
}

/**
 * Caixa de entrada de webhooks (dedupe). O par `(provider, providerEventId)` é
 * único → uma reentrega do mesmo evento não é reprocessada.
 */
export interface WebhookInboxRepository {
  /** Registra o evento. Retorna `true` se é NOVO (deve processar); `false` se duplicado. */
  markReceived(input: MarkReceivedInput): Promise<boolean>
  /** Retenção: remove eventos mais antigos que `olderThan`. */
  cleanup(olderThan: Date): Promise<number>
}
