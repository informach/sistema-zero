import type { TransformRef } from '../../infrastructure/config/gateway-config.schema'
import type { GatewayContext } from '../pipeline/stage.port'
import type { Transformer, TransformerRegistry } from './transformer.port'

/** Resolve os refs de transform da rota em instâncias concretas (via registry). */
export function buildTransformers(
  refs: readonly TransformRef[],
  registry: TransformerRegistry,
): Transformer[] {
  return refs.map((ref) => {
    const type = typeof ref === 'string' ? ref : ref.type
    const options = typeof ref === 'string' ? {} : (ref.options ?? {})
    const factory = registry[type]
    if (!factory) throw new Error(`Transformer desconhecido: "${type}"`)
    return factory(options)
  })
}

export async function applyRequestTransformers(
  transformers: readonly Transformer[],
  ctx: GatewayContext,
): Promise<void> {
  for (const t of transformers) if (t.transformRequest) await t.transformRequest(ctx)
}

export async function applyResponseTransformers(
  transformers: readonly Transformer[],
  ctx: GatewayContext,
): Promise<void> {
  for (const t of transformers) if (t.transformResponse) await t.transformResponse(ctx)
}
