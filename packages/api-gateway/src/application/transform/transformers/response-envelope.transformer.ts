import type { Transformer } from '../transformer.port'

/**
 * Envelopa respostas JSON de sucesso em `{ ok: true, data }` (uniformidade).
 * BUFFERIZA o corpo — use apenas onde a uniformidade vale o custo de latência.
 */
export function responseEnvelopeTransformer(_options: Record<string, unknown>): Transformer {
  return {
    name: 'response-envelope',
    async transformResponse(ctx) {
      const res = ctx.response
      if (!res) return
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) return
      const data = await res
        .clone()
        .json()
        .catch(() => undefined)
      if (data === undefined) return
      const body = res.ok ? { ok: true, data } : data
      ctx.response = new Response(JSON.stringify(body), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      })
    },
  }
}
