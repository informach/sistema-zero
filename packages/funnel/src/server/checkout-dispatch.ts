import { z } from 'zod'
import type { CreateSubscriptionInput } from '../lib/gateway-client'
import { json, jsonError } from '../lib/http'
import { redeemCouponBestEffort } from './catalog'
import type { CheckoutDeps } from './checkout'
import { runPostPayment } from './checkout-fulfillment'
import type { CheckoutPlan } from './checkout-plan'
import { paymentApprovedAt } from './payment-approved-at'

const paymentReceipt = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  paidAt: z.string().nullable().optional(),
  pix: z
    .object({
      copiaECola: z.string(),
      imagemQrcodeBase64: z.string().optional(),
      expiresAt: z.string().nullable(),
    })
    .nullable()
    .optional(),
  card: z
    .object({ brand: z.string(), last4: z.string(), installments: z.number() })
    .nullable()
    .optional(),
})
const subscriptionReceipt = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  firstPayment: z
    .object({
      id: z.string().min(1),
      status: z.string().min(1),
      paidAt: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})
const errorEnvelope = z.object({
  error: z.object({ code: z.string(), message: z.string().optional() }),
  paymentCreation: z.literal('not_started').optional(),
})
/** Somente falhas em que Payments comprova ausência de criação financeira.
 * Recusa do banco com paymentId é um recibo; timeout/PROVIDER_ERROR/409 nunca liberam a intenção.
 */
const PRE_CREATION_REJECTIONS = new Set([
  'VALIDATION_ERROR',
  'PARSE_ERROR',
  'CARD_DATA_INCOMPLETE',
  'SUBSCRIPTION_DATA_INCOMPLETE',
  'BOLETO_DATA_INCOMPLETE',
  'UNSUPPORTED_PAYMENT_METHOD',
])
export interface CheckoutExecution {
  outcome: 'recorded' | 'rejected' | 'unknown'
  response: Response
  rejectionCode?: string
}

/** Compartilhado entre checkout público e autenticado. Não recota nem altera um plano salvo. */
export async function executeCheckoutPlan(
  plan: CheckoutPlan,
  deps: CheckoutDeps,
): Promise<CheckoutExecution> {
  const body: unknown = JSON.parse(plan.bodyJson)
  let result: Awaited<ReturnType<CheckoutDeps['gateway']['createPayment']>>
  try {
    result =
      plan.kind === 'subscription'
        ? await deps.gateway.createSubscription(
            body as CreateSubscriptionInput,
            plan.idempotencyKey,
          )
        : await deps.gateway.createPayment(body, plan.idempotencyKey)
  } catch {
    deps.log?.('checkout.dispatch_unknown', { leadId: plan.leadId, kind: plan.kind })
    return {
      outcome: 'unknown',
      response: jsonError(
        'Não foi possível conferir o processamento. Acompanhe esta compra antes de tentar outro pagamento.',
        502,
        'GATEWAY_ERROR',
      ),
    }
  }
  const accepted = result.status === 201 || (plan.kind !== 'subscription' && result.status === 202)
  if (!accepted) {
    const parsed = errorEnvelope.safeParse(result.body)
    const code = parsed.success ? parsed.data.error.code : ''
    deps.log?.(`checkout.${plan.kind}.gateway_error`, {
      leadId: plan.leadId,
      status: result.status,
      code,
      ...(parsed.success && !['VALIDATION_ERROR', 'PARSE_ERROR'].includes(code)
        ? { message: parsed.data.error.message }
        : {}),
    })
    const rejected =
      [400, 422].includes(result.status) &&
      parsed.success &&
      parsed.data.paymentCreation === 'not_started' &&
      PRE_CREATION_REJECTIONS.has(code)
    return {
      outcome: rejected ? 'rejected' : 'unknown',
      ...(rejected ? { rejectionCode: code } : {}),
      response:
        result.status === 409 && code === 'IDEMPOTENCY_IN_FLIGHT'
          ? jsonError(
              'Seu pagamento já está sendo processado, aguarde alguns segundos.',
              409,
              'PAYMENT_IN_PROGRESS',
            )
          : jsonError('Não foi possível processar o pagamento.', 502, 'GATEWAY_ERROR'),
    }
  }
  const event = plan.kind === 'pix' ? 'checkout' : `checkout_${plan.kind}`
  if (plan.kind === 'subscription') {
    const parsed = subscriptionReceipt.safeParse(result.body)
    if (!parsed.success)
      return {
        outcome: 'unknown',
        response: jsonError(
          'Não foi possível conferir o recibo da assinatura.',
          502,
          'GATEWAY_ERROR',
        ),
      }
    const receipt = parsed.data
    await deps.repo.setSubscription(plan.leadId, receipt.id, plan.intervalMonths)
    if (receipt.firstPayment)
      await deps.repo.setPayment(
        plan.leadId,
        receipt.firstPayment.id,
        plan.couponCode,
        plan.paymentContext,
      )
    await deps.repo.insertEvent(plan.leadId, 'pagamento_iniciado', event)
    if (receipt.status === 'ACTIVE' && receipt.firstPayment?.status === 'PAID') {
      const first = receipt.firstPayment
      if (await deps.repo.markPaid(plan.leadId, paymentApprovedAt(first.paidAt), first.id))
        await deps.repo.insertEvent(plan.leadId, 'pagamento_confirmado', event)
      await runPostPayment(plan.leadId, deps)
    }
    return {
      outcome: 'recorded',
      response: json({
        subscriptionId: receipt.id,
        status: receipt.status,
        paymentId: receipt.firstPayment?.id ?? null,
        paymentStatus: receipt.firstPayment?.status ?? null,
      }),
    }
  }
  const parsed = paymentReceipt.safeParse(result.body)
  if (!parsed.success)
    return {
      outcome: 'unknown',
      response: jsonError('Não foi possível conferir o recibo do pagamento.', 502, 'GATEWAY_ERROR'),
    }
  const receipt = parsed.data
  await deps.repo.setPayment(plan.leadId, receipt.id, plan.couponCode, plan.paymentContext)
  await deps.repo.insertEvent(plan.leadId, 'pagamento_iniciado', event)
  if (plan.kind === 'card' && receipt.status === 'PAID') {
    if (await deps.repo.markPaid(plan.leadId, paymentApprovedAt(receipt.paidAt), receipt.id)) {
      await deps.repo.insertEvent(plan.leadId, 'pagamento_confirmado', event)
      await redeemCouponBestEffort(deps.gateway, plan.couponCode, receipt.id, deps.log)
    }
    await runPostPayment(plan.leadId, deps)
  }
  return {
    outcome: 'recorded',
    response: json({
      paymentId: receipt.id,
      status: receipt.status,
      ...(plan.kind === 'pix' ? { pix: receipt.pix ?? null } : { card: receipt.card ?? null }),
    }),
  }
}
