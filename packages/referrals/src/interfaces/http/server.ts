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
import { meRoutes } from './me.routes'
import { type WebhooksRoutesDeps, webhooksRoutes } from './webhooks.routes'

export interface HttpDeps {
  logger: Logger
  repo: ReferralRepository
  redeem: RedeemScholarshipService
  invite: CreateInviteService
  ambassadors: AmbassadorAdminService
  funnelPublicUrl: string
  /** Snapshot da env BONUS_AMOUNT_CENTS — exposto na view "me" (copy nunca hardcoda). */
  bonusAmountCents: number
  /** Consumer do payments (ausente em teste/dev sem banco = rota fora). */
  webhooks?: Omit<WebhooksRoutesDeps, 'logger'>
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
 * Borda HTTP do referrals: `/referrals/admin/*` e `/referrals/internal/*`
 * chegam VIA GATEWAY (JWT/RBAC e HMAC de borda lá; a prova de origem aqui é o
 * `x-internal-token`); `/webhooks/payments` chega DIRETO na rede privada
 * (consumer do fan-out do payments, HMAC do corpo cru).
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
          repo: deps.repo,
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
      .use(
        meRoutes({
          ambassadors: deps.ambassadors,
          repo: deps.repo,
          bonusAmountCents: deps.bonusAmountCents,
          internalToken: deps.internalToken,
        }),
      )
      .use(deps.webhooks ? webhooksRoutes({ ...deps.webhooks, logger: deps.logger }) : new Elysia())
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
