/**
 * Headers hop-by-hop (RFC 7230 §6.1) — não devem ser repassados por um proxy.
 */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

/**
 * Credenciais de BORDA (cliente → gateway): consumidas pelo gateway e que NÃO
 * devem vazar para o upstream. Em rotas `resign`, o gateway re-injeta as suas
 * próprias (`x-consumer-id`/`x-signature`). Não inclui `idempotency-key` (legítimo
 * de repassar). Removidas exceto em rotas `upstreamAuth: 'passthrough'` explícitas.
 */
export const EDGE_AUTH_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-session-token',
  'x-consumer-id',
  'x-signature',
])

/** Remove as credenciais de borda dos headers de saída (antes do proxy/resign). */
export function stripEdgeAuthHeaders(headers: Headers): void {
  for (const name of EDGE_AUTH_HEADERS) headers.delete(name)
}

export interface ForwardHeaderContext {
  clientIp: string
  proto: string
  host: string
  requestId: string
  via: string
  traceparent: string
}

/** Constrói os headers da requisição para o upstream (remove hop-by-hop, adiciona X-Forwarded-*). */
export function sanitizeRequestHeaders(incoming: Headers, ctx: ForwardHeaderContext): Headers {
  const out = new Headers()
  incoming.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) return
    if (lower === 'host' || lower === 'content-length') return // recomputados pelo fetch
    out.set(key, value)
  })

  const priorXff = incoming.get('x-forwarded-for')
  out.set('x-forwarded-for', priorXff ? `${priorXff}, ${ctx.clientIp}` : ctx.clientIp)
  out.set('x-forwarded-proto', ctx.proto)
  out.set('x-forwarded-host', ctx.host)
  out.set('x-request-id', ctx.requestId)
  out.set('traceparent', ctx.traceparent)
  const priorVia = incoming.get('via')
  out.set('via', priorVia ? `${priorVia}, ${ctx.via}` : ctx.via)
  return out
}

/** Constrói os headers da resposta para o cliente (remove hop-by-hop, preserva Set-Cookie). */
export function sanitizeResponseHeaders(upstream: Headers): Headers {
  const out = new Headers()
  upstream.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) return
    // Set-Cookie é tratado à parte: o forEach junta múltiplos cookies num só valor.
    if (lower === 'set-cookie') return
    out.set(key, value)
  })
  const getSetCookie = (upstream as { getSetCookie?: () => string[] }).getSetCookie
  if (typeof getSetCookie === 'function') {
    for (const cookie of getSetCookie.call(upstream)) out.append('set-cookie', cookie)
  }
  return out
}
