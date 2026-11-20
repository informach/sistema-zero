import type { CommerceContact } from '@sistemazero/core/commerce'
import type { MemberCheckoutPresentation } from '../db/member-commerce-types'
import { json, jsonError } from '../lib/http'
import { type CheckoutDeps, pixStatus } from './checkout'
import type { MemberCheckout, MemberCustomer } from './member-commerce-store'

export async function memberCheckoutState(
  checkout: MemberCheckout,
  contact: CommerceContact,
  saved: MemberCustomer | null,
  deps: CheckoutDeps,
  funnelUrl: string,
  presentation: MemberCheckoutPresentation = checkout.presentation,
): Promise<Response> {
  let lead = await deps.repo.getLead(checkout.leadId)
  if (!lead || lead.buyerUserId !== checkout.accountId)
    return jsonError('Compra não encontrada.', 404, 'NOT_FOUND')
  let payment: { status: string } | null = null
  if (lead.paymentId) {
    const response = await pixStatus(
      new Request('http://member-commerce/status'),
      lead.paymentId,
      deps,
    )
    if (!response.ok) return response
    payment = await response.json()
    lead = await deps.repo.getLead(checkout.leadId)
  }
  const terminal =
    payment && ['FAILED', 'EXPIRED', 'CANCELED', 'REFUNDED'].includes(payment.status)
      ? payment.status
      : null
  return json({
    checkoutId: checkout.id,
    origin: checkout.origin,
    offer: presentation.offer,
    contact,
    birth: saved?.birth ?? '',
    address: saved?.address ?? null,
    payment,
    status:
      terminal ??
      (lead?.paidAt
        ? 'PAID'
        : checkout.dispatchPlan || checkout.pendingRequest
          ? 'PROCESSING'
          : lead?.paymentId || lead?.subscriptionId
            ? 'PENDING'
            : 'READY'),
    accessGranted: Boolean(lead?.membersGrantedAt),
    termsVersion: presentation.terms.version,
    termsUrl: presentation.terms.url,
    privacyUrl: new URL('/privacidade', funnelUrl).href,
  })
}
