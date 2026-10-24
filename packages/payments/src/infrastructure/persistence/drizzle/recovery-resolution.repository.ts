import { and, eq, gt, inArray, ne, or, sql } from 'drizzle-orm'
import { ValidationError } from '../../../domain/shared/errors'
import { SubscriptionRecoveryCase } from '../../../domain/subscription-recovery/recovery-case'
import {
  type RecoveryResolutionAudit,
  type RecoveryResolutionRepository,
  readRecoveryResolution,
} from '../../../domain/subscription-recovery/recovery-resolution.port'
import { PG_CHANNELS } from './channels'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import {
  subscriptionRecoveryCases as cases,
  subscriptionOperations as operations,
  outbox,
  payments,
  subscriptionRecoveryResolutions as resolutions,
  subscriptions,
} from './schema'

export class DrizzleRecoveryResolutionRepository implements RecoveryResolutionRepository {
  constructor(
    private readonly db: Database,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async findByCaseId(caseId: string): Promise<RecoveryResolutionAudit | null> {
    const [row] = await this.db.select().from(resolutions).where(eq(resolutions.caseId, caseId))
    return row ? readRecoveryResolution(row) : null
  }

  async resolve(input: RecoveryResolutionAudit, expectedVersion: number): Promise<void> {
    const audit = readRecoveryResolution(input)
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
      throw new ValidationError('Versão de acompanhamento inválida')
    await this.db.transaction(async (tx) => {
      const [origin] = await tx.select().from(cases).where(eq(cases.id, audit.caseId))
      if (!origin) throw new ValidationError('Acompanhamento não encontrado')
      // Serialize financial receipt changes first, matching settlement/cancellation lock order.
      const [subscription] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, origin.subscriptionId))
        .for('update')
      const [original] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, origin.paymentId))
        .for('share')
      const [paid] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, audit.paymentId))
        .for('share')
      const [row] = await tx.select().from(cases).where(eq(cases.id, audit.caseId)).for('update')
      const [prior] = await tx
        .select()
        .from(resolutions)
        .where(eq(resolutions.caseId, audit.caseId))
      if (prior && prior.actorId === audit.actorId && prior.requestId === audit.requestId) return
      if (
        prior ||
        !row ||
        row.version !== expectedVersion ||
        ['RECOVERED', 'CANCELED'].includes(row.state)
      )
        throw new ConcurrencyConflictError(audit.caseId)
      const now = this.clock()
      if (now < audit.resolvedAt) throw new ValidationError('Relógio da revisão divergente')
      readRecoveryResolution({ ...audit, resolvedAt: now })
      if (
        !subscription ||
        subscription.version !== audit.subscriptionVersion ||
        subscription.status !== 'ACTIVE' ||
        subscription.cancelRequestedAt ||
        subscription.consumerId !== row.consumerId ||
        subscription.providerSubscriptionId !== row.providerSubscriptionId ||
        subscription.amountInCents !== row.amountInCents ||
        subscription.currency !== 'BRL' ||
        !original ||
        original.version !== audit.originalPaymentVersion ||
        original.status !== 'FAILED' ||
        original.method !== 'CREDIT_CARD' ||
        original.subscriptionId !== row.subscriptionId ||
        original.consumerId !== row.consumerId ||
        original.provider !== subscription.provider ||
        original.providerPaymentId !== row.providerPaymentId ||
        original.amountInCents !== row.amountInCents ||
        original.currency !== 'BRL' ||
        !paid ||
        paid.id === original.id ||
        paid.version !== audit.paymentVersion ||
        paid.status !== 'PAID' ||
        paid.method !== 'CREDIT_CARD' ||
        paid.consumerId !== row.consumerId ||
        paid.subscriptionId !== row.subscriptionId ||
        paid.provider !== subscription.provider ||
        paid.providerPaymentId !== audit.providerPaymentId ||
        paid.amountInCents !== row.amountInCents ||
        paid.currency !== 'BRL' ||
        paid.cycleAccess?.kind !== 'VERIFIED_PERIOD' ||
        paid.cycleAccess.period.startsAt !== audit.periodStartsAt.toISOString() ||
        paid.cycleAccess.period.endsAt !== audit.periodEndsAt.toISOString() ||
        (row.leaseUntil && row.leaseUntil > now)
      )
        throw new ValidationError('A origem, o recibo ou a autoridade do acompanhamento mudou')
      const [active] = await tx
        .select({ id: operations.id })
        .from(operations)
        .where(
          and(
            eq(operations.subscriptionId, row.subscriptionId),
            inArray(operations.state, ['READY', 'EXECUTING', 'UNKNOWN']),
            or(ne(operations.state, 'READY'), gt(operations.expiresAt, now)),
          ),
        )
        .limit(1)
      if (active) throw new ValidationError('Solicitação financeira ainda pendente')
      const { leaseId: _leaseId, leaseUntil: _leaseUntil, ...snapshot } = row
      const item = SubscriptionRecoveryCase.restore(snapshot)
      item.resolveAfterSubsequentPayment(now)
      await tx
        .update(cases)
        .set({ ...item.toSnapshot(), version: row.version + 1, leaseId: null, leaseUntil: null })
        .where(eq(cases.id, row.id))
      const inserted = await tx
        .insert(resolutions)
        .values({ ...audit, resolvedAt: now })
        .onConflictDoNothing()
        .returning({ caseId: resolutions.caseId })
      if (inserted.length !== 1) throw new ConcurrencyConflictError(audit.caseId)
      await tx.insert(outbox).values(
        item.events.map((event) => ({
          aggregateId: event.aggregateId,
          eventName: event.eventName,
          payload: event.toPayload(),
        })),
      )
      await tx.execute(sql`select pg_notify(${PG_CHANNELS.outbox}, '')`)
      // A unique key/outbox write can wait too; stale observations roll back all writes.
      const finishedAt = this.clock()
      if (finishedAt < now) throw new ValidationError('Relógio da revisão divergente')
      readRecoveryResolution({ ...audit, resolvedAt: finishedAt })
    })
  }
}
