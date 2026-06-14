import { UnauthorizedError } from '@sistemazero/core/http'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'

/**
 * Verifica a assinatura HMAC de um webhook de entrada (o gateway re-assina como
 * consumer `gateway`). Mensagem canônica `"<MÉTODO>.<path>.<corpo>"` (método+path
 * impedem replay cross-endpoint). Header `x-signature: t=<ts>,v1=<hex>`. Lança 401
 * se inválida/expirada. Espelha o members.
 */
export function assertWebhookSignature(input: {
  secret: string
  method: string
  path: string
  rawBody: string
  signatureHeader: string | undefined
  toleranceSeconds: number
}): void {
  const result = verifyHmacSignature({
    secret: input.secret,
    body: canonicalHmacMessage({ method: input.method, path: input.path, body: input.rawBody }),
    signatureHeader: input.signatureHeader,
    nowSeconds: Math.floor(Date.now() / 1000),
    toleranceSeconds: input.toleranceSeconds,
  })
  if (!result.valid) {
    throw new UnauthorizedError(`Assinatura de webhook inválida (${result.reason ?? 'mismatch'})`)
  }
}
