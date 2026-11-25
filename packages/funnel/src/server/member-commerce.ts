import {
  type CheckoutTerms,
  type CommerceCatalogOffer,
  CommerceCatalogOfferSchema,
  CommerceOriginSchema,
} from '@sistemazero/core/commerce'
import { sanitizeOriginPlace } from '@sistemazero/core/referrals'
import { z } from 'zod'
import type { FunnelRepo } from '../db/repo'
import { computeFixedAccessExpiry, fixedAccessFromSnapshot } from '../lib/access-period'
import { CouponCodeSchema } from '../lib/checkout-schema'
import type { GatewayClient } from '../lib/gateway-client'
import { json, jsonError, safeJson } from '../lib/http'
import { safeEqual } from '../lib/safe-equal'
import { resolveCharge } from './catalog'
import type { CheckoutDeps } from './checkout'
import { chargeMemberCheckout } from './member-commerce-charge'
import { memberCheckoutState } from './member-commerce-state'
import type { MemberCommerceStore } from './member-commerce-store'
import { parsePurchasedOfferSnapshot } from './purchased-offer-snapshot'

const inputSchema = z.strictObject({
  account: z.strictObject({
    userId: z.uuid(),
    email: z.email(),
    name: z.string().min(1).max(200),
    phone: z.string().max(30).optional(),
    audience: z.enum(['kids', 'adult']),
  }),
  origin: CommerceOriginSchema,
  offerRef: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,139}$/)
    .optional(),
  checkoutId: z.uuid().optional(),
  /** O botão da plataforma (`pais-inicio`, `pais-curso-fechado`, `aula`...): o BFF deriva da origem. */
  place: z.string().max(48).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
})
export interface MemberCommerceDeps {
  internalToken: string
  repo: FunnelRepo
  gateway: GatewayClient
  store: MemberCommerceStore
  checkout: Omit<CheckoutDeps, 'repo' | 'gateway' | 'resolveOffer'>
  funnelUrl: string
  termsForOffer: (offer: CommerceCatalogOffer, audience: 'kids' | 'adult') => CheckoutTerms | null
  defaultOfferRef?: (audience: 'kids' | 'adult') => string | undefined | Promise<string | undefined>
}

