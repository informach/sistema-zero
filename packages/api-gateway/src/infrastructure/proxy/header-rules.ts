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
 *
 * ⚠️ Valores com qualquer caractere fora do ASCII imprimível chegam URI-encoded
 * (RFC 3986): header HTTP não comporta UTF-8 cru — `headers.set()` LANÇA com
 * "André" no `x-auth-user-name` e o pipeline viraria 500 para todo usuário com
 * acento no nome. Consumidor que precisar do valor original deve detectar `%` e
 * aplicar `decodeURIComponent` (hoje nenhum serviço lê o `name`; e-mail/telefone/
 * role/status/id são ASCII na prática e seguem crus).
 */
export const IDENTITY_HEADERS = {
  id: 'x-auth-user-id',
  email: 'x-auth-user-email',
  name: 'x-auth-user-name',
  role: 'x-auth-user-role',
  status: 'x-auth-user-status',
  phone: 'x-auth-user-phone',
  signupSource: 'x-auth-user-source',
  // Conta do responsável em sessão de PERFIL (claim `pfl.accountId`). Presente só
  // quando `id` é um perfil de criança — o upstream resolve o ACESSO por esta conta.
  // É de IDENTIDADE (auto-stripado da entrada + redigido no log, como os demais).
  accountId: 'x-auth-account-id',
  // Admin que está IMPERSONANDO (claim `act.sub`). Presente só em sessão de suporte.
  // O upstream o usa p/ PRESERVAR o vínculo de impersonação ao derivar uma nova
  // sessão (ex.: selecionar um perfil) — sem ele a impersonação seria "lavada" numa
  // sessão normal. De IDENTIDADE (auto-stripado da entrada + redigido no log).
  impersonatorId: 'x-auth-impersonator-id',
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
  accountId?: string
  impersonatorId?: string
}

/** Remove quaisquer headers de identidade da entrada (anti-spoof do cliente). */
export function stripIdentityHeaders(headers: Headers): void {
  for (const name of IDENTITY_HEADER_NAMES) headers.delete(name)
}

/**
 * Headers de CONFIANÇA interna (gateway → upstream): provam ao upstream que a
 * chamada passou pelo gateway. O cliente NUNCA os define — sempre removidos da
 * entrada (mesmo em rotas `passthrough`); as rotas com `header-inject` os põem
 * DEPOIS do strip, com o valor do ambiente. Sem o strip, um valor do cliente
 * vazaria intacto nas rotas sem o inject — o contrato "este header só existe se
 * o gateway o pôs" quebraria em silêncio na primeira rota nova.
 */
export const INTERNAL_TRUST_HEADERS = ['x-internal-token'] as const

/** Remove os headers de confiança interna da entrada (anti-spoof do cliente). */
export function stripInternalTrustHeaders(headers: Headers): void {
  for (const name of INTERNAL_TRUST_HEADERS) headers.delete(name)
}

const PRINTABLE_ASCII = /^[\t\x20-\x7e]*$/

/**
 * Valor seguro p/ header HTTP: ASCII imprimível passa cru; qualquer outro
 * (acento, emoji, controle) sai URI-encoded — `headers.set()` lança TypeError
 * com não-ASCII e derrubaria a requisição inteira (ver doc do IDENTITY_HEADERS).
 */
export function headerSafeValue(value: string): string {
  return PRINTABLE_ASCII.test(value) ? value : encodeURIComponent(value)
}

/** Injeta a identidade confiável resolvida nos headers de saída (após o strip). */
export function injectIdentityHeaders(headers: Headers, user: IdentityHeaderInput): void {
  stripIdentityHeaders(headers)
  headers.set(IDENTITY_HEADERS.id, headerSafeValue(user.id))
  headers.set(IDENTITY_HEADERS.email, headerSafeValue(user.email))
  headers.set(IDENTITY_HEADERS.name, headerSafeValue(`${user.firstName} ${user.lastName}`.trim()))
  headers.set(IDENTITY_HEADERS.role, headerSafeValue(user.role))
  headers.set(IDENTITY_HEADERS.status, headerSafeValue(user.status))
  if (user.phone) headers.set(IDENTITY_HEADERS.phone, headerSafeValue(user.phone))
  if (user.signupSource) {
    headers.set(IDENTITY_HEADERS.signupSource, headerSafeValue(user.signupSource))
  }
  // Só em sessão de perfil — sessão normal da conta NÃO injeta (compat: os upstreams
  // tratam a ausência como "x-auth-user-id é a própria conta").
  if (user.accountId) headers.set(IDENTITY_HEADERS.accountId, headerSafeValue(user.accountId))
  // Só em sessão de impersonação — o upstream preserva o vínculo ao derivar sessões.
  if (user.impersonatorId) {
    headers.set(IDENTITY_HEADERS.impersonatorId, headerSafeValue(user.impersonatorId))
  }
}

/**
 * Headers que NUNCA devem aparecer em log (mesmo no debug de headers). Base nas
 * credenciais de borda + cookies de resposta, segredos e os headers de identidade
 * (contêm PII como e-mail).
 */
export const SENSITIVE_LOG_HEADERS = new Set([
  ...EDGE_AUTH_HEADERS,
  ...IDENTITY_HEADER_NAMES,
  ...INTERNAL_TRUST_HEADERS,
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
