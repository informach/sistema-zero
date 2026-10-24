import type { BillingPeriod } from '@sistemazero/core/billing'
import type { ProviderSubscription } from '../ports/payment-gateway.port'
import { ValidationError } from '../shared/errors'

export interface SubscriptionScheduleObservation {
  nextExecution: string | null
  observedAt: string
}
export interface SubscriptionBillingView {
  nextExecution: string | null
  scheduleObservedAt: string | null
  paidPeriod: BillingPeriod | null
}
export function emptySubscriptionBilling(): SubscriptionBillingView {
  return { nextExecution: null, scheduleObservedAt: null, paidPeriod: null }
}

export function readScheduleObservation(
  value: SubscriptionScheduleObservation,
): SubscriptionScheduleObservation {
  const observed = new Date(value.observedAt)
  if (!Number.isFinite(observed.getTime()) || observed.toISOString() !== value.observedAt)
    throw new ValidationError('Observação de calendário inválida')
  if (value.nextExecution !== null) {
    const date = new Date(`${value.nextExecution}T12:00:00.000Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value.nextExecution) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value.nextExecution
    )
      throw new ValidationError('Data de calendário inválida')
  }
  return { nextExecution: value.nextExecution, observedAt: observed.toISOString() }
}

export function observeSubscriptionSchedule(
  source: ProviderSubscription,
  observedAt: Date,
): SubscriptionScheduleObservation {
  return readScheduleObservation({
    nextExecution: source.status === 'ACTIVE' ? (source.nextExecution ?? null) : null,
    observedAt: observedAt.toISOString(),
  })
}

/** Advisory read projection only. It grants no access and cannot authorize a charge. */
export interface SubscriptionBillingRepository {
  recordSchedule(input: {
    subscriptionId: string
    consumerId: string
    provider: string
    providerSubscriptionId: string
    intervalMonths: number
    observation: SubscriptionScheduleObservation
  }): Promise<void>
  readForSubscriptions(ids: string[], now: Date): Promise<Map<string, SubscriptionBillingView>>
}
