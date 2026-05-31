/**
 * Port (driven) para a "caixa de entrada" de webhooks. Garante o processamento
 * idempotente das notificações do provedor (dedupe por id de evento).
 */
export interface WebhookInbox {
  /**
   * Registra o evento (dedupe) e diz se ele DEVE ser processado. Retorna `true`
   * tanto quando é novo quanto quando já foi registrado mas AINDA NÃO processado
   * (`markProcessed` não rodou — ex.: falha no meio). Retorna `false` apenas se já
   * foi processado com sucesso (duplicado real). O token só é "consumido" em
   * `markProcessed` → uma falha no meio NÃO descarta as reentregas seguintes.
   */
  registerIfNew(input: {
    provider: string
    eventId: string
    eventType: string
    payload: Record<string, unknown>
  }): Promise<boolean>

  markProcessed(provider: string, eventId: string): Promise<void>
}
