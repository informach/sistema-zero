import type { SubscriptionCycleAccess } from '@sistemazero/core/billing'
import { addUtcCalendarMonths } from '@sistemazero/core/time'
import type { ProviderSubscription } from '../../domain/ports/payment-gateway.port'

/** Uses original charge creation and the purchased interval, never the late paidAt. */
export function subscriptionCycleAccess(input: {
  providerSubscription: ProviderSubscription
  providerSubscriptionId: string
  providerPaymentId: string
  intervalMonths: number
  observedAt: Date
}): SubscriptionCycleAccess {
  if (input.providerSubscription.providerSubscriptionId !== input.providerSubscriptionId)
    return { version: 1, kind: 'REVIEW_REQUIRED', reason: 'SOURCE_DIVERGENCE' }
  const cycles = input.providerSubscription.charges.filter(
    (charge) => charge.chargeId === input.providerPaymentId,
  )
  const start = cycles[0]?.createdAt
  if (
    cycles.length !== 1 ||
    !start ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(input.observedAt.getTime()) ||
    start > input.observedAt ||
    !Number.isSafeInteger(input.intervalMonths) ||
    input.intervalMonths < 1 ||
    input.intervalMonths > 120
  )
    return { version: 1, kind: 'REVIEW_REQUIRED', reason: 'PERIOD_UNAVAILABLE' }
  const end = addUtcCalendarMonths(start, input.intervalMonths)
  if (!Number.isFinite(end.getTime()) || end <= start)
    return { version: 1, kind: 'REVIEW_REQUIRED', reason: 'PERIOD_UNAVAILABLE' }
  return {
    version: 1,
    kind: 'VERIFIED_PERIOD',
    period: { startsAt: start.toISOString(), endsAt: end.toISOString() },
  }
}
