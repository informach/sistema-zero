import { and, eq, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'
import type { SubscriptionRepository } from '../../../domain/ports/subscription-repository.port'
import { ValidationError } from '../../../domain/shared/errors'
import {
  SubscriptionAggregate,
  type SubscriptionSnapshot,
} from '../../../domain/subscription/subscription.aggregate'
import {
  SubscriptionCancellationRecordedEvent,
  SubscriptionChargePaidEvent,
} from '../../../domain/subscription/subscription.events'
import type { Currency } from '../../../domain/value-objects/money'
import { writeCancellationAudit } from './cancellation-audit.writer'
import { cancellationRecordFromWire, cancellationRecordToWire } from './cancellation-record.mapper'
import { PG_CHANNELS } from './channels'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import { outbox, subscriptionPaidCycles, subscriptions } from './schema'

type SubscriptionRow = typeof subscriptions.$inferSelect
type SubscriptionTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/**
 * Repositório do agregado de assinatura (Drizzle/Postgres). Como o de pagamento,
 * `save` persiste o agregado e grava seus eventos de domínio no outbox na MESMA
 * transação (transactional outbox), com concorrência otimista por `version`.
 */
export class DrizzleSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly db: Database) {}

  async save(subscription: SubscriptionAggregate): Promise<void> {
    await this.db.transaction((tx) => this.write(tx, subscription))
    subscription.pullEvents()
  }

  async recordPaidCycle(
    input: Parameters<SubscriptionRepository['recordPaidCycle']>[0],
  ): Promise<void> {
    if (!input.chargeId || input.chargeId.length > 200)
      throw new ValidationError('Identidade do ciclo inválida')
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.id, input.subscriptionId),
            eq(subscriptions.consumerId, input.consumerId),
            eq(subscriptions.provider, input.provider),
            eq(subscriptions.providerSubscriptionId, input.providerSubscriptionId),
          ),
        )
        .for('update')
      if (!row) throw new ValidationError('A assinatura mudou durante a confirmação do ciclo')
      const [recorded] = await tx
        .select({ id: subscriptionPaidCycles.providerPaymentId })
        .from(subscriptionPaidCycles)
        .where(
          and(
            eq(subscriptionPaidCycles.subscriptionId, row.id),
            eq(subscriptionPaidCycles.providerPaymentId, input.chargeId),
          ),
        )
      if (recorded) return
      // During a rolling deploy, an older writer may have recorded the parent
      // after the migration snapshot. Its committed event is exact evidence,
      // unlike a paid child alone (which can precede a failed parent write).
      const [oldWriter] = await tx
        .select({ id: outbox.id })
        .from(outbox)
        .where(
          and(
            eq(outbox.aggregateId, row.id),
            eq(outbox.eventName, 'subscription.charge_paid'),
            sql`${outbox.payload}->>'chargeId' = ${input.chargeId}`,
          ),
        )
        .limit(1)
      if (row.lastChargeId === input.chargeId || oldWriter) {
        await tx
          .insert(subscriptionPaidCycles)
          .values({ subscriptionId: row.id, providerPaymentId: input.chargeId })
        return
      }
      const subscription = SubscriptionAggregate.restore(rowToSnapshot(row))
      if (subscription.status === 'PENDING') subscription.activate()
      subscription.recordCharge(input.chargeId, input.paidAt)
      await this.write(tx, subscription)
    })
  }

  private async write(
    tx: SubscriptionTransaction,
    subscription: SubscriptionAggregate,
  ): Promise<void> {
    const snap = subscription.toSnapshot()
    const events = [...subscription.events]
    const values = snapshotToRow(snap)

    if (subscription.isNew) {
      // A unique (consumer_id, idempotency_key) protege contra duplicação por chave.
      await tx.insert(subscriptions).values(values)
    } else {
      const updated = await tx
        .update(subscriptions)
        .set({
          version: snap.version + 1,
          status: values.status,
          card: values.card,
          providerSubscriptionId: values.providerSubscriptionId,
          cyclesCompleted: values.cyclesCompleted,
          lastChargeId: values.lastChargeId,
          lastChargeAt: values.lastChargeAt,
          metadata: values.metadata,
          canceledAt: values.canceledAt,
          cancelRequestedAt: values.cancelRequestedAt,
          cancellationRecord: values.cancellationRecord,
          updatedAt: values.updatedAt,
        })
        .where(and(eq(subscriptions.id, snap.id), eq(subscriptions.version, snap.version)))
        .returning({ id: subscriptions.id })

      if (updated.length === 0) throw new ConcurrencyConflictError(snap.id)
    }

    for (const event of events) {
      if (event instanceof SubscriptionChargePaidEvent) {
        const inserted = await tx
          .insert(subscriptionPaidCycles)
          .values({ subscriptionId: snap.id, providerPaymentId: event.chargeId })
          .onConflictDoNothing()
          .returning({ chargeId: subscriptionPaidCycles.providerPaymentId })
        if (inserted.length !== 1) throw new ConcurrencyConflictError(snap.id)
      }
      if (event instanceof SubscriptionCancellationRecordedEvent)
        await writeCancellationAudit(tx, snap.id, snap.consumerId, event.cancellationRecord)
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

  async claimActiveForReconcile(limit: number): Promise<SubscriptionAggregate[]> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(subscriptions)
        .where(
          and(eq(subscriptions.status, 'ACTIVE'), isNotNull(subscriptions.providerSubscriptionId)),
        )
        // Nunca varrida primeiro; depois, a tentativa mais antiga. Os desempates
        // tornam o lote estável mesmo quando várias linhas recebem o mesmo carimbo.
        .orderBy(
          sql`${subscriptions.lastReconciledAt} asc nulls first`,
          sql`${subscriptions.lastChargeAt} asc nulls first`,
          subscriptions.id,
        )
        .limit(limit)
        .for('update', { skipLocked: true })

      if (rows.length === 0) return []
      await tx
        .update(subscriptions)
        .set({ lastReconciledAt: sql`now()` })
        .where(
          inArray(
            subscriptions.id,
            rows.map((row) => row.id),
          ),
        )
      return rows.map((row) => SubscriptionAggregate.restore(rowToSnapshot(row)))
    })
  }

  async claimCancellationRequests(
    limit: number,
    leaseMs: number,
  ): Promise<SubscriptionAggregate[]> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(subscriptions)
        .where(
          and(
            isNotNull(subscriptions.cancelRequestedAt),
            sql`(${subscriptions.cancellationRecord}->>'origin') is distinct from 'NONPAYMENT'`,
            inArray(subscriptions.status, ['ACTIVE', 'PENDING']),
            or(
              isNull(subscriptions.cancellationNextAttemptAt),
              lte(subscriptions.cancellationNextAttemptAt, sql`now()`),
            ),
          ),
        )
        .orderBy(
          sql`${subscriptions.cancellationNextAttemptAt} asc nulls first`,
          subscriptions.cancelRequestedAt,
          subscriptions.id,
        )
        .limit(limit)
        .for('update', { skipLocked: true })
      if (rows.length === 0) return []
      await tx
        .update(subscriptions)
        .set({ cancellationNextAttemptAt: sql`now() + ${leaseMs} * interval '1 millisecond'` })
        .where(
          inArray(
            subscriptions.id,
            rows.map((row) => row.id),
          ),
        )
      return rows.map((row) => SubscriptionAggregate.restore(rowToSnapshot(row)))
    })
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
    cancelRequestedAt: snap.cancelRequestedAt,
    cancellationRecord: cancellationRecordToWire(snap.cancellationRecord),
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
    cancelRequestedAt: row.cancelRequestedAt,
    cancellationRecord: cancellationRecordFromWire(row.cancellationRecord),
    canceledAt: row.canceledAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
