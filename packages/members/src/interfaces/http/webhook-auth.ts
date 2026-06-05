import { UnauthorizedError } from '@sistemazero/core/http'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'

/**
 * Verifica a assinatura HMAC de um webhook de entrada (o gateway re-assina a
 * chamada do funil como consumer `gateway`). Mensagem canônica:
 * `"<MÉTODO>.<path>.<corpo>"` (sem Idempotency-Key — o funil não envia nas
 * chamadas de concessão; método+path impedem replay cross-endpoint). O path
 * assinado pelo resign do gateway é o `upstreamPath` final = o pathname que este
 * serviço enxerga. Header `x-signature: t=<ts>,v1=<hex>`. Lança 401 se
 * inválida/expirada (anti-replay).
 *
 * NOTA (limitação herdada do gateway): o `x-delivery-id` NÃO faz parte da mensagem
 * assinada. Um replay com novo delivery-id NO MESMO endpoint passaria o HMAC e não
 * seria deduplicado — porém o grant/revoke são IDEMPOTENTES (chave da matrícula /
 * subscriptionId), então re-executar é inócuo. Anti-replay por nonce está em
 * aberto no gateway (ver api-gateway §8).
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
