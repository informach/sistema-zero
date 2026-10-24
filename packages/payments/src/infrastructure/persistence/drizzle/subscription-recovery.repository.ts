import { and, asc, eq, exists, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { ValidationError } from '../../../domain/shared/errors'
import { SubscriptionRecoveryCase } from '../../../domain/subscription-recovery/recovery-case'
import type {
  RecoveryLease,
  SubscriptionRecoveryRepository,
} from '../../../domain/subscription-recovery/recovery-repository.port'
import { PG_CHANNELS } from './channels'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import {
  subscriptionRecoveryCases as cases,
  subscriptionRecoveryNotices as notices,
  outbox,
  payments,
  subscriptions,
} from './schema'

const activeStates = ['OPEN', 'PAYMENT_PENDING', 'CANCEL_PENDING', 'MANUAL_REVIEW'] as const

export class DrizzleSubscriptionRecoveryRepository implements SubscriptionRecoveryRepository {
  constructor(private readonly db: Database) {}

  async create(item: SubscriptionRecoveryCase): Promise<boolean> {
    if (!item.isNew) throw new ValidationError('Caso já persistido')
    const snapshot = item.toSnapshot()
    return this.db.transaction(async (tx) => {
      // Mantém a origem estável até o INSERT; não há chamada externa na transação.
      const [source] = await tx
        .select({ id: payments.id })
        .from(payments)
        .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
        .where(
          and(
            eq(payments.id, snapshot.paymentId),
            eq(payments.status, 'FAILED'),
            eq(payments.subscriptionId, snapshot.subscriptionId),
            eq(payments.consumerId, snapshot.consumerId),
            eq(payments.providerPaymentId, snapshot.providerPaymentId),
            eq(payments.amountInCents, snapshot.amountInCents),
            eq(payments.currency, 'BRL'),
            eq(payments.method, 'CREDIT_CARD'),
            eq(subscriptions.consumerId, snapshot.consumerId),
            eq(subscriptions.providerSubscriptionId, snapshot.providerSubscriptionId),
            eq(subscriptions.status, 'ACTIVE'),
            gt(subscriptions.cyclesCompleted, 0),
          ),
        )
        .for('share')
        .limit(1)
      if (!source)
        throw new ValidationError('Caso exige uma renovação recusada de assinatura já paga')
      const rows = await tx
        .insert(cases)
        .values(snapshot)
        .onConflictDoNothing()
        .returning({ id: cases.id })
      return rows.length === 1
    })
  }

  async findById(id: string): Promise<SubscriptionRecoveryCase | null> {
    const [row] = await this.db.select().from(cases).where(eq(cases.id, id)).limit(1)
    return row ? restoreCase(row) : null
  }

  async findActiveForSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionRecoveryCase | null> {
    const [row] = await this.db
      .select()
      .from(cases)
      .where(and(eq(cases.subscriptionId, subscriptionId), inArray(cases.state, activeStates)))
      .limit(1)
    return row ? restoreCase(row) : null
  }

  async claimDue(input: { now: Date; leaseMs: number; limit: number }): Promise<RecoveryLease[]> {
    if (
      !Number.isFinite(input.now.getTime()) ||
      !Number.isSafeInteger(input.leaseMs) ||
      input.leaseMs < 10_000 ||
      input.leaseMs > 900_000 ||
      !Number.isSafeInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 100
    )
      throw new ValidationError('Lote de regularização inválido')
    const leaseUntil = new Date(input.now.getTime() + input.leaseMs)
    return this.db.transaction(async (tx) => {
      // A lost confirmation response must not reopen the financial case. Resume only
      // its original closeout envelope, with a finite 24h retry horizon and 2min backoff.
      const pendingCloseout = tx
        .select({ id: notices.id })
        .from(notices)
        .where(
          and(
            eq(notices.caseId, cases.id),
            isNull(notices.messageId),
            inArray(notices.purpose, ['RECOVERED', 'CANCELED']),
            gt(notices.createdAt, new Date(input.now.getTime() - 86_400_000)),
            or(
              isNull(notices.lastAttemptAt),
              lte(notices.lastAttemptAt, new Date(input.now.getTime() - 120_000)),
            ),
          ),
        )
      const rows = await tx
        .select()
        .from(cases)
        .where(
          and(
            or(
              lte(cases.nextActionAt, input.now),
              and(inArray(cases.state, ['RECOVERED', 'CANCELED']), exists(pendingCloseout)),
            ),
            or(isNull(cases.leaseUntil), lte(cases.leaseUntil, input.now)),
          ),
        )
        .orderBy(asc(cases.nextActionAt), asc(cases.id))
        .limit(input.limit)
        .for('update', { skipLocked: true })
      const claimed: RecoveryLease[] = []
      for (const row of rows) {
        const leaseId = crypto.randomUUID()
        await tx
          .update(cases)
          .set({ leaseId, leaseUntil, version: row.version + 1 })
          .where(eq(cases.id, row.id))
        claimed.push({
          item: restoreCase({ ...row, version: row.version + 1 }),
          leaseId,
          leaseUntil: new Date(leaseUntil),
        })
      }
      return claimed
    })
  }

  async saveOwned(lease: RecoveryLease, now: Date): Promise<void> {
    if (!Number.isFinite(now.getTime()) || lease.item.isNew)
      throw new ValidationError('Escrita do caso exige lease válido')
    const snapshot = lease.item.toSnapshot()
    const events = [...lease.item.events]
    await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(cases)
        .set({ ...snapshot, version: snapshot.version + 1, leaseId: null, leaseUntil: null })
        .where(
          and(
            eq(cases.id, snapshot.id),
            eq(cases.version, snapshot.version),
            eq(cases.leaseId, lease.leaseId),
            gt(cases.leaseUntil, now),
          ),
        )
        .returning({ id: cases.id })
      if (rows.length !== 1) throw new ConcurrencyConflictError(snapshot.id)
      if (events.length) {
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
    lease.item.pullEvents()
  }
}

function restoreCase(row: typeof cases.$inferSelect): SubscriptionRecoveryCase {
  const { leaseId: _leaseId, leaseUntil: _leaseUntil, ...snapshot } = row
  return SubscriptionRecoveryCase.restore(snapshot)
}
