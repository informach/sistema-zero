/**
 * Port (driven) para a "caixa de entrada" de webhooks. Garante o processamento
 * idempotente das notificações do provedor (dedupe por id de evento).
 */
export interface WebhookInbox {
  /**
   * Registra o evento se ainda não existir. Retorna `true` se é novo (deve ser
   * processado) ou `false` se já foi recebido antes (ignorar — duplicado).
   */
  registerIfNew(input: {
    provider: string
    eventId: string
    eventType: string
    payload: Record<string, unknown>
  }): Promise<boolean>

  markProcessed(provider: string, eventId: string): Promise<void>
}
