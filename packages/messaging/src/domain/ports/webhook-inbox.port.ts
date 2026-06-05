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
 *
 * ⚠️ Ordem importa: `markReceived` só deve ser chamado DEPOIS de aplicar o
 * evento — marcar antes faz uma falha no meio "consumir" o evento (a reentrega
 * do provedor cai no dedupe e o status se perde). `alreadyReceived` é o gate de
 * leitura na entrada.
 */
export interface WebhookInboxRepository {
  /** O evento já foi processado? (gate de leitura — não grava nada). */
  alreadyReceived(provider: string, providerEventId: string): Promise<boolean>
  /** Registra o evento PROCESSADO. Retorna `true` se é novo; `false` se duplicado. */
  markReceived(input: MarkReceivedInput): Promise<boolean>
  /** Retenção: remove eventos mais antigos que `olderThan`. */
  cleanup(olderThan: Date): Promise<number>
}
