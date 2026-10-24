import { and, asc, eq, gt, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { ValidationError } from '../../../domain/shared/errors'
import {
  type CycleHistoryReview,
  readCycleHistoryReview,
} from '../../../domain/subscription/cycle-history-review'
import { PG_CHANNELS } from './channels'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import {
  subscriptionPaidCycles as cycles,
  subscriptionOperations as operations,
  outbox,
  payments,
  subscriptions,
} from './schema'

export interface CycleHistoryCandidate {
  id: string
  consumerId: string
  provider: string
  providerSubscriptionId: string
  version: number
  before: number
}
export class DrizzleCycleHistoryReviewRepository {
  constructor(
    private readonly db: Database,
    private readonly clock: () => Date = () => new Date(),
  ) {}
  async candidates(subscriptionId?: string) {
    const rows = await this.db
      .select({
        id: subscriptions.id,
        consumerId: subscriptions.consumerId,
        provider: subscriptions.provider,
        providerSubscriptionId: subscriptions.providerSubscriptionId,
        version: subscriptions.version,
        before: subscriptions.cyclesCompleted,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'ACTIVE'),
          eq(subscriptions.provider, 'EFI'),
          isNull(subscriptions.repeats),
          isNull(subscriptions.cancelRequestedAt),
          isNull(subscriptions.cycleHistoryReview),
          ...(subscriptionId ? [eq(subscriptions.id, subscriptionId)] : []),
          sql`${subscriptions.cyclesCompleted} > (select count(distinct p.provider_payment_id) from payments.payments p
          where p.subscription_id = ${subscriptions.id} and p.consumer_id = ${subscriptions.consumerId} and p.provider = ${subscriptions.provider}
            and p.status in ('PAID','REFUNDED') and p.method = 'CREDIT_CARD' and p.currency = ${subscriptions.currency}
            and p.amount_in_cents = ${subscriptions.amountInCents})`,
        ),
      )
      .orderBy(asc(subscriptions.id))
      .limit(25)
    return rows.filter((row): row is CycleHistoryCandidate => Boolean(row.providerSubscriptionId))
  }
  async localIdentities(item: CycleHistoryCandidate) {
    const rows = await this.db
      .select({ id: payments.providerPaymentId })
      .from(payments)
      .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
      .where(
        and(
          eq(payments.subscriptionId, item.id),
          eq(payments.consumerId, item.consumerId),
          eq(payments.provider, item.provider),
          inArray(payments.status, ['PAID', 'REFUNDED']),
          eq(payments.method, 'CREDIT_CARD'),
          eq(payments.currency, subscriptions.currency),
          eq(payments.amountInCents, subscriptions.amountInCents),
        ),
      )
      .limit(101)
    if (rows.some((row) => !row.id)) return null
    return rows
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id))
      .sort()
  }
  async apply(item: CycleHistoryCandidate, input: CycleHistoryReview): Promise<void> {
    const audit = readCycleHistoryReview(input)
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, item.id))
        .for('update')
      if (
        !row ||
        row.version !== item.version ||
        row.cyclesCompleted !== audit.before ||
        item.before !== audit.before ||
        row.status !== 'ACTIVE' ||
        row.repeats !== null ||
        row.cancelRequestedAt ||
        row.cycleHistoryReview ||
        audit.subscriptionVersion !== row.version ||
        audit.providerSubscriptionId !== row.providerSubscriptionId ||
        row.consumerId !== item.consumerId ||
        row.provider !== 'EFI' ||
        row.provider !== item.provider ||
        row.providerSubscriptionId !== item.providerSubscriptionId
      )
        throw new ConcurrencyConflictError(item.id)
      const now = this.clock()
      if (now < new Date(audit.reviewedAt) || now < row.updatedAt)
        throw new ValidationError('Relógio da revisão divergente')
      readCycleHistoryReview({ ...audit, reviewedAt: now.toISOString() })
      const local = await tx
        .select({ id: payments.providerPaymentId })
        .from(payments)
        .where(
          and(
            eq(payments.subscriptionId, row.id),
            eq(payments.consumerId, row.consumerId),
            eq(payments.provider, row.provider),
            inArray(payments.status, ['PAID', 'REFUNDED']),
            eq(payments.method, 'CREDIT_CARD'),
            eq(payments.currency, row.currency),
            eq(payments.amountInCents, row.amountInCents),
          ),
        )
        .limit(101)
        .for('share')
      const known = await tx
        .select({ id: cycles.providerPaymentId })
        .from(cycles)
        .where(eq(cycles.subscriptionId, row.id))
        .limit(101)
        .for('share')
      const expected = JSON.stringify(audit.providerPaymentIds)
      if (
        JSON.stringify(local.map((receipt) => receipt.id).sort()) !== expected ||
        JSON.stringify(known.map((cycle) => cycle.id).sort()) !== expected
      )
        throw new ValidationError('Os recibos e a origem ainda não comprovam o mesmo histórico')
      const [active] = await tx
        .select({ id: operations.id })
        .from(operations)
        .where(
          and(
            eq(operations.subscriptionId, row.id),
            inArray(operations.state, ['READY', 'EXECUTING', 'UNKNOWN']),
            or(ne(operations.state, 'READY'), gt(operations.expiresAt, now)),
          ),
        )
        .limit(1)
      if (active) throw new ValidationError('Solicitação financeira pendente')
      await tx
        .update(subscriptions)
        .set({
          cyclesCompleted: audit.after,
          cycleHistoryReview: audit,
          version: row.version + 1,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, row.id))
      await tx.insert(outbox).values({
        aggregateId: row.id,
        eventName: 'subscription.cycle_history_reviewed',
        payload: {
          subscriptionId: row.id,
          consumerId: row.consumerId,
          before: audit.before,
          after: audit.after,
          actorId: audit.actorId,
          requestId: audit.requestId,
        },
      })
      await tx.execute(sql`select pg_notify(${PG_CHANNELS.outbox}, '')`)
      const finish = this.clock()
      if (finish < now) throw new ValidationError('Relógio da revisão divergente')
      readCycleHistoryReview({ ...audit, reviewedAt: finish.toISOString() })
    })
  }
}
