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

/**
 * Headers de IDENTIDADE confiável (gateway → upstream). O cliente NUNCA os define;
 * o gateway os REMOVE da entrada (anti-spoof) e injeta os valores resolvidos do
 * token verificado. O upstream pode confiar neles (vêm só do gateway, na rede interna).
 */
export const IDENTITY_HEADERS = {
  id: 'x-auth-user-id',
  email: 'x-auth-user-email',
  name: 'x-auth-user-name',
  role: 'x-auth-user-role',
  status: 'x-auth-user-status',
  phone: 'x-auth-user-phone',
  signupSource: 'x-auth-user-source',
} as const

const IDENTITY_HEADER_NAMES = Object.values(IDENTITY_HEADERS)

/** Identidade resolvida a injetar (subset estrutural de AuthenticatedUser). */
export interface IdentityHeaderInput {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
  phone?: string
  signupSource?: string
}

/** Remove quaisquer headers de identidade da entrada (anti-spoof do cliente). */
export function stripIdentityHeaders(headers: Headers): void {
  for (const name of IDENTITY_HEADER_NAMES) headers.delete(name)
}

/** Injeta a identidade confiável resolvida nos headers de saída (após o strip). */
export function injectIdentityHeaders(headers: Headers, user: IdentityHeaderInput): void {
  stripIdentityHeaders(headers)
  headers.set(IDENTITY_HEADERS.id, user.id)
  headers.set(IDENTITY_HEADERS.email, user.email)
  headers.set(IDENTITY_HEADERS.name, `${user.firstName} ${user.lastName}`.trim())
  headers.set(IDENTITY_HEADERS.role, user.role)
  headers.set(IDENTITY_HEADERS.status, user.status)
  if (user.phone) headers.set(IDENTITY_HEADERS.phone, user.phone)
  if (user.signupSource) headers.set(IDENTITY_HEADERS.signupSource, user.signupSource)
}

/**
 * Headers que NUNCA devem aparecer em log (mesmo no debug de headers). Base nas
 * credenciais de borda + cookies de resposta, segredos e os headers de identidade
 * (contêm PII como e-mail).
 */
export const SENSITIVE_LOG_HEADERS = new Set([
  ...EDGE_AUTH_HEADERS,
  ...IDENTITY_HEADER_NAMES,
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
])

/**
 * Materializa os headers como objeto logável, com os sensíveis mascarados como
 * `[REDACTED]` (preserva a presença do header sem vazar o valor). Usado só no
 * debug opt-in de headers (`LOG_LEVEL=debug`).
 */
export function redactHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach((value, key) => {
    out[key] = SENSITIVE_LOG_HEADERS.has(key.toLowerCase()) ? '[REDACTED]' : value
  })
  return out
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