/** Entrada S2S: identidade e oferta vêm do BFF, depois de conferir sessão e origem publicada. */
export async function handleMemberCommerce(
  request: Request,
  action: string,
  deps: MemberCommerceDeps,
): Promise<Response> {
  const token = request.headers.get('x-internal-token')
  if (!token || !deps.internalToken || !safeEqual(token, deps.internalToken))
    return jsonError('Não autorizado.', 401, 'UNAUTHORIZED')
  if (
    ![
      'inspect',
      'recover',
      'pending',
      'pay',
      'status',
      'restart',
      'default-offer',
      'quote',
    ].includes(action)
  )
    return jsonError('Ação inválida.', 404, 'NOT_FOUND')
  const parsed = inputSchema.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Pedido inválido.', 400, 'BAD_REQUEST')
  const input = parsed.data
  const place = sanitizeOriginPlace(input.place)
  if (action === 'pending') {
    const rows = await deps.store.pending(input.account.userId, input.account.audience)
    return json({
      items: rows.map((row) => ({
        checkoutId: row.id,
        origin: row.origin,
        title: row.presentation.offer.name,
      })),
    })
  }
  if (action === 'default-offer') {
    const ref = await deps.defaultOfferRef?.(input.account.audience)
    if (!ref) return jsonError('Oferta não configurada.', 503, 'OFFER_UNAVAILABLE')
    const response = await deps.gateway.getOffer(ref)
    const parsedOffer = CommerceCatalogOfferSchema.safeParse(response.body)
    return response.status === 200 &&
      parsedOffer.success &&
      parsedOffer.data.isAvailable &&
      parsedOffer.data.product.audience === input.account.audience
      ? json({ offer: parsedOffer.data })
      : jsonError('Oferta indisponível.', 503, 'OFFER_UNAVAILABLE')
  }
  const owned =
    action === 'recover'
      ? await deps.store.recover(input.account.userId, input.account.audience, input.origin)
      : input.checkoutId
        ? await deps.store.owned(input.checkoutId, input.account.userId)
        : null
  if (input.checkoutId && !owned) return jsonError('Compra não encontrada.', 404, 'NOT_FOUND')
  if (owned && owned.presentation.offer.product.audience !== input.account.audience)
    return jsonError('Compra não encontrada.', 404, 'NOT_FOUND')
  const saved = await deps.store.customer(input.account.userId)
  const contact = {
    nome: saved?.contact.nome || input.account.name,
    email: input.account.email,
    cpf: saved?.contact.cpf || '',
    telefone: saved?.contact.telefone || input.account.phone || '',
  }
  function checkoutDeps(checkout: NonNullable<typeof owned>): CheckoutDeps {
    const { offer, terms } = checkout.presentation
    return {
      ...deps.checkout,
      repo: deps.repo,
      gateway: deps.gateway,
      leadId: checkout.leadId,
      termsVersion: terms.version,
      resolveOffer: () => ({
        offerSlug: offer.slug,
        productName: offer.name,
        productSku: offer.product.sku,
      }),
    }
  }
  async function stateOf(checkout: NonNullable<typeof owned>) {
    const response = await memberCheckoutState(
      checkout,
      contact,
      saved,
      checkoutDeps(checkout),
      deps.funnelUrl,
    )
    // Poll/webhook podem concluir a entrega depois de uma falha local no despacho.
    // A confirmação completa permite remover o token sem reenviar a criação.
    if (response.ok && checkout.dispatchPlan) {
      const lead = await deps.repo.getLead(checkout.leadId)
      if (lead?.paidAt && lead.membersGrantedAt)
        await deps.store.clearRecordedPlan(
          checkout.id,
          input.account.userId,
          checkout.dispatchPlan.id,
        )
    }
    return response
  }
  if (action === 'recover') {
    const lead = owned ? await deps.repo.getLead(owned.leadId) : null
    if (
      !owned ||
      !lead ||
      (!owned.pendingRequest && !owned.dispatchPlan && !lead.paymentId && !lead.subscriptionId) ||
      (lead.paidAt && lead.membersGrantedAt)
    )
      return jsonError('Nenhuma compra em andamento.', 404, 'NOT_FOUND')
    return stateOf(owned)
  }
  if (owned && action === 'status') return stateOf(owned)
  if (owned && action === 'pay' && input.data?.resume === true)
    return chargeMemberCheckout(
      input.data,
      owned,
      input.account,
      contact,
      saved,
      checkoutDeps(owned),
      deps.store,
      deps.funnelUrl,
      place,
    )
  const found = await deps.gateway.getOffer(input.offerRef ?? owned?.offerRef ?? '')
  const offerParsed = CommerceCatalogOfferSchema.safeParse(found.body)
  if (found.status !== 200 || !offerParsed.success)
    return jsonError('Não foi possível consultar a oferta.', 503, 'OFFER_UNAVAILABLE')
  const offer = offerParsed.data
  if (offer.product.audience !== input.account.audience || offer.product.status !== 'active')
    return jsonError('Oferta não disponível.', 404, 'OFFER_UNAVAILABLE')
  if (action === 'quote') return quoteMemberOffer(deps, offer, input.data?.couponCode)
  const terms = offer.content?.checkoutTerms ?? deps.termsForOffer(offer, input.account.audience)
  if (!terms)
    return jsonError(
      'As condições desta oferta precisam ser configuradas no Catálogo.',
      503,
      'TERMS_UNAVAILABLE',
    )
  const presentation = { offer, terms }
  let checkout =
    action === 'inspect' && offer.isAvailable
      ? await deps.store.prepare({
          accountId: input.account.userId,
          offerId: offer.id,
          offerRef: offer.slug,
          origin: input.origin,
          contact,
          presentation,
          context: {
            accountId: input.account.userId,
            audience: input.account.audience,
            origin: input.origin,
            termsVersion: terms.version,
          },
        })
      : owned
  if (!checkout || checkout.offerId !== offer.id)
    return jsonError('Compra não encontrada.', 404, 'NOT_FOUND')
  const previous = await deps.repo.getLead(checkout.leadId)
  let replace = false
  if (action === 'restart') {
    if (!offer.isAvailable || !previous?.paymentId || previous.paidAt)
      return jsonError('Confira o pagamento antes de iniciar outro.', 409, 'PAYMENT_IN_PROGRESS')
    const payment = await deps.gateway.getPayment(previous.paymentId)
    const status = z.object({ status: z.string() }).safeParse(payment.body)
    if (
      payment.status !== 200 ||
      !status.success ||
      !['FAILED', 'EXPIRED', 'CANCELED'].includes(status.data.status)
    )
      return jsonError(
        'O pagamento ainda não foi encerrado. Confira o andamento.',
        409,
        'PAYMENT_IN_PROGRESS',
      )
    if (previous.subscriptionId) {
      const sub = await deps.gateway.getSubscription(previous.subscriptionId)
      const state = z.object({ status: z.string() }).safeParse(sub.body)
      if (
        sub.status !== 200 ||
        !state.success ||
        !['CANCELED', 'EXPIRED'].includes(state.data.status)
      )
        return jsonError(
          'Gerencie a assinatura existente antes de iniciar outra.',
          409,
          'SUBSCRIPTION_EXISTS',
        )
    }
    replace = true
  } else if (action === 'inspect' && previous?.paidAt && previous.membersGrantedAt) {
    if (previous.subscriptionId) {
      const sub = await deps.gateway.getSubscription(previous.subscriptionId)
      const state = z.object({ status: z.string() }).safeParse(sub.body)
      replace =
        sub.status === 200 && state.success && ['CANCELED', 'EXPIRED'].includes(state.data.status)
    } else if (previous.paymentId) {
      const context = await deps.repo.paymentContext(previous.paymentId)
      const access = fixedAccessFromSnapshot(parsePurchasedOfferSnapshot(context?.offerSnapshot))
      replace =
        access !== null && computeFixedAccessExpiry(previous.paidAt, access).getTime() <= Date.now()
    }
  }
  if (replace) {
    checkout = await deps.store.prepare({
      accountId: input.account.userId,
      offerId: offer.id,
      offerRef: offer.slug,
      origin: input.origin,
      contact,
      presentation,
      context: {
        accountId: input.account.userId,
        audience: input.account.audience,
        origin: input.origin,
        termsVersion: terms.version,
      },
      replaceCheckoutId: checkout.id,
    })
  }
  if (action === 'pay')
    return chargeMemberCheckout(
      input.data ?? {},
      { ...checkout, presentation },
      input.account,
      contact,
      saved,
      checkoutDeps({ ...checkout, presentation }),
      deps.store,
      deps.funnelUrl,
      place,
    )
  return memberCheckoutState(
    checkout,
    contact,
    saved,
    checkoutDeps(checkout),
    deps.funnelUrl,
    checkout.pendingRequest ? checkout.presentation : presentation,
  )
}

