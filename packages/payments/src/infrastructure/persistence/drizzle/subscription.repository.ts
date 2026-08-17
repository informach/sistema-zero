import { and, eq, isNotNull, sql } from 'drizzle-orm'
import type { SubscriptionRepository } from '../../../domain/ports/subscription-repository.port'
import {
  SubscriptionAggregate,
  type SubscriptionSnapshot,
} from '../../../domain/subscription/subscription.aggregate'
import type { Currency } from '../../../domain/value-objects/money'
import { PG_CHANNELS } from './channels'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import { outbox, subscriptions } from './schema'

type SubscriptionRow = typeof subscriptions.$inferSelect

/**
 * Repositório do agregado de assinatura (Drizzle/Postgres). Como o de pagamento,
 * `save` persiste o agregado e grava seus eventos de domínio no outbox na MESMA
 * transação (transactional outbox), com concorrência otimista por `version`.
 */
export class DrizzleSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly db: Database) {}

  async save(subscription: SubscriptionAggregate): Promise<void> {
    const snap = subscription.toSnapshot()
    const events = subscription.pullEvents()
    const values = snapshotToRow(snap)

    await this.db.transaction(async (tx) => {
      if (subscription.isNew) {
        // A unique (consumer_id, idempotency_key) protege contra duplicação por chave.
        await tx.insert(subscriptions).values(values)
      } else {
        const updated = await tx
          .update(subscriptions)
          .set({
            version: snap.version + 1,
            status: values.status,
            providerSubscriptionId: values.providerSubscriptionId,
            cyclesCompleted: values.cyclesCompleted,
            lastChargeId: values.lastChargeId,
            lastChargeAt: values.lastChargeAt,
            metadata: values.metadata,
            canceledAt: values.canceledAt,
            updatedAt: values.updatedAt,
          })
          .where(and(eq(subscriptions.id, snap.id), eq(subscriptions.version, snap.version)))
          .returning({ id: subscriptions.id })

        if (updated.length === 0) throw new ConcurrencyConflictError(snap.id)
      }

      if (events.length > 0) {
        await tx.insert(outbox).values(
          events.map((event) => ({
            aggregateId: event.aggregateId,
            eventName: event.eventName,
            payload: event.toPayload(),
          })),
        )
        await tx.execute(sql`select pg_notify(${PG_CHANNELS.outbox}, '')`)
      }
    })
  }

  async findById(id: string): Promise<SubscriptionAggregate | null> {
    const [row] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1)
    return row ? SubscriptionAggregate.restore(rowToSnapshot(row)) : null
  }

  async findByIdempotencyKey(
    consumerId: string,
    idempotencyKey: string,
  ): Promise<SubscriptionAggregate | null> {
    const [row] = await this.db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.consumerId, consumerId),
          eq(subscriptions.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1)
    return row ? SubscriptionAggregate.restore(rowToSnapshot(row)) : null
  }

  async findByProviderSubscriptionId(
    provider: string,
    providerSubscriptionId: string,
  ): Promise<SubscriptionAggregate | null> {
    const [row] = await this.db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.provider, provider),
          eq(subscriptions.providerSubscriptionId, providerSubscriptionId),
        ),
      )
      .limit(1)
    return row ? SubscriptionAggregate.restore(rowToSnapshot(row)) : null
  }

  async findActiveForReconcile(limit: number): Promise<SubscriptionAggregate[]> {
    // Sem claim/lease de propósito (ver o port): o trabalho por item é idempotente.
    // A mais antiga sem cobrança registrada primeiro — é a que corre mais risco de
    // ter o acesso cortado. `nulls first` cobre a assinatura que nunca cobrou.
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(
        and(eq(subscriptions.status, 'ACTIVE'), isNotNull(subscriptions.providerSubscriptionId)),
      )
      .orderBy(sql`${subscriptions.lastChargeAt} asc nulls first`)
      .limit(limit)
    return rows.map((row) => SubscriptionAggregate.restore(rowToSnapshot(row)))
  }
}

function snapshotToRow(snap: SubscriptionSnapshot): typeof subscriptions.$inferInsert {
  return {
    id: snap.id,
    version: snap.version,
    consumerId: snap.consumerId,
    status: snap.status,
    provider: snap.provider,
    providerSubscriptionId: snap.providerSubscriptionId,
    providerPlanId: snap.providerPlanId,
    intervalMonths: snap.intervalMonths,
    repeats: snap.repeats,
    amountInCents: snap.amountInCents,
    currency: snap.currency,
    card: snap.card,
    customer: snap.customer,
    idempotencyKey: snap.idempotencyKey,
    cyclesCompleted: snap.cyclesCompleted,
    lastChargeId: snap.lastChargeId,
    lastChargeAt: snap.lastChargeAt,
    description: snap.description,
    metadata: snap.metadata,
    canceledAt: snap.canceledAt,
    createdAt: snap.createdAt,
    updatedAt: snap.updatedAt,
  }
}

export function rowToSnapshot(row: SubscriptionRow): SubscriptionSnapshot {
  return {
    id: row.id,
    version: row.version,
    consumerId: row.consumerId,
    status: row.status,
    provider: row.provider,
    providerSubscriptionId: row.providerSubscriptionId,
    providerPlanId: row.providerPlanId,
    intervalMonths: row.intervalMonths,
    repeats: row.repeats ?? null,
    amountInCents: row.amountInCents,
    currency: row.currency as Currency,
    card: row.card,
    customer: row.customer ?? null,
    idempotencyKey: row.idempotencyKey,
    cyclesCompleted: row.cyclesCompleted,
    lastChargeId: row.lastChargeId ?? null,
    lastChargeAt: row.lastChargeAt ?? null,
    description: row.description,
    metadata: row.metadata,
    canceledAt: row.canceledAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
