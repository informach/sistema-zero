import type { Consumer, ConsumerRepository } from '../../domain/ports/consumer-repository.port'
import type { Logger } from '../../infrastructure/logging/logger'
import { verifyHmacSignature } from '../../infrastructure/security/hmac'
import { ipMatchesAny } from '../../infrastructure/security/ip'
import { ForbiddenError, UnauthorizedError } from './errors'
import { getRawBody } from './raw-body'

export interface AuthDeps {
  consumers: ConsumerRepository
  logger: Logger
  trustProxy: boolean
  /**
   * Nº de proxies confiáveis na frente do app (default 1). O IP do cliente é a
   * entrada do `X-Forwarded-For` que o proxy confiável de fato observou — a
   * N-ésima a partir da DIREITA. Tudo à esquerda disso é controlado pelo cliente.
   */
  trustedProxyHops: number
  hmacToleranceSeconds: number
}

/** Subconjunto do contexto Elysia necessário para autenticar o consumidor. */
export interface AuthContext {
  request: Request
  server: { requestIP(request: Request): { address: string } | null } | null
  headers: Record<string, string | undefined>
}

/**
 * Resolve o IP de origem. Atrás de proxy confiável, NUNCA confie na entrada mais
 * à esquerda do `X-Forwarded-For` (forjável pelo cliente): pega a entrada que o
 * proxy confiável anexou — a `trustedProxyHops`-ésima a partir do fim.
 */
function resolveClientIp(ctx: AuthContext, trustProxy: boolean, trustedProxyHops: number): string {
  const socketIp = ctx.server?.requestIP(ctx.request)?.address ?? ''
  if (!trustProxy) return socketIp

  const forwarded = ctx.headers['x-forwarded-for']
  if (!forwarded) return socketIp

  const chain = forwarded
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (chain.length === 0) return socketIp

  const hops = Math.max(1, trustedProxyHops)
  // Ex.: "<cliente>, <proxyN>, ... , <proxy1>" com hops=1 → última entrada.
  const idx = chain.length - hops
  // Fail-closed: se a cadeia é mais curta que o nº de hops confiáveis (cadeia
  // forjada/curta), NÃO caia para chain[0] — a entrada mais à esquerda é
  // controlada pelo cliente e burlaria a allowlist. Usa o IP do socket (não-forjável).
  if (idx < 0) return socketIp
  return chain[idx] ?? socketIp
}

/**
 * Autentica um sistema consumidor em três passos:
 *  1. identifica o consumidor (`X-Consumer-Id`) e checa se está ativo;
 *  2. valida o IP de origem contra a allowlist (CIDR) do consumidor;
 *  3. valida a assinatura HMAC sobre o corpo bruto (com anti-replay).
 */
export async function authenticateConsumer(deps: AuthDeps, ctx: AuthContext): Promise<Consumer> {
  const consumerId = ctx.headers['x-consumer-id']
  if (!consumerId) throw new UnauthorizedError('Header X-Consumer-Id ausente')

  const consumer = await deps.consumers.findById(consumerId)
  if (!consumer) throw new UnauthorizedError('Consumidor inválido ou inativo')

  const ip = resolveClientIp(ctx, deps.trustProxy, deps.trustedProxyHops)
  if (!ipMatchesAny(ip, consumer.allowedCidrs)) {
    deps.logger.warn('auth.ip_denied', { consumerId, ip })
    throw new ForbiddenError('IP de origem não autorizado')
  }

  // A `Idempotency-Key` entra na mensagem assinada (quando presente) para que um
  // replay não possa trocar a chave mantendo a assinatura válida → cada chave
  // gera uma cobrança distinta. Mensagem canônica: "<idempotencyKey>.<corpo>".
  const idempotencyKey = ctx.headers['idempotency-key']
  const rawBody = getRawBody(ctx.request)
  const signedMessage = idempotencyKey ? `${idempotencyKey}.${rawBody}` : rawBody

  const result = verifyHmacSignature({
    secret: consumer.hmacSecret,
    body: signedMessage,
    signatureHeader: ctx.headers['x-signature'],
    nowSeconds: Math.floor(Date.now() / 1000),
    toleranceSeconds: deps.hmacToleranceSeconds,
  })
  if (!result.valid) {
    deps.logger.warn('auth.hmac_invalid', { consumerId, reason: result.reason })
    throw new UnauthorizedError('Assinatura HMAC inválida')
  }

  return consumer
}
