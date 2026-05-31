import { envelope } from '@sistemazero/core/http'
import { verifyHmacSignature } from '@sistemazero/core/security'
import { ensureRawBody } from '../../pipeline/context'
import type { Transformer } from '../transformer.port'

/**
 * Verifica a assinatura HMAC de um webhook recebido de um UPSTREAM (ex.: o payments
 * notificando `payment.paid`). O upstream assina com o segredo do consumer que o
 * gateway possui lá (default: `GATEWAY_HMAC_SECRET`) sobre o CORPO BRUTO — sem
 * prefixo de Idempotency-Key e sem enviar `x-consumer-id` (o worker de webhook do
 * payments só manda `x-signature`, `x-event-type`, `x-delivery-id`).
 *
 * Em falha, curto-circuita a cadeia com 401 (setando `ctx.response`), antes do proxy.
 * Em sucesso, segue para os próximos transforms (ex.: header-inject + path-rewrite)
 * e o encaminhamento ao upstream interno (funnel).
 */
export function verifyWebhookTransformer(options: Record<string, unknown>): Transformer {
  const secretEnvVar =
    typeof options.secretEnvVar === 'string' ? options.secretEnvVar : 'GATEWAY_HMAC_SECRET'
  const toleranceSeconds =
    typeof options.toleranceSeconds === 'number' ? options.toleranceSeconds : 300
  const secret = process.env[secretEnvVar]
  if (!secret) {
    throw new Error(`verify-webhook: variável de ambiente ${secretEnvVar} não definida`)
  }

  return {
    name: 'verify-webhook',
    async transformRequest(ctx) {
      const rawBody = await ensureRawBody(ctx)
      const result = verifyHmacSignature({
        secret,
        body: rawBody,
        signatureHeader: ctx.request.headers.get('x-signature') ?? undefined,
        nowSeconds: Math.floor(Date.now() / 1000),
        toleranceSeconds,
      })
      if (!result.valid) {
        ctx.logger.warn('gateway.webhook_signature_invalid', {
          requestId: ctx.requestId,
          reason: result.reason,
        })
        ctx.response = new Response(
          JSON.stringify(envelope('UNAUTHORIZED', 'Assinatura do webhook inválida')),
          { status: 401, headers: { 'content-type': 'application/json' } },
        )
      }
    },
  }
}
