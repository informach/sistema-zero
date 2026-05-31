import type { FunnelRepo } from '../db/repo'
import { json, jsonError } from '../lib/http'
import { safeEqual } from '../lib/safe-equal'

export interface WebhookDeps {
  repo: FunnelRepo
  internalToken: string
}

/**
 * POST /api/webhooks/payments — recebe `payment.paid` ENCAMINHADO pelo gateway
 * (que já validou a assinatura HMAC do payments). Confere o token interno do
 * gateway, deduplica por `x-delivery-id` e marca o lead como pago.
 */
export async function handlePaymentWebhook(request: Request, deps: WebhookDeps): Promise<Response> {
  const token = request.headers.get('x-internal-token')
  if (!token || !safeEqual(token, deps.internalToken)) {
    return jsonError('Não autorizado.', 401, 'UNAUTHORIZED')
  }

  const raw = await request.text()
  let payload: { event?: string; data?: { paymentId?: string } }
  try {
    payload = JSON.parse(raw) as typeof payload
  } catch {
    return jsonError('JSON inválido.', 400, 'BAD_REQUEST')
  }

  const deliveryId = request.headers.get('x-delivery-id')
  const eventName = payload.event ?? request.headers.get('x-event-type') ?? ''
  const paymentId = payload.data?.paymentId ?? null

  // Dedupe (entrega ≥1 vez): checa ANTES de processar, mas só registra a entrega
  // DEPOIS de processar com sucesso — assim uma falha transitória não faz o retry
  // do gateway ser descartado. markPaid é idempotente (UPDATE … WHERE paid_at IS
  // NULL), então reprocessar é seguro e o polling do checkout é a rede extra.
  if (deliveryId && (await deps.repo.isWebhookProcessed(deliveryId))) {
    return json({ ok: true, deduped: true })
  }

  if (eventName === 'payment.paid' && typeof paymentId === 'string') {
    const lead = await deps.repo.findLeadByPayment(paymentId)
    if (lead) {
      const newlyPaid = await deps.repo.markPaid(lead.id, new Date())
      if (newlyPaid) await deps.repo.insertEvent(lead.id, 'pagamento_confirmado', 'webhook')
    }
  }

  if (deliveryId) await deps.repo.markWebhookProcessed(deliveryId, paymentId)
  return json({ ok: true })
}
