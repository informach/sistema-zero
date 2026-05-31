/**
 * Port (driven) para idempotência de operações de escrita (`POST /payments`).
 * Garante que reenvios da mesma `Idempotency-Key` não disparem efeitos colaterais
 * duplicados (ex.: cobrar duas vezes), retornando a resposta original.
 *
 * A chave é **escopada por consumidor**: dois consumidores distintos podem usar o
 * mesmo valor de `Idempotency-Key` sem colidir nem vazar a resposta um do outro.
 */
export interface IdempotencyRecord {
  consumerId: string
  key: string
  requestHash: string
  state: 'IN_FLIGHT' | 'COMPLETED'
  responseStatus: number | null
  responseBody: unknown
}

export interface IdempotencyStore {
  /**
   * Tenta reservar a chave `(consumerId, key)` atomicamente.
   * - Retorna `null` se reservou agora (primeira vez → siga com o trabalho).
   * - Retorna o registro existente caso a chave já exista (em andamento ou concluída).
   *
   * Reservas `IN_FLIGHT` cujo `inFlightTtlSeconds` já expirou (request anterior
   * morreu sem concluir/liberar) são reciclas automaticamente, evitando travar a
   * chave até o TTL longo.
   */
  reserve(input: {
    consumerId: string
    key: string
    requestHash: string
    /** TTL curto da reserva em andamento; expirado → reciclável. */
    inFlightTtlSeconds: number
  }): Promise<IdempotencyRecord | null>

  /**
   * Marca a chave como concluída, guarda a resposta para reuso e estende o TTL
   * para `ttlSeconds` (janela longa de replay idempotente).
   */
  complete(input: {
    consumerId: string
    key: string
    responseStatus: number
    responseBody: unknown
    ttlSeconds: number
  }): Promise<void>

  /** Libera a reserva (em caso de falha) para permitir nova tentativa. */
  release(consumerId: string, key: string): Promise<void>

  /** Remove chaves expiradas. Roda em job periódico (fora do caminho da request). */
  cleanupExpired(): Promise<void>
}
