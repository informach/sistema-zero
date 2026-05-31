import type { Transformer } from '../transformer.port'

/** Remove headers da requisição de saída (ex.: credenciais do cliente que não devem vazar). */
export function headerStripTransformer(options: Record<string, unknown>): Transformer {
  const names = (Array.isArray(options.headers) ? options.headers : []) as string[]
  return {
    name: 'header-strip',
    transformRequest(ctx) {
      for (const n of names) ctx.upstreamHeaders.delete(n)
    },
  }
}
