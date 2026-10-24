import { and, desc, eq, gt, inArray, lte, ne, or, sql } from 'drizzle-orm'
import { ValidationError } from '../../../domain/shared/errors'
import type {
  SubscriptionOperation,
  SubscriptionOperationRepository,
} from '../../../domain/subscription/subscription-operation'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import { subscriptionOperations, subscriptions } from './schema'

export class DrizzleSubscriptionOperationRepository implements SubscriptionOperationRepository {
  constructor(private readonly db: Database) {}

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
  return { ...row, currency: row.currency }
}
