import type { FunnelRepo, Lead } from '../db/repo'
import { json, jsonError } from '../lib/http'
import { safeEqual } from '../lib/safe-equal'
import { FulfillmentRetryError } from './fulfillment'
import { GrantRetryError } from './members-grant'

export interface WebhookDeps {
  repo: FunnelRepo
  internalToken: string
  /** Registra o comprador no IdP após confirmar o pagamento. */
  fulfill: (lead: Lead) => Promise<void>
  /** Registra o uso do cupom (best-effort) na confirmação. Opcional (no-op em testes). */
  redeemCoupon?: (couponCode: string | null) => Promise<void>
  /** Concede o acesso na área de membros (após o registro do comprador). Opcional. */
  grantMembers?: (lead: Lead) => Promise<void>
  /** Boas-vindas (e-mail + WhatsApp) + link de definir senha (best-effort; NUNCA lança). Opcional. */
  sendWelcome?: (lead: Lead) => Promise<void>
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
      if (newlyPaid) {
        await deps.repo.insertEvent(lead.id, 'pagamento_confirmado', 'webhook')
        // Registra o uso do cupom só na transição p/ pago (exactly-once via markPaid).
        if (deps.redeemCoupon) await deps.redeemCoupon(lead.couponCode)
      }

      // Registra o comprador no IdP (auth). Falha transitória → devolve 502 e NÃO
      // marca a entrega como processada, para o gateway re-entregar (recuperação
      // durável, inclusive p/ boleto, que não tem polling de tela). markPaid é
      // idempotente, então reprocessar a reentrega é seguro.
      const fresh = await deps.repo.getLead(lead.id)
      if (fresh) {
        try {
          await deps.fulfill(fresh)
        } catch (err) {
          if (err instanceof FulfillmentRetryError) {
            return jsonError('Registro do comprador pendente; reentregar.', 502, 'FULFILL_RETRY')
          }
          throw err
        }
      }

      // Concede o acesso na área de membros. Roda DEPOIS do registro (relê o lead p/
      // pegar o `buyer_user_id` recém-gravado). Falha → 502 sem marcar a entrega como
      // processada → o gateway re-entrega e a concessão (idempotente) é retentada.
      if (deps.grantMembers || deps.sendWelcome) {
        const registered = await deps.repo.getLead(lead.id)
        if (registered?.buyerUserId) {
          if (deps.grantMembers) {
            try {
              await deps.grantMembers(registered)
            } catch (err) {
              if (err instanceof GrantRetryError) {
                return jsonError('Concessão de acesso pendente; reentregar.', 502, 'GRANT_RETRY')
              }
              throw err
            }
          }

          // Boas-vindas (e-mail + WhatsApp) + link de definir senha (1º acesso ao
          // app community). BEST-EFFORT: o handler já engole falhas (e o cinto
          // extra aqui garante que as mensagens NUNCA mudam o status do webhook);
          // idempotente no replay via Idempotency-Key por canal (`welcome-<leadId>`
          // / `welcome-wa-<leadId>` — o messaging deduplica).
          if (deps.sendWelcome) {
            try {
              await deps.sendWelcome(registered)
            } catch {
              // nunca propaga — boas-vindas não é crítico (fallback: "esqueci minha senha")
            }
          }
        }
      }
    }
  }

  if (deliveryId) await deps.repo.markWebhookProcessed(deliveryId, paymentId)
  return json({ ok: true })
}
