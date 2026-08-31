import { createLogger, type Logger } from '@sistemazero/core/logging'
import { AmbassadorAdminService } from './application/ambassadors/ambassador-admin.service'
import { CreateInviteService } from './application/invites/create-invite.service'
import { RedeemScholarshipService } from './application/redeem-scholarship/redeem-scholarship.service'
import type { Env } from './infrastructure/config/env'
import {
  createNullReferralsGateway,
  createReferralsGatewayClient,
} from './infrastructure/gateways/gateway.client'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { createDbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleReferralRepository } from './infrastructure/persistence/drizzle/referral.repository'
import { createServer } from './interfaces/http/server'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

export function createApplication(env: Env): Application {
  const logger = withSentryMirror(
    createLogger({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' }),
  )

  const connection = createDbConnection(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX })
  const repo = new DrizzleReferralRepository(connection.db)

  // Todas as integrações via gateway (consumer HMAC `referrals`). Sem
  // credenciais (dev local) → no-op: leituras 502, envios "não saíram".
  const gatewayEnabled = Boolean(env.GATEWAY_URL && env.REFERRALS_HMAC_SECRET)
  const gateway = gatewayEnabled
    ? createReferralsGatewayClient({
        baseUrl: env.GATEWAY_URL!,
        hmacSecret: env.REFERRALS_HMAC_SECRET!,
        timeoutMs: env.S2S_TIMEOUT_MS,
      })
    : createNullReferralsGateway()
  if (!gatewayEnabled) logger.warn('referrals.gateway_disabled', {})

  const redeem = new RedeemScholarshipService(
    repo,
    gateway,
    {
      offerSlug: env.SCHOLARSHIP_OFFER_SLUG,
      kidsCommunityUrl: env.KIDS_COMMUNITY_URL,
      leaseMs: env.REDEMPTION_LEASE_MS,
    },
    logger,
  )
  const invite = new CreateInviteService(
    repo,
    gateway,
    { funnelPublicUrl: env.FUNNEL_PUBLIC_URL, dailyLimit: env.INVITE_DAILY_LIMIT },
    logger,
  )
  const ambassadors = new AmbassadorAdminService(
    repo,
    gateway,
    { funnelPublicUrl: env.FUNNEL_PUBLIC_URL },
    logger,
  )

  const app = createServer({
    logger,
    repo,
    redeem,
    invite,
    ambassadors,
    funnelPublicUrl: env.FUNNEL_PUBLIC_URL,
    requireAdminEnabled: env.REQUIRE_ADMIN,
    internalToken: env.INTERNAL_API_TOKEN,
    metricsToken: env.METRICS_TOKEN,
    maxRequestBodyBytes: env.MAX_REQUEST_BODY_BYTES,
    readiness: async () => {
      await connection.sql`select 1`
    },
  })

  let server: ReturnType<typeof app.listen> | null = null

  return {
    logger,
    async start() {
      server = app.listen({ hostname: env.HOST, port: env.PORT })
      logger.info('app.started', { port: env.PORT, appEnv: env.APP_ENV ?? 'dev' })
    },
    async stop() {
      await server?.stop()
      await connection.close()
    },
  }
}
