import { readBillingPeriod } from '@sistemazero/core/billing'
import { saoPauloDayKey } from '@sistemazero/core/time'
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { ValidationError } from '../../../domain/shared/errors'
import {
  emptySubscriptionBilling,
  readScheduleObservation,
  type SubscriptionBillingRepository,
  type SubscriptionBillingView,
} from '../../../domain/subscription/subscription-billing'
import type { Database } from './db'
import { payments, subscriptions } from './schema'

export class DrizzleSubscriptionBillingRepository implements SubscriptionBillingRepository {
  constructor(private readonly db: Database) {}

  async recordSchedule(
    input: Parameters<SubscriptionBillingRepository['recordSchedule']>[0],
  ): Promise<void> {
    const observation = readScheduleObservation(input.observation)
    await this.db
      .update(subscriptions)
      .set({ billingSchedule: observation })
      .where(
        and(
          eq(subscriptions.id, input.subscriptionId),
          eq(subscriptions.consumerId, input.consumerId),
          eq(subscriptions.provider, input.provider),
          eq(subscriptions.providerSubscriptionId, input.providerSubscriptionId),
          eq(subscriptions.intervalMonths, input.intervalMonths),
          or(
            sql`${subscriptions.billingSchedule} is null`,
            sql`${subscriptions.billingSchedule}->>'observedAt' < ${observation.observedAt}`,
          ),
        ),
      )
  }

  async readForSubscriptions(
    ids: string[],
    now: Date,
  ): Promise<Map<string, SubscriptionBillingView>> {
    if (!Number.isFinite(now.getTime())) throw new ValidationError('Instante de leitura inválido')
    const result = new Map<string, SubscriptionBillingView>()
    if (!ids.length) return result
    const schedules = await this.db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        cancelRequestedAt: subscriptions.cancelRequestedAt,
        observation: subscriptions.billingSchedule,
      })
      .from(subscriptions)
      .where(inArray(subscriptions.id, ids))
    for (const row of schedules) {
      const view = emptySubscriptionBilling()
      if (row.observation && row.status === 'ACTIVE' && !row.cancelRequestedAt) {
        const observation = readScheduleObservation(row.observation)
        const age = now.getTime() - new Date(observation.observedAt).getTime()
        if (
          age >= 0 &&
          age < 24 * 60 * 60_000 &&
          observation.nextExecution &&
          observation.nextExecution >= saoPauloDayKey(now)
        ) {
          view.nextExecution = observation.nextExecution
          view.scheduleObservedAt = observation.observedAt
        }
      }
      result.set(row.id, view)
    }
    const paid = await this.db
      .selectDistinctOn([payments.subscriptionId], {
        subscriptionId: payments.subscriptionId,
        access: payments.cycleAccess,
      })
      .from(payments)
      .innerJoin(
        subscriptions,
        and(
          eq(payments.subscriptionId, subscriptions.id),
          eq(payments.consumerId, subscriptions.consumerId),
          eq(payments.provider, subscriptions.provider),
        ),
      )
      .where(
        and(
          inArray(subscriptions.id, ids),
          eq(payments.status, 'PAID'),
          eq(payments.method, 'CREDIT_CARD'),
          sql`${payments.cycleAccess}->>'kind' = 'VERIFIED_PERIOD'`,
        ),
      )
      .orderBy(payments.subscriptionId, desc(sql`${payments.cycleAccess}->'period'->>'endsAt'`))
    for (const row of paid) {
      const view = row.subscriptionId ? result.get(row.subscriptionId) : null
      if (view && row.access?.kind === 'VERIFIED_PERIOD') {
        view.paidPeriod = readBillingPeriod(row.access.period)
        // A calendar observed before a newly ingested payment must not advertise that cycle again.
        if (
          view.nextExecution &&
          view.nextExecution < saoPauloDayKey(new Date(view.paidPeriod.endsAt))
        ) {
          view.nextExecution = null
          view.scheduleObservedAt = null
        }
      }
    }
    return result
  }
}
