import { and, eq, lt } from 'drizzle-orm'
import type {
  IdempotencyRecord,
  IdempotencyStore,
} from '../../../domain/ports/idempotency-store.port'
import type { Database } from './db'
import { idempotencyKeys } from './schema'

/**
 * Idempotência baseada em PostgreSQL, **escopada por consumidor** (`(consumer_id,
 * key)`). A reserva usa `INSERT ... ON CONFLICT DO NOTHING RETURNING`, que é
 * atômico: apenas o primeiro a inserir "vence" e recebe a permissão de processar;
 * os demais recuperam o registro existente.
 *
 * Reservas `IN_FLIGHT` expiradas (request anterior morreu entre `reserve` e
 * `complete`/`release`) são recicladas dentro do próprio `reserve` — sem isso a
 * chave ficaria travada até o TTL longo.
 */
export class DrizzleIdempotencyStore implements IdempotencyStore {
  constructor(private readonly db: Database) {}

  async reserve(input: {
    consumerId: string
    key: string
    requestHash: string
    inFlightTtlSeconds: number
  }): Promise<IdempotencyRecord | null> {
    // A limpeza de chaves expiradas roda num job periódico (cleanupExpired),
    // não aqui — para não adicionar uma escrita a cada request sob pico.
    const expiresAt = new Date(Date.now() + input.inFlightTtlSeconds * 1000)

    const inserted = await this.db
      .insert(idempotencyKeys)
      .values({
        consumerId: input.consumerId,
        key: input.key,
        requestHash: input.requestHash,
        state: 'IN_FLIGHT',
        expiresAt,
      })
      .onConflictDoNothing({ target: [idempotencyKeys.consumerId, idempotencyKeys.key] })
      .returning({ key: idempotencyKeys.key })

    if (inserted.length > 0) return null // reservou agora

    const [existing] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(
        and(eq(idempotencyKeys.consumerId, input.consumerId), eq(idempotencyKeys.key, input.key)),
      )
      .limit(1)

    // Corrida rara: expirou/foi removido entre o insert e o select → reserva de novo.
    if (!existing) return this.reserve(input)

    // Reserva presa: uma request anterior reservou IN_FLIGHT e morreu sem
    // concluir/liberar. Passado o TTL curto, recicla a reserva (toma o lugar).
    if (existing.state === 'IN_FLIGHT' && existing.expiresAt.getTime() <= Date.now()) {
      const reclaimed = await this.db
        .delete(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.consumerId, input.consumerId),
            eq(idempotencyKeys.key, input.key),
            eq(idempotencyKeys.state, 'IN_FLIGHT'),
            lt(idempotencyKeys.expiresAt, new Date()),
          ),
        )
        .returning({ key: idempotencyKeys.key })
      // Conseguiu remover a reserva morta (ou outra instância já a removeu) →
      // tenta reservar de novo; quem perder a corrida cai no fluxo normal.
      if (reclaimed.length > 0) return this.reserve(input)
    }

    return {
      consumerId: existing.consumerId,
      key: existing.key,
      requestHash: existing.requestHash,
      state: existing.state,
      responseStatus: existing.responseStatus,
      responseBody: existing.responseBody,
    }
  }

  async complete(input: {
    consumerId: string
    key: string
    responseStatus: number
    responseBody: unknown
    ttlSeconds: number
  }): Promise<void> {
    await this.db
      .update(idempotencyKeys)
      .set({
        state: 'COMPLETED',
        responseStatus: input.responseStatus,
        responseBody: input.responseBody,
        // Estende para a janela longa de replay idempotente.
        expiresAt: new Date(Date.now() + input.ttlSeconds * 1000),
      })
      .where(
        and(eq(idempotencyKeys.consumerId, input.consumerId), eq(idempotencyKeys.key, input.key)),
      )
  }

  async release(consumerId: string, key: string): Promise<void> {
    await this.db
      .delete(idempotencyKeys)
      .where(and(eq(idempotencyKeys.consumerId, consumerId), eq(idempotencyKeys.key, key)))
  }

  async cleanupExpired(): Promise<void> {
    await this.db.delete(idempotencyKeys).where(lt(idempotencyKeys.expiresAt, new Date()))
  }
}
