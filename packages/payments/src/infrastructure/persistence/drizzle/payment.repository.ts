import { and, asc, eq, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import { PaymentAggregate, type PaymentSnapshot } from '../../../domain/payment/payment.aggregate'
import type {
  ClaimedCharge,
  PaymentRepository,
} from '../../../domain/ports/payment-repository.port'
import type { Currency } from '../../../domain/value-objects/money'
import { PG_CHANNELS } from './channels'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import { outbox, payments } from './schema'

type PaymentRow = typeof payments.$inferSelect

/**
 * Repositório do agregado de pagamento (Drizzle/Postgres).
 *
 * `save` persiste o agregado e grava seus eventos de domínio no outbox na MESMA
 * transação — é o ponto-chave do _transactional outbox_: ou tudo é gravado, ou
 * nada é. O poller publica os eventos depois.
 */
export class DrizzlePaymentRepository implements PaymentRepository {
  constructor(private readonly db: Database) {}

  async save(payment: PaymentAggregate): Promise<void> {
    const snap = payment.toSnapshot()
    const events = payment.pullEvents()
    const values = snapshotToRow(snap)

    await this.db.transaction(async (tx) => {
      if (payment.isNew) {
        // Primeiro INSERT (version 0). A unique (consumer_id, idempotency_key)
        // protege contra duplicação por mesma chave.
        await tx.insert(payments).values(values)
      } else {
        // UPDATE com controle de concorrência otimista: só grava se a versão
        // não mudou desde a leitura → evita lost-update e eventos duplicados de
        // dois writers (ex.: reconciliação vs webhook) sobre o mesmo pagamento.
        const updated = await tx
          .update(payments)
          .set({
            version: snap.version + 1,
            status: values.status,
            amountInCents: values.amountInCents,
            providerPaymentId: values.providerPaymentId,
            txid: values.txid,
            card: values.card,
            pixQrCode: values.pixQrCode,
            boleto: values.boleto,
            boletoRequest: values.boletoRequest,
            customer: values.customer,
            description: values.description,
            metadata: values.metadata,
            failureReason: values.failureReason,
            updatedAt: values.updatedAt,
            paidAt: values.paidAt,
            expiresAt: values.expiresAt,
          })
          .where(and(eq(payments.id, snap.id), eq(payments.version, snap.version)))
          .returning({ id: payments.id })

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
        // NOTIFY transacional: só é entregue se a transação commitar (eventos já
        // visíveis). Acorda o OutboxPoller na hora; o poll é a rede de segurança.
        await tx.execute(sql`select pg_notify(${PG_CHANNELS.outbox}, '')`)
      }
    })
  }

  async findById(id: string): Promise<PaymentAggregate | null> {
    const [row] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1)
    return row ? PaymentAggregate.restore(rowToSnapshot(row)) : null
  }

  async findByIdempotencyKey(
    consumerId: string,
    idempotencyKey: string,
  ): Promise<PaymentAggregate | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.consumerId, consumerId), eq(payments.idempotencyKey, idempotencyKey)))
      .limit(1)
    return row ? PaymentAggregate.restore(rowToSnapshot(row)) : null
  }

  async findByTxid(txid: string): Promise<PaymentAggregate | null> {
    const [row] = await this.db.select().from(payments).where(eq(payments.txid, txid)).limit(1)
    return row ? PaymentAggregate.restore(rowToSnapshot(row)) : null
  }

  async findByProviderPaymentId(
    provider: string,
    providerPaymentId: string,
  ): Promise<PaymentAggregate | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(
        and(eq(payments.provider, provider), eq(payments.providerPaymentId, providerPaymentId)),
      )
      .limit(1)
    return row ? PaymentAggregate.restore(rowToSnapshot(row)) : null
  }

  async claimPendingCharges(limit: number, staleAfterMs: number): Promise<ClaimedCharge[]> {
    const staleThreshold = new Date(Date.now() - staleAfterMs)

    return this.db.transaction(async (tx) => {
      const locked = await tx
        .select({ id: payments.id })
        .from(payments)
        .where(
          and(
            inArray(payments.method, ['PIX', 'BOLETO']),
            eq(payments.status, 'PENDING'),
            isNull(payments.providerPaymentId),
            or(isNull(payments.chargeClaimedAt), lt(payments.chargeClaimedAt, staleThreshold)),
          ),
        )
        .orderBy(asc(payments.createdAt))
        .limit(limit)
        .for('update', { skipLocked: true })

      if (locked.length === 0) return []

      const ids = locked.map((r) => r.id)
      await tx
        .update(payments)
        .set({ chargeClaimedAt: new Date(), chargeAttempts: sql`${payments.chargeAttempts} + 1` })
        .where(inArray(payments.id, ids))

      const rows = await tx.select().from(payments).where(inArray(payments.id, ids))
      return rows.map((row) => ({
        payment: PaymentAggregate.restore(rowToSnapshot(row)),
        attempts: row.chargeAttempts,
      }))
    })
  }

  async findStalePendingCharges(limit: number, olderThanMs: number): Promise<PaymentAggregate[]> {
    const threshold = new Date(Date.now() - olderThanMs)
    const rows = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.status, 'PENDING'),
          // Cartão entra aqui (não em claimPendingCharges): cobrado de forma
          // síncrona, mas um `waiting` (em análise) precisa ser reconciliado.
          inArray(payments.method, ['PIX', 'BOLETO', 'CREDIT_CARD']),
          isNotNull(payments.providerPaymentId),
          lt(payments.updatedAt, threshold),
        ),
      )
      .orderBy(asc(payments.updatedAt))
      .limit(limit)
    return rows.map((row) => PaymentAggregate.restore(rowToSnapshot(row)))
  }
}

function snapshotToRow(snap: PaymentSnapshot): typeof payments.$inferInsert {
  return {
    id: snap.id,
    version: snap.version,
    consumerId: snap.consumerId,
    status: snap.status,
    method: snap.methodType,
    amountInCents: snap.amountInCents,
    currency: snap.currency,
    provider: snap.provider,
    providerPaymentId: snap.providerPaymentId,
    txid: snap.txid,
    idempotencyKey: snap.idempotencyKey,
    card: snap.card,
    pixQrCode: snap.pixQrCode,
    boleto: snap.boleto,
    boletoRequest: snap.boletoRequest,
    customer: snap.customer,
    description: snap.description,
    metadata: snap.metadata,
    failureReason: snap.failureReason,
    subscriptionId: snap.subscriptionId,
    createdAt: snap.createdAt,
    updatedAt: snap.updatedAt,
    paidAt: snap.paidAt,
    expiresAt: snap.expiresAt,
  }
}

function rowToSnapshot(row: PaymentRow): PaymentSnapshot {
  return {
    id: row.id,
    version: row.version,
    consumerId: row.consumerId,
    amountInCents: row.amountInCents,
    currency: row.currency as Currency,
    methodType: row.method,
    card: row.card ?? null,
    status: row.status,
    provider: row.provider,
    idempotencyKey: row.idempotencyKey,
    providerPaymentId: row.providerPaymentId,
    txid: row.txid,
    pixQrCode: row.pixQrCode ?? null,
    boleto: row.boleto ?? null,
    boletoRequest: row.boletoRequest ?? null,
    customer: row.customer ?? null,
    description: row.description,
    metadata: row.metadata,
    failureReason: row.failureReason,
    subscriptionId: row.subscriptionId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    paidAt: row.paidAt,
    expiresAt: row.expiresAt,
  }
}
