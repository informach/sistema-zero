import type { CommerceContact } from '@sistemazero/core/commerce'
import { z } from 'zod'
import type { PreparedMemberCharge } from '../db/member-commerce-types'
import {
  AddressSchema,
  BirthSchema,
  CardChargeSchema,
  CheckoutContactSchema,
  PixChargeSchema,
  SubscriptionChargeSchema,
} from '../lib/checkout-schema'
import { json, jsonError } from '../lib/http'
import { type CheckoutDeps, prepareCard, preparePix, prepareSubscription } from './checkout'
import { executeCheckoutPlan } from './checkout-dispatch'
import { runPostPayment } from './checkout-fulfillment'
import { canReleaseProductClaim } from './member-commerce-claim'
import { memberCheckoutState } from './member-commerce-state'
import type { MemberCheckout, MemberCommerceStore, MemberCustomer } from './member-commerce-store'

export async function chargeMemberCheckout(
  data: Record<string, unknown>,
  checkout: MemberCheckout,
  account: { userId: string; email: string },
  contact: CommerceContact,
  saved: MemberCustomer | null,
  deps: CheckoutDeps,
  store: MemberCommerceStore,
  funnelUrl: string,
): Promise<Response> {
  const selected = await store.withProductLock(
    account.userId,
    checkout.presentation.offer.product.id,
    async (unit) => {
      const current = await unit.owned(checkout.id)
      if (!current || current.leadId !== checkout.leadId)
        return jsonError('Compra não encontrada.', 404, 'NOT_FOUND')
      // Outra oferta (mensal/anual, aula/card) pode ter tomado posse desde a consulta do BFF.
      if (
        unit.claim &&
        (unit.claim.checkoutId !== current.id || unit.claim.leadId !== current.leadId)
      ) {
        if (
          !(await canReleaseProductClaim(
            unit,
            deps.gateway,
            account.userId,
            checkout.presentation.offer.product.id,
          ))
        ) {
          const prior = await unit.owned(unit.claim.checkoutId)
          return prior?.leadId === unit.claim.leadId
            ? { checkout: await unit.registerOrigins(prior, checkout.originKeys), dispatch: false }
            : jsonError(
                'Há uma compra deste produto em processamento. Confira sua conta.',
                409,
                'PAYMENT_IN_PROGRESS',
              )
        }
      }
      const lead = await unit.repo.getLead(current.leadId)
      if (!lead || lead.buyerUserId !== account.userId)
        return jsonError('Compra não encontrada.', 404, 'NOT_FOUND')
      // O plano salvo é a fonte da verdade: não recotar, validar novo token nem mudar a chave.
      if (current.dispatchPlan) return { checkout: current, dispatch: true }
      if (lead.paymentId || lead.subscriptionId || lead.paidAt)
        return { checkout: current, dispatch: false }
      if (current.pendingRequest)
        return jsonError(
          'Esta tentativa precisa ser conferida antes de outro pagamento.',
          409,
          'PAYMENT_IN_PROGRESS',
        )
      if (data.resume === true)
        return jsonError(
          'Não há processamento a retomar. Confira o andamento.',
          409,
          'PAYMENT_IN_PROGRESS',
        )
      const { offer, terms } = checkout.presentation
      if (!offer.isAvailable)
        return jsonError(
          'Esta oferta não está disponível para novas compras.',
          410,
          'OFFER_UNAVAILABLE',
        )
      if (data.termsVersion !== terms.version)
        return jsonError(
          'As condições da oferta mudaram. Confira novamente antes de confirmar.',
          409,
          'OFFER_CHANGED',
        )
      if (data.acceptedTerms !== true)
        return jsonError('Confirme as condições da compra.', 400, 'TERMS_REQUIRED')
      const posted = z.record(z.string(), z.unknown()).safeParse(data.contact)
      const billing = CheckoutContactSchema.safeParse({
        ...contact,
        ...(posted.success ? posted.data : {}),
        email: account.email,
      })
      if (!billing.success)
        return json(
          {
            error: { code: 'MISSING_CUSTOMER_DATA', message: 'Confira os dados de cobrança.' },
            fields: z.flattenError(billing.error).fieldErrors,
          },
          400,
        )
      const birth = data.birth ?? saved?.birth ?? undefined
      const address = data.address ?? saved?.address ?? undefined
      if (data.method !== 'pix' && data.method !== 'card')
        return jsonError('Escolha a forma de pagamento.', 400, 'BAD_REQUEST')
      const method =
        data.method === 'card' && offer.pricingMode === 'subscription'
          ? 'subscription'
          : data.method
      const schema =
        method === 'pix'
          ? PixChargeSchema
          : method === 'subscription'
            ? SubscriptionChargeSchema
            : CardChargeSchema
      const validated = schema.safeParse({
        ...data,
        contact: billing.data,
        birth,
        address,
        offerSlug: offer.slug,
        attemptId: current.cardAttemptId,
      })
      if (!validated.success)
        return jsonError(
          'Confira os dados necessários para esta forma de pagamento.',
          400,
          'MISSING_CUSTOMER_DATA',
        )
      const request: PreparedMemberCharge = {
        method,
        body: validated.data,
        termsVersion: terms.version,
        expectedPriceCents:
          typeof data.expectedPriceCents === 'number' ? data.expectedPriceCents : offer.priceCents,
      }
      const chargeDeps = {
        ...deps,
        repo: unit.repo,
        leadId: current.leadId,
        termsVersion: terms.version,
        expectedPriceCents: request.expectedPriceCents,
        fulfill: undefined,
        grantMembers: undefined,
        sendWelcome: undefined,
      }
      const http = new Request('http://member-commerce/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request.body),
      })
      const plan = await (method === 'pix'
        ? preparePix(http, chargeDeps)
        : method === 'subscription'
          ? prepareSubscription(http, chargeDeps)
          : prepareCard(http, chargeDeps))
      if (plan instanceof Response) return plan
      const addressParsed = AddressSchema.safeParse(address)
      const birthParsed = BirthSchema.safeParse(birth)
      const prepared = await unit.savePlan(
        { ...current, presentation: checkout.presentation },
        request,
        plan,
        {
          contact: billing.data,
          ...(addressParsed.success ? { address: addressParsed.data } : {}),
          ...(birthParsed.success ? { birth: birthParsed.data } : {}),
        },
      )
      return { checkout: prepared, dispatch: true }
    },
  )
  if (selected instanceof Response) return selected
  const target = selected.checkout
  const executionDeps = { ...deps, leadId: target.leadId }
  // O COMMIT do plano/reivindicação acontece antes da chamada externa. Não ocupar uma
  // transação durante cobrança/fulfillment: também funciona com pool de uma conexão.
  if (selected.dispatch && target.dispatchPlan) {
    const result = await executeCheckoutPlan(target.dispatchPlan, executionDeps)
    if (result.outcome === 'rejected') {
      await store.rejectPlan(target.id, account.userId, target.dispatchPlan.id)
      return jsonError(
        'Confira os dados de cobrança e tente novamente.',
        400,
        'MISSING_CUSTOMER_DATA',
      )
    }
    if (result.outcome === 'unknown') return result.response
    await store.clearRecordedPlan(target.id, account.userId, target.dispatchPlan.id)
  }
  await runPostPayment(target.leadId, executionDeps)
  const fresh = await store.owned(target.id, account.userId)
  return memberCheckoutState(
    fresh ?? target,
    contact,
    await store.customer(account.userId),
    executionDeps,
    funnelUrl,
  )
}
