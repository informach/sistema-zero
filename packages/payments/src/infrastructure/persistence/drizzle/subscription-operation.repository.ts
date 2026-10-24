import { and, desc, eq, gt, inArray, lte, ne, or, sql } from 'drizzle-orm'
import { ValidationError } from '../../../domain/shared/errors'
import type {
  SubscriptionOperation,
  SubscriptionOperationRepository,
} from '../../../domain/subscription/subscription-operation'
import {
  assertRetryConfirmationCandidate,
  readOperationConfirmation,
  readRetryTerms,
} from '../../../domain/subscription/subscription-operation'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import { payments, subscriptionOperations, subscriptions } from './schema'

export class DrizzleSubscriptionOperationRepository implements SubscriptionOperationRepository {
  constructor(
    private readonly db: Database,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async create(operation: SubscriptionOperation): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await tx
        .update(subscriptionOperations)
        .set({
          state: 'REJECTED',
          result: 'INTENT_EXPIRED',
          completedAt: operation.createdAt,
        })
        .where(
          and(
            eq(subscriptionOperations.subscriptionId, operation.subscriptionId),
            eq(subscriptionOperations.state, 'READY'),
            lte(subscriptionOperations.expiresAt, operation.createdAt),
          ),
        )
      const rows = await tx
        .insert(subscriptionOperations)
        .values(operation)
        .onConflictDoNothing()
        .returning({ id: subscriptionOperations.id })
      return rows.length === 1
    })
  }

  async findById(id: string): Promise<SubscriptionOperation | null> {
    const [row] = await this.db
      .select()
      .from(subscriptionOperations)
      .where(eq(subscriptionOperations.id, id))
      .limit(1)
    return row ? restore(row) : null
  }

  async findActiveForSubscription(
    subscriptionId: string,
    now: Date,
  ): Promise<SubscriptionOperation | null> {
    const [row] = await this.db
      .select()
      .from(subscriptionOperations)
      .where(
        and(
          eq(subscriptionOperations.subscriptionId, subscriptionId),
          inArray(subscriptionOperations.state, ['READY', 'EXECUTING', 'UNKNOWN']),
          or(ne(subscriptionOperations.state, 'READY'), gt(subscriptionOperations.expiresAt, now)),
        ),
      )
      .orderBy(desc(subscriptionOperations.createdAt))
      .limit(1)
    return row ? restore(row) : null
  }

  async start(
    id: string,
    subscriptionId: string,
    now: Date,
  ): Promise<SubscriptionOperation | null> {
    const [row] = await this.db
      .update(subscriptionOperations)
      .set({
        state: 'EXECUTING',
        startedAt: now,
        executionId: crypto.randomUUID(),
        executionAttempts: sql`${subscriptionOperations.executionAttempts} + 1`,
        completedAt: null,
      })
      .where(
        and(
          eq(subscriptionOperations.id, id),
          eq(subscriptionOperations.subscriptionId, subscriptionId),
          eq(subscriptionOperations.state, 'READY'),
          lte(subscriptionOperations.createdAt, now),
          // SQL guarda o prazo no CAS; uma aba velha não revive uma intenção expirada.
          // >= não é aceito: no instante do vencimento já está encerrada.
          gt(subscriptionOperations.expiresAt, now),
          sql`exists (
            select 1 from ${subscriptions} where ${subscriptions.id} = ${subscriptionOperations.subscriptionId}
              and ${subscriptions.consumerId} = ${subscriptionOperations.consumerId}
              and ${subscriptions.providerSubscriptionId} = ${subscriptionOperations.providerSubscriptionId}
              and ((${subscriptionOperations.kind} = 'CANCEL' and ${subscriptions.status} in ('ACTIVE', 'PENDING') and ${subscriptions.cancelRequestedAt} is not null)
                or (${subscriptionOperations.kind} <> 'CANCEL' and ${subscriptions.status} = 'ACTIVE' and ${subscriptions.cancelRequestedAt} is null))
          )`,
        ),
      )
      .returning()
    return row ? restore(row) : null
  }

  async finish(
    id: string,
    executionId: string,
    state: 'UNKNOWN' | 'SUCCEEDED' | 'REJECTED',
    result: string,
    now: Date,
  ): Promise<void> {
    const rows = await this.db
      .update(subscriptionOperations)
      .set({ state, result, completedAt: now })
      .where(
        and(
          eq(subscriptionOperations.id, id),
          eq(subscriptionOperations.executionId, executionId),
          eq(subscriptionOperations.state, 'EXECUTING'),
          lte(subscriptionOperations.startedAt, now),
        ),
      )
      .returning({ id: subscriptionOperations.id })
    if (rows.length !== 1) throw new ConcurrencyConflictError(id)
  }

  async rejectUnstartedForCancellation(subscriptionId: string, now: Date): Promise<void> {
    await this.db
      .update(subscriptionOperations)
      .set({ state: 'REJECTED', result: 'CANCELLATION_REQUESTED', completedAt: now })
      .where(
        and(
          eq(subscriptionOperations.subscriptionId, subscriptionId),
          eq(subscriptionOperations.state, 'READY'),
          ne(subscriptionOperations.kind, 'CANCEL'),
          sql`exists (select 1 from ${subscriptions} where ${subscriptions.id} = ${subscriptionOperations.subscriptionId} and ${subscriptions.cancelRequestedAt} is not null)`,
        ),
      )
  }

  async confirmPaidRetry(
    input: Parameters<SubscriptionOperationRepository['confirmPaidRetry']>[0],
  ): Promise<SubscriptionOperation> {
    const confirmation = readOperationConfirmation(input.confirmation)
    if (confirmation.confirmedAt !== input.now.toISOString())
      throw new ValidationError('Instante de conferência divergente')
    return this.db.transaction(async (tx) => {
      // Same subscription-first order as cancellation. Never wait for this lock while holding its operation.
      const [subscription] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, input.operation.subscriptionId))
        .for('update')
      const [row] = await tx
        .select()
        .from(subscriptionOperations)
        .where(eq(subscriptionOperations.id, input.operation.id))
        .for('update')
      if (
        !row ||
        !subscription ||
        row.subscriptionId !== subscription.id ||
        row.consumerId !== subscription.consumerId ||
        row.providerSubscriptionId !== subscription.providerSubscriptionId
      )
        throw new ValidationError('Origem da operação divergente')
      const current = restore(row)
      if (
        current.state === 'SUCCEEDED' &&
        current.confirmation?.requestId === confirmation.requestId &&
        current.confirmation.actorId === confirmation.actorId
      )
        return current
      assertRetryConfirmationCandidate(current, this.clock())
      if (
        current.executionAttempts !== input.operation.executionAttempts ||
        current.executionId !== input.operation.executionId ||
        current.state !== input.operation.state ||
        current.providerPaymentId !== input.operation.providerPaymentId ||
        current.amountInCents !== input.operation.amountInCents
      )
        throw new ConcurrencyConflictError(current.id)
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, confirmation.paymentId))
        .for('update')
      if (
        payment?.status !== 'PAID' ||
        payment.method !== 'CREDIT_CARD' ||
        payment.version !== confirmation.paymentVersion ||
        payment.consumerId !== current.consumerId ||
        payment.subscriptionId !== current.subscriptionId ||
        payment.providerPaymentId !== current.providerPaymentId ||
        payment.provider !== subscription.provider ||
        payment.currency !== current.currency ||
        payment.amountInCents !== current.amountInCents ||
        subscription.amountInCents !== current.amountInCents ||
        subscription.currency !== current.currency ||
        payment.cycleAccess?.kind !== 'VERIFIED_PERIOD' ||
        payment.cycleAccess.period.startsAt !== confirmation.period.startsAt ||
        payment.cycleAccess.period.endsAt !== confirmation.period.endsAt ||
        current.retryTerms?.period.startsAt !== confirmation.period.startsAt ||
        current.retryTerms?.period.endsAt !== confirmation.period.endsAt
      )
        throw new ValidationError('O pagamento ou seu período mudou durante a conferência')
      // Revalidate after lock waits: a fresh proof cannot grow stale while waiting for another writer.
      const persistedAt = new Date(this.clock())
      if (persistedAt < input.now) throw new ValidationError('Relógio da conferência divergente')
      const persistedConfirmation = readOperationConfirmation({
        ...confirmation,
        confirmedAt: persistedAt.toISOString(),
      })
      const [saved] = await tx
        .update(subscriptionOperations)
        .set({
          state: 'SUCCEEDED',
          result: 'CHARGE_PAID_RECONCILED',
          completedAt: persistedAt,
          confirmation: persistedConfirmation,
        })
        .where(
          and(
            eq(subscriptionOperations.id, current.id),
            eq(subscriptionOperations.state, current.state),
            eq(subscriptionOperations.executionId, current.executionId),
            eq(subscriptionOperations.executionAttempts, current.executionAttempts),
          ),
        )
        .returning()
      if (!saved) throw new ConcurrencyConflictError(current.id)
      return restore(saved)
    })
  }

  async rejectWithdrawnCancellation(
    subscriptionId: string,
    caseId: string,
    now: Date,
  ): Promise<void> {
    await this.db
      .update(subscriptionOperations)
      .set({ state: 'REJECTED', result: 'RECOVERY_PAID', completedAt: now })
      .where(
        and(
          eq(subscriptionOperations.subscriptionId, subscriptionId),
          eq(subscriptionOperations.kind, 'CANCEL'),
          eq(subscriptionOperations.state, 'READY'),
          sql`exists (select 1 from ${subscriptions} where ${subscriptions.id} = ${subscriptionOperations.subscriptionId} and ${subscriptions.consumerId} = ${subscriptionOperations.consumerId} and ${subscriptions.cancelRequestedAt} is null and ${subscriptions.cancellationRecord}->>'origin' = 'NONPAYMENT' and ${subscriptions.cancellationRecord}->>'recoveryCaseId' = ${caseId} and ${subscriptions.cancellationRecord}->>'withdrawnAt' is not null)`,
        ),
      )
  }

  async resumeCancellation(
    id: string,
    subscriptionId: string,
    now: Date,
    staleAfterMs: number,
  ): Promise<SubscriptionOperation | null> {
    if (
      !Number.isFinite(now.getTime()) ||
      !Number.isSafeInteger(staleAfterMs) ||
      staleAfterMs < 30_000 ||
      staleAfterMs > 900_000
    )
      throw new ValidationError('Prazo da confirmação de cancelamento inválido')
    const [row] = await this.db
      .update(subscriptionOperations)
      .set({
        state: 'EXECUTING',
        startedAt: now,
        completedAt: null,
        executionId: crypto.randomUUID(),
        executionAttempts: sql`${subscriptionOperations.executionAttempts} + 1`,
      })
      .where(
        and(
          eq(subscriptionOperations.id, id),
          eq(subscriptionOperations.subscriptionId, subscriptionId),
          eq(subscriptionOperations.kind, 'CANCEL'),
          inArray(subscriptionOperations.state, ['EXECUTING', 'UNKNOWN']),
          lte(subscriptionOperations.startedAt, new Date(now.getTime() - staleAfterMs)),
          sql`exists (select 1 from ${subscriptions} where ${subscriptions.id} = ${subscriptionOperations.subscriptionId} and ${subscriptions.consumerId} = ${subscriptionOperations.consumerId} and ${subscriptions.providerSubscriptionId} = ${subscriptionOperations.providerSubscriptionId} and ${subscriptions.cancelRequestedAt} is not null)`,
        ),
      )
      .returning()
    return row ? restore(row) : null
  }
}

function restore(row: typeof subscriptionOperations.$inferSelect): SubscriptionOperation {
  if (row.currency !== 'BRL') throw new Error('Moeda inválida na intenção de assinatura')
  return {
    ...row,
    currency: row.currency,
    retryTerms: row.retryTerms ? readRetryTerms(row.retryTerms) : null,
    confirmation: row.confirmation ? readOperationConfirmation(row.confirmation) : null,
  }
}
