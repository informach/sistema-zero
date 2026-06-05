import { randomBytes, randomUUID } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { ipMatchesAny } from '@sistemazero/core/security'
import type { HttpMethod } from '../../domain/routing/route'
import type { GatewayContext } from './stage.port'

/**
 * Resolve o IP do cliente. Atrás de proxy confiável, pega a entrada que o proxy
 * de fato anexou ao X-Forwarded-For (a `hops`-ésima a partir da direita) — nunca
 * a mais à esquerda (forjável). Espelha a lógica do payments.
 */
export function resolveClientIp(
  socketIp: string,
  headers: Headers,
  trustProxy: boolean,
  trustedProxyHops: number,
): string {
  if (!trustProxy) return socketIp
  const forwarded = headers.get('x-forwarded-for')
  if (!forwarded) return socketIp
  const chain = forwarded
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (chain.length === 0) return socketIp
  const hops = Math.max(1, trustedProxyHops)
  const idx = chain.length - hops
  return chain[idx] ?? chain[0] ?? socketIp
}

/** Propaga o `traceparent` do cliente (se válido) ou gera um novo (W3C trace context). */
function resolveTraceparent(incoming: string | null): { traceparent: string; traceId: string } {
  if (incoming) {
    const m = /^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/i.exec(incoming.trim())
    if (m?.[1]) return { traceparent: incoming.trim(), traceId: m[1] }
  }
  const traceId = randomBytes(16).toString('hex')
  const spanId = randomBytes(8).toString('hex')
  return { traceparent: `00-${traceId}-${spanId}-01`, traceId }
}

export interface CreateContextInput {
  request: Request
  clientIp: string
  logger: Logger
}

/**
 * Formato aceito para um X-Request-Id vindo do CLIENTE. O id é ecoado na resposta,
 * propagado ao upstream e vai para o access log — sem o filtro, um valor arbitrário
 * (lixo gigante / chars fora do token de header) seria refletido verbatim.
 */
const REQUEST_ID_RE = /^[A-Za-z0-9_.-]{1,128}$/

/** Monta o contexto inicial da requisição. */
export function createContext(input: CreateContextInput): GatewayContext {
  const { request } = input
  const url = new URL(request.url)
  const incomingId = request.headers.get('x-request-id')?.trim()
  const requestId = incomingId && REQUEST_ID_RE.test(incomingId) ? incomingId : randomUUID()
  const { traceparent, traceId } = resolveTraceparent(request.headers.get('traceparent'))
  return {
    requestId,
    traceparent,
    traceId,
    request,
    method: request.method.toUpperCase() as HttpMethod,
    url,
    clientIp: input.clientIp,
    startedAt: Date.now(),
    logger: input.logger,
    requestedVersion: '',
    versionFromPath: false,
    upstreamPath: `${url.pathname}${url.search}`,
    upstreamHeaders: new Headers(request.headers),
    upstreamBody: request.body,
    responseHeaders: new Headers(),
  }
}

/**
 * Lê o corpo bruto UMA vez e o memoiza. Ao bufferizar (HMAC/re-sign/body-shape),
 * o corpo de saída passa a ser a string (não mais o stream). Para GET/HEAD é ''.
 */
export async function ensureRawBody(ctx: GatewayContext): Promise<string> {
  if (ctx.rawBody !== undefined) return ctx.rawBody
  const text = ctx.method === 'GET' || ctx.method === 'HEAD' ? '' : await ctx.request.text()
  ctx.rawBody = text
  ctx.upstreamBody = text
  return text
}

/** Reexport util para checagem de CIDR (conveniência de quem monta o contexto). */
export { ipMatchesAny }
