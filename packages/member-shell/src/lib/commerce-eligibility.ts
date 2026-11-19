import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'
import { type MySubscriptionView, paidSubscriptionPeriodRunning } from './subscription-card'

export interface CommerceAccess {
  productId: string
  offerId: string | null
  subscriptionId?: string | null
  expiresAt: string | null
  kind: 'gift' | 'manual' | 'paid'
}
export function hasOngoingSubscription(subscription: MySubscriptionView, now = new Date()) {
  return (
    subscription.status === 'ACTIVE' ||
    subscription.status === 'PENDING' ||
    Boolean(subscription.pendingOperation) ||
    paidSubscriptionPeriodRunning(subscription, now)
  )
}
export function commerceEligibility(
  offer: CommerceCatalogOffer,
  access: CommerceAccess[],
  subscriptions: { subscription: MySubscriptionView; productId: string | null }[],
  now = new Date(),
) {
  const owned = access.filter((a) => a.productId === offer.product.id)
  if (owned.some((a) => a.kind !== 'gift')) return { kind: 'manage' as const }
  const existing = subscriptions.find(
    (s) => s.productId === offer.product.id && hasOngoingSubscription(s.subscription, now),
  )
  if (existing) return { kind: 'manage' as const }
  return {
    kind: 'purchase' as const,
    giftEndsAt: owned.find((a) => a.kind === 'gift')?.expiresAt ?? null,
  }
}
