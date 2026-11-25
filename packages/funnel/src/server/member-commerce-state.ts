import type { CommerceContact } from '@sistemazero/core/commerce'
import type { MemberCheckoutPresentation } from '../db/member-commerce-types'
import { json, jsonError } from '../lib/http'
import { type CheckoutDeps, pixStatus } from './checkout'
import type { MemberCheckout, MemberCustomer } from './member-commerce-store'

/** O que a cobrança aberta cobra de fato (lido do `offerSnapshot` de `lead_payments`). */
export interface MemberCheckoutCharge {
  listPriceCents: number
  discountCents: number
  chargedPriceCents: number
  couponCode: string | null
}

function chargeOf(snapshot: unknown): MemberCheckoutCharge | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const s = snapshot as Record<string, unknown>
  const cents = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null)
  const list = cents(s.listPriceCents)
  const discount = cents(s.discountCents)
  const charged = cents(s.chargedPriceCents)
  if (list === null || discount === null || charged === null) return null
  return {
    listPriceCents: list,
    discountCents: discount,
    chargedPriceCents: charged,
    couponCode: typeof s.couponCode === 'string' && s.couponCode ? s.couponCode : null,
  }
}

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
  let payment: { status: string; charge?: MemberCheckoutCharge } | null = null
  if (lead.paymentId) {
    const paymentId = lead.paymentId
    const response = await pixStatus(new Request('http://member-commerce/status'), paymentId, deps)
    if (!response.ok) return response
    payment = await response.json()
    // O valor desta cobrança (com o cupom) vem do contrato congelado no pagamento: a tela do Pix
    // mostra o que foi cobrado, não o preço de tabela da oferta.
    const charge = chargeOf((await deps.repo.paymentContext(paymentId))?.offerSnapshot)
    if (payment && charge) payment = { ...payment, charge }
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
