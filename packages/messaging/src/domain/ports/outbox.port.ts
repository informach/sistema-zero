/**
 * Outbox transacional — lado de publicação. A ESCRITA acontece dentro do `save`
 * de cada repositório (mesma transação do agregado), garantindo que o evento só
 * existe se o estado existe (e vice-versa).
 */
export interface OutboxMessage {
  id: string
  aggregateId: string
  eventName: string
  payload: Record<string, unknown>
  attemptCount: number
  createdAt: Date
}

export interface OutboxRepository {
  /**
   * Processa um lote de mensagens pendentes de forma segura para MÚLTIPLAS
   * instâncias: seleciona com `FOR UPDATE SKIP LOCKED` (cada worker pega linhas
   * diferentes), publica cada uma via `publish` e marca como publicada — tudo na
   * mesma transação. Falhas individuais incrementam o contador sem derrubar o lote;
   * ao atingir `maxAttempts`, a mensagem vira `DEAD` (sai da fila → não bloqueia o
   * head-of-line das mensagens novas).
   */
  processPending(
    limit: number,
    maxAttempts: number,
    publish: (message: OutboxMessage) => Promise<void>,
  ): Promise<{ published: number; failed: number; dead: number }>

  /** Retenção: remove eventos terminais (PUBLISHED/DEAD) mais antigos que `olderThan`. */
  cleanup(olderThan: Date): Promise<number>
}

/** Publica um evento de domínio para os assinantes (in-process nesta fatia). */
export interface EventPublisher {
  publish(message: OutboxMessage): Promise<void>
}
