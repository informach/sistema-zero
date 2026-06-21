/**
 * Port (driven) para a "caixa de entrada" de webhooks. Garante o processamento
 * idempotente das notificações do provedor (dedupe por id de evento).
 */
export interface WebhookInbox {
  /**
   * Registra o evento (dedupe) e diz se ele DEVE ser processado. Retorna `true`
   * tanto quando é novo quanto quando já foi registrado mas AINDA NÃO processado
   * (`markProcessed` não rodou — ex.: falha no meio). Retorna `false` se já foi
   * processado com sucesso (duplicado real) ou já está sendo processado por outra
   * concorrência. O token só é "consumido" em `markProcessed` → em falha
   * definitiva, a reentrega continua elegível para novo processamento.
   */
  registerIfNew(input: {
    provider: string
    eventId: string
    eventType: string
    payload: Record<string, unknown>
  }): Promise<boolean>

  markProcessed(provider: string, eventId: string): Promise<void>
}
