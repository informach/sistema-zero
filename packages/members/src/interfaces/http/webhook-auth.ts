import { UnauthorizedError } from '@sistemazero/core/http'
import { verifyHmacSignature } from '@sistemazero/core/security'

/**
 * Verifica a assinatura HMAC de um webhook de entrada (o gateway re-assina a
 * chamada do funil como consumer `gateway`). A mensagem canônica é o corpo BRUTO
 * (sem Idempotency-Key — o funil não envia nas chamadas de concessão). Header
 * `x-signature: t=<ts>,v1=<hex>`. Lança 401 se inválida/expirada (anti-replay).
 */
export function assertWebhookSignature(input: {
  secret: string
  rawBody: string
  signatureHeader: string | undefined
  toleranceSeconds: number
}): void {
  const result = verifyHmacSignature({
    secret: input.secret,
    body: input.rawBody,
    signatureHeader: input.signatureHeader,
    nowSeconds: Math.floor(Date.now() / 1000),
    toleranceSeconds: input.toleranceSeconds,
  })
  if (!result.valid) {
    throw new UnauthorizedError(`Assinatura de webhook inválida (${result.reason ?? 'mismatch'})`)
  }
}
