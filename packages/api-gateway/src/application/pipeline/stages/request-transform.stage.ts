import {
  injectIdentityHeaders,
  stripEdgeAuthHeaders,
  stripIdentityHeaders,
} from '../../../infrastructure/proxy/header-rules'
import type { Resigner } from '../../../infrastructure/upstream/resign.transformer'
import { applyRequestTransformers } from '../../transform/transform-chain'
import type { Transformer } from '../../transform/transformer.port'
import type { Stage } from '../stage.port'

export interface RequestTransformDeps {
  getTransformers: (routeId: string) => readonly Transformer[]
  resigner?: Resigner
}

/**
 * Aplica os transformers de requisição da rota (Decorator) e, em rotas
 * `upstreamAuth: 'resign'`, re-assina a chamada de saída como consumidor do upstream.
 * Por padrão remove as credenciais de borda do cliente (não vazam ao upstream);
 * só `upstreamAuth: 'passthrough'` as repassa intencionalmente.
 */
export function createRequestTransformStage(deps: RequestTransformDeps): Stage {
  return {
    name: 'request-transform',
    async run(ctx) {
      if (!ctx.route) return undefined
      // Anti-spoof: o cliente NUNCA define os headers de identidade — sempre removidos.
      stripIdentityHeaders(ctx.upstreamHeaders)
      if (ctx.route.route.upstreamAuth !== 'passthrough') {
        stripEdgeAuthHeaders(ctx.upstreamHeaders)
      }
      await applyRequestTransformers(deps.getTransformers(ctx.route.route.id), ctx)
      if (ctx.route.route.upstreamAuth === 'resign') {
        if (!deps.resigner) {
          ctx.logger.error('gateway.resign_unconfigured', { route: ctx.route.route.id })
        } else {
          await deps.resigner.resign(ctx)
        }
      }
      // Repassa a identidade confiável resolvida (claims do JWT) ao upstream.
      if (ctx.user) injectIdentityHeaders(ctx.upstreamHeaders, ctx.user)
      return undefined
    },
  }
}
