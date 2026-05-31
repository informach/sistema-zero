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

/**
 * Resultado de `reserve`. `acquired` traz o `reservationId` (token de fencing) que
 * o chamador DEVE repassar a `complete`/`release` — assim só a request que reservou
 * pode concluí-la/liberá-la. `existing` traz o registro já presente.
 */
export type ReserveResult =
  | { kind: 'acquired'; reservationId: string }
  | { kind: 'existing'; record: IdempotencyRecord }

export interface IdempotencyStore {
  /**
   * Tenta reservar a chave `(consumerId, key)` atomicamente.
   * - `{ kind: 'acquired', reservationId }` se reservou agora (siga com o trabalho).
   * - `{ kind: 'existing', record }` se a chave já existe (em andamento ou concluída).
   *
   * Reservas `IN_FLIGHT` cujo `inFlightTtlSeconds` já expirou (request anterior
   * morreu sem concluir/liberar) são recicladas automaticamente, evitando travar a
   * chave até o TTL longo.
   */
  reserve(input: {
    consumerId: string
    key: string
    requestHash: string
    /** TTL curto da reserva em andamento; expirado → reciclável. */
    inFlightTtlSeconds: number
  }): Promise<ReserveResult>

  /**
   * Marca a chave como concluída, guarda a resposta para reuso e estende o TTL
   * para `ttlSeconds`. Só afeta a reserva IN_FLIGHT cujo `reservationId` confere
   * (fencing) — um complete de request zumbi vira no-op.
   */
  complete(input: {
    consumerId: string
    key: string
    reservationId: string
    responseStatus: number
    responseBody: unknown
    ttlSeconds: number
  }): Promise<void>

  /**
   * Libera a reserva (em caso de falha) para permitir nova tentativa. Só remove a
   * reserva IN_FLIGHT cujo `reservationId` confere — nunca apaga uma reserva já
   * concluída nem a de outro dono.
   */
  release(consumerId: string, key: string, reservationId: string): Promise<void>

  /** Remove chaves expiradas. Roda em job periódico (fora do caminho da request). */
  cleanupExpired(): Promise<void>
}
