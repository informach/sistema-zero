import { envelope, ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import { safeEqual } from '@sistemazero/core/security'
import { Elysia } from 'elysia'
import type { AmbassadorAdminService } from '../../application/ambassadors/ambassador-admin.service'
import type { CreateInviteService } from '../../application/invites/create-invite.service'
import type { RedeemScholarshipService } from '../../application/redeem-scholarship/redeem-scholarship.service'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'
import { adminRoutes } from './admin.routes'
import { internalRoutes } from './internal.routes'

export interface HttpDeps {
  logger: Logger
  repo: ReferralRepository
  redeem: RedeemScholarshipService
  invite: CreateInviteService
  ambassadors: AmbassadorAdminService
  funnelPublicUrl: string
  requireAdminEnabled?: boolean
  internalToken?: string
  /** Token do `/metrics` (header `x-metrics-token`/Bearer; obrigatório em prod). */
  metricsToken?: string
  /** Teto de corpo no nível do Bun.serve (413 automático). */
  maxRequestBodyBytes?: number
  /** Probe de readiness (select 1). */
  readiness: () => Promise<void>
}

/**
 * Borda HTTP do referrals. Fase 1: tudo chega VIA GATEWAY (`/referrals/admin/*`
 * com JWT/RBAC lá; `/referrals/internal/*` com HMAC de borda do funil) — a prova
 * de origem aqui é o `x-internal-token`. O consumer do payments (webhook direto)
 * chega na fase 3.
 */
export function createServer(deps: HttpDeps) {
  return (
    new Elysia({
      serve: { maxRequestBodySize: deps.maxRequestBodyBytes ?? 64 * 1024 },
    })
      .onError(({ error, set, code }) => {
        if (error instanceof UnauthorizedError) {
          set.status = 401
          return envelope('UNAUTHORIZED', error.message)
        }
        if (error instanceof ForbiddenError) {
          set.status = 403
          return envelope('FORBIDDEN', error.message)
        }
        if (code === 'VALIDATION') {
          // Envelope FIXO: nunca ecoar o input recebido nem vazar a forma do schema.
          set.status = 400
          return envelope('VALIDATION_ERROR', 'Requisição inválida')
        }
        if (set.status === 200 || set.status === undefined) set.status = 500
        if (set.status === 500) {
          deps.logger.error('unhandled.error', { error: serializeError(error) })
          return envelope('INTERNAL_ERROR', 'Erro interno')
        }
        return undefined
      })
      .use(
        adminRoutes({
          ambassadors: deps.ambassadors,
          requireAdminEnabled: deps.requireAdminEnabled ?? true,
          internalToken: deps.internalToken,
        }),
      )
      .use(
        internalRoutes({
          repo: deps.repo,
          redeem: deps.redeem,
          invite: deps.invite,
          funnelPublicUrl: deps.funnelPublicUrl,
          internalToken: deps.internalToken,
        }),
      )
      .get('/healthz', () => ({ status: 'ok' }))
      .get('/readyz', async ({ set }) => {
        try {
          await deps.readiness()
          return { status: 'ready' }
        } catch {
          set.status = 503
          return { status: 'unavailable' }
        }
      })
      // Contagem de resgates por status p/ monitoramento (alerte em failed > 0).
      .get('/metrics', async ({ headers, set }) => {
        if (deps.metricsToken) {
          const auth = headers.authorization
          const bearer = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined
          const provided = headers['x-metrics-token'] ?? bearer
          if (!provided || !safeEqual(provided, deps.metricsToken)) {
            set.status = 401
            return envelope('UNAUTHORIZED', 'Token de métricas inválido')
          }
        }
        return { redemptionsByStatus: await deps.repo.countRedemptionsByStatus() }
      })
  )
}
