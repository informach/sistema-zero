import { signHmac } from '@sistemazero/core/security'
import { ensureRawBody } from '../../application/pipeline/context'
import type { GatewayContext } from '../../application/pipeline/stage.port'

export interface Resigner {
  resign(ctx: GatewayContext): Promise<void>
}

/**
 * Re-assina a requisição de saída como um consumidor registrado do upstream
 * (ex.: o `gateway` no payments). Usado em rotas `upstreamAuth: 'resign'` (caminho
 * de usuário/JWT): o gateway autentica o cliente e fala com o upstream em seu
 * próprio nome. Mensagem assinada compatível com o payments: `"<ts>.<idem>.<corpo>"`.
 */
export function createResigner(opts: { consumerId: string; secret: string }): Resigner {
  return {
    async resign(ctx) {
      const body = await ensureRawBody(ctx)
      const idem = ctx.request.headers.get('idempotency-key')
      const ts = Math.floor(Date.now() / 1000)
      const signed = idem ? `${idem}.${body}` : body
      const signature = signHmac(opts.secret, signed, ts)
      ctx.upstreamHeaders.set('x-consumer-id', opts.consumerId)
      ctx.upstreamHeaders.set('x-signature', `t=${ts},v1=${signature}`)
      if (idem) ctx.upstreamHeaders.set('idempotency-key', idem)
    },
  }
}
