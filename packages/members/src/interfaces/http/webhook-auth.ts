import { UnauthorizedError } from '@sistemazero/core/http'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'

/**
 * Verifica a assinatura HMAC de um webhook de entrada (o gateway re-assina a
 * chamada do funil como consumer `gateway`). Mensagem canônica:
 * `"<MÉTODO>.<path>.delivery=<id>.<corpo>"` quando há `x-delivery-id` (sem
 * Idempotency-Key — o funil não envia nas chamadas de concessão; método+path
 * impedem replay cross-endpoint). O path
 * assinado pelo resign do gateway é o `upstreamPath` final = o pathname que este
 * serviço enxerga. Header `x-signature: t=<ts>,v1=<hex>`. Lança 401 se
 * inválida/expirada (anti-replay).
 *
 * O delivery id é autenticado junto do corpo: trocar apenas o header invalida a
 * assinatura e não pode criar uma segunda entrega do mesmo evento.
 */
export function assertWebhookSignature(input: {
  secret: string
  method: string
  path: string
  rawBody: string
  deliveryId: string | undefined
  signatureHeader: string | undefined
  toleranceSeconds: number
}): void {
  const result = verifyHmacSignature({
    secret: input.secret,
    body: canonicalHmacMessage({
      method: input.method,
      path: input.path,
      deliveryId: input.deliveryId,
      body: input.rawBody,
    }),
    signatureHeader: input.signatureHeader,
    nowSeconds: Math.floor(Date.now() / 1000),
    toleranceSeconds: input.toleranceSeconds,
  })
  if (!result.valid) {
    throw new UnauthorizedError(`Assinatura de webhook inválida (${result.reason ?? 'mismatch'})`)
  }
}
