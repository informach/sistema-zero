import type { Logger } from '@sistemazero/core/logging'
import type { HttpMethod } from '../../domain/routing/route'
import type { RouteMatch } from '../../domain/routing/route-match'
import type { Principal } from '../auth/auth-strategy.port'
import type { AuthenticatedUser } from '../auth/authenticated-user'

/** Info de rate limit acumulada para os headers de resposta e o refund. */
export interface RateLimitContext {
  key: string
  limit: number
  remaining: number
  resetMs: number
  retryAfterSeconds: number
}

/**
 * Estado mutável por requisição que atravessa a cadeia (Chain of Responsibility).
 * Os stages leem/escrevem aqui; os deps globais entram pelas factories dos stages.
 */
export interface GatewayContext {
  readonly requestId: string
  /** W3C trace context (header `traceparent`) propagado do cliente ou gerado. */
  readonly traceparent: string
  readonly traceId: string
  readonly request: Request
  readonly method: HttpMethod
  readonly url: URL
  readonly clientIp: string
  readonly startedAt: number
  readonly logger: Logger

  // Resolução de rota/versão
  route?: RouteMatch
  requestedVersion: string
  versionFromPath: boolean

  // Autenticação
  principal?: Principal
  // Usuário resolvido (claims do JWT) — `{id,email,firstName,lastName,role,status,...}`.
  user?: AuthenticatedUser

  // Requisição de saída (mutável por transforms/resign antes do proxy)
  upstreamPath: string
  upstreamHeaders: Headers
  upstreamBody: RequestInit['body']
  rawBody?: string

  // Resposta
  response?: Response
  responseHeaders: Headers
  rateLimit?: RateLimitContext

  // Proxy (preenchido pelo proxy stage, para o access log/observabilidade)
  upstreamTarget?: string
  attempts?: number
}

/** Retornar uma Response curto-circuita a cadeia (vira `ctx.response`). */
export type StageOutcome = Response | undefined

/** Elo da cadeia (CoR). */
export interface Stage {
  readonly name: string
  run(ctx: GatewayContext): Promise<StageOutcome> | StageOutcome
}
