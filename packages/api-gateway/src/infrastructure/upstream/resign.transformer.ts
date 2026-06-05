import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { ensureRawBody } from '../../application/pipeline/context'
import type { GatewayContext } from '../../application/pipeline/stage.port'

export interface Resigner {
  resign(ctx: GatewayContext): Promise<void>
}

/**
 * Re-assina a requisição de saída como um consumidor registrado do upstream
 * (ex.: o `gateway` no payments). Usado em rotas `upstreamAuth: 'resign'` (caminho
 * de usuário/JWT): o gateway autentica o cliente e fala com o upstream em seu
 * próprio nome. Mensagem canônica compatível com os upstreams:
 * `"<ts>.<MÉTODO>.<path>.<idem>.<corpo>"` — o path assinado é o `upstreamPath`
 * FINAL (o resign roda DEPOIS dos path-rewrites no request-transform stage), sem
 * query string: exatamente o pathname que o upstream verifica.
 */
export function createResigner(opts: { consumerId: string; secret: string }): Resigner {
  return {
    async resign(ctx) {
      const body = await ensureRawBody(ctx)
      const idem = ctx.request.headers.get('idempotency-key')
      const ts = Math.floor(Date.now() / 1000)
      const signed = canonicalHmacMessage({
        method: ctx.request.method,
        path: ctx.upstreamPath.split('?')[0] ?? ctx.upstreamPath,
        idempotencyKey: idem,
        body,
      })
      const signature = signHmac(opts.secret, signed, ts)
      ctx.upstreamHeaders.set('x-consumer-id', opts.consumerId)
      ctx.upstreamHeaders.set('x-signature', `t=${ts},v1=${signature}`)
      if (idem) ctx.upstreamHeaders.set('idempotency-key', idem)
    },
  }
}
