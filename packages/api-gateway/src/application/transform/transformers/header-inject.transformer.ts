import type { Transformer } from '../transformer.port'

/**
 * Injeta headers fixos na requisição de saída e, opcionalmente, o subject do
 * principal autenticado (ex.: `X-Gateway-Principal`).
 */
export function headerInjectTransformer(options: Record<string, unknown>): Transformer {
  const headers = (options.headers ?? {}) as Record<string, string>
  const principalHeader =
    typeof options.principalHeader === 'string' ? options.principalHeader : undefined
  return {
    name: 'header-inject',
    transformRequest(ctx) {
      for (const [k, v] of Object.entries(headers)) ctx.upstreamHeaders.set(k, v)
      if (principalHeader && ctx.principal)
        ctx.upstreamHeaders.set(principalHeader, ctx.principal.subject)
    },
  }
}
