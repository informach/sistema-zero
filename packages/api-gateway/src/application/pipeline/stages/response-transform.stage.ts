import { resolveVersionMapping } from '../../../domain/versioning/version'
import { applyResponseTransformers } from '../../transform/transform-chain'
import type { Transformer } from '../../transform/transformer.port'
import type { Stage } from '../stage.port'

export interface ResponseTransformDeps {
  getTransformers: (routeId: string) => readonly Transformer[]
}

/**
 * Finalizer: aplica os transformers de resposta (Decorator) e emite os headers
 * de depreciação de versão (Deprecation/Sunset — RFC 8594).
 */
export function createResponseTransformStage(deps: ResponseTransformDeps): Stage {
  return {
    name: 'response-transform',
    async run(ctx) {
      const match = ctx.route
      if (!match) return undefined
      await applyResponseTransformers(deps.getTransformers(match.route.id), ctx)

      const mapping = resolveVersionMapping(match.route.versions, ctx.requestedVersion)
      if (mapping?.deprecated) {
        ctx.responseHeaders.set('deprecation', 'true')
        if (mapping.sunset) ctx.responseHeaders.set('sunset', mapping.sunset)
      }
      return undefined
    },
  }
}