/**
 * O cupom do mini checkout (25/11/2026): a cotação autoritativa do catálogo, nunca do navegador.
 * Assinatura não aceita cupom (o valor cotado viraria o de todos os ciclos), nem oferta sem a marca
 * `allowsCoupon`. O valor final volta como `expectedPriceCents` no pagamento.
 */
async function quoteMemberOffer(
  deps: MemberCommerceDeps,
  offer: CommerceCatalogOffer,
  raw: unknown,
): Promise<Response> {
  if (!offer.isAvailable)
    return jsonError(
      'Esta oferta não está disponível para novas compras.',
      410,
      'OFFER_UNAVAILABLE',
    )
  if (offer.pricingMode === 'subscription' || offer.content?.allowsCoupon !== true)
    return jsonError('Esta oferta não aceita cupom.', 422, 'COUPON_NOT_ALLOWED')
  const code = CouponCodeSchema.safeParse(typeof raw === 'string' ? raw.trim() : raw)
  if (!code.success || !code.data)
    return jsonError('Confira o código do cupom.', 422, 'INVALID_COUPON')
  const charge = await resolveCharge(deps.gateway, offer.slug, code.data)
  if (!charge.ok) return jsonError(charge.message, charge.status, charge.code)
  return json({
    offerSlug: offer.slug,
    listPriceCents: charge.listPriceCents,
    discountCents: charge.discountCents,
    finalPriceCents: charge.amountInCents,
    couponCode: charge.couponCode,
  })
}
