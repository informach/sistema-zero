import { canonicalHmacMessage, ipMatchesAny, verifyHmacSignature } from '@sistemazero/core/security'
import type { ConsumerRepository } from '../../domain/ports/consumer-repository.port'
import { ensureRawBody } from '../pipeline/context'
import type { AuthStrategy } from './auth-strategy.port'

export interface HmacStrategyOptions {
  consumers: ConsumerRepository
  toleranceSeconds: number
}

/**
 * Strategy HMAC (sistema-a-sistema): valida X-Consumer-Id + IP (CIDR) + assinatura
 * X-Signature sobre a mensagem canônica `"<MÉTODO>.<path>.<idem>.<corpo>"` (sem
 * Idempotency-Key: `"<MÉTODO>.<path>.<corpo>"`) com anti-replay. Amarrar
 * método+path impede replay cross-endpoint (ex.: GET→DELETE de corpo vazio).
 * Reusa as utilidades do @sistemazero/core.
 */
export function createHmacStrategy(opts: HmacStrategyOptions): AuthStrategy {
  return {
    name: 'hmac',
    async authenticate(ctx) {
      const consumerId = ctx.request.headers.get('x-consumer-id')
      if (!consumerId) return { ok: 'skip' }

      const consumer = await opts.consumers.findById(consumerId)
      if (!consumer?.isActive) {
        return {
          ok: false,
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Consumidor inválido ou inativo',
        }
      }
      if (!ipMatchesAny(ctx.clientIp, consumer.allowedCidrs)) {
        return { ok: false, status: 403, code: 'FORBIDDEN', message: 'IP de origem não autorizado' }
      }

      const rawBody = await ensureRawBody(ctx)
      const idem = ctx.request.headers.get('idempotency-key')
      // O consumidor assina o path que chama NO GATEWAY (pathname, sem query).
      const signed = canonicalHmacMessage({
        method: ctx.request.method,
        path: ctx.url.pathname,
        idempotencyKey: idem,
        body: rawBody,
      })
      const result = verifyHmacSignature({
        secret: consumer.hmacSecret,
        body: signed,
        signatureHeader: ctx.request.headers.get('x-signature') ?? undefined,
        nowSeconds: Math.floor(Date.now() / 1000),
        toleranceSeconds: opts.toleranceSeconds,
      })
      if (!result.valid) {
        return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Assinatura HMAC inválida' }
      }
      return { ok: true, principal: { kind: 'hmac', subject: consumer.id } }
    },
  }
}
