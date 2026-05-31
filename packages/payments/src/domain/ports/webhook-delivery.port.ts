/**
 * Fila de entrega de webhooks de saída (notificar os consumidores quando um
 * pagamento muda de estado). Entrega **at-least-once** com retry/backoff — os
 * consumidores devem deduplicar (ex.: pelo `paymentId` no payload).
 */
export interface WebhookDelivery {
  id: string
  consumerId: string
  eventName: string
  payload: Record<string, unknown>
  attempts: number
}

export interface WebhookDeliveryRepository {
  /**
   * Enfileira uma nova entrega (status PENDING, pronta para envio imediato). É
   * **idempotente** por `(consumerId, eventName, dedupKey)`: republicações do
   * outbox (ex.: rollback do lote) não geram entregas duplicadas.
   */
  enqueue(input: {
    consumerId: string
    eventName: string
    /** Chave de dedupe da entrega (normalmente o paymentId / aggregateId). */
    dedupKey: string
    payload: Record<string, unknown>
  }): Promise<void>

  /**
   * Reivindica entregas vencidas para processamento, com `FOR UPDATE SKIP LOCKED`
   * + lease (empurra `next_attempt_at` para o futuro) — seguro para múltiplas
   * réplicas, sem segurar lock durante o POST HTTP (lento).
   */
  claimDue(limit: number, leaseMs: number): Promise<WebhookDelivery[]>

  markSucceeded(id: string, statusCode: number): Promise<void>
  reschedule(id: string, attempts: number, nextAttemptAt: Date, error: string, statusCode?: number): Promise<void>
  markDead(id: string, error: string): Promise<void>
}
