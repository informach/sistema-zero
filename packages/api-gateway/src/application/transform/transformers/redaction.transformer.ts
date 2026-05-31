import type { Transformer } from '../transformer.port'

/** Remove headers sensíveis da resposta antes de devolver ao cliente. */
export function redactionTransformer(options: Record<string, unknown>): Transformer {
  const names = (Array.isArray(options.headers) ? options.headers : []) as string[]
  return {
    name: 'redaction',
    transformResponse(ctx) {
      if (!ctx.response) return
      for (const n of names) ctx.response.headers.delete(n)
    },
  }
}
