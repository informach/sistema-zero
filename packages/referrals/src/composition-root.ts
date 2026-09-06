import { createLogger, type Logger, serializeError } from '@sistemazero/core/logging'
import { AmbassadorAdminService } from './application/ambassadors/ambassador-admin.service'
import { RecordConversionService } from './application/conversions/record-conversion.service'
import { SweepConversionsService } from './application/conversions/sweep-conversions.service'
import { CreateInviteService } from './application/invites/create-invite.service'
import { RedeemScholarshipService } from './application/redeem-scholarship/redeem-scholarship.service'
import type { Env } from './infrastructure/config/env'
import { CatalogHttpClient } from './infrastructure/gateways/catalog-http.client'
import {
  createNullReferralsGateway,
  createReferralsGatewayClient,
} from './infrastructure/gateways/gateway.client'
import { PaymentsHttpClient } from './infrastructure/gateways/payments-http.client'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { createDbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleProcessedWebhookStore } from './infrastructure/persistence/drizzle/processed-webhook.store'
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

  // ── Consumer do payments (conversões da bolsa → bônus do embaixador) ──────
  const consumerEnabled = Boolean(env.PAYMENTS_WEBHOOK_HMAC_SECRET)
  const recordConversion = new RecordConversionService(
    repo,
    new PaymentsHttpClient({
      baseUrl: env.PAYMENTS_BASE_URL,
      internalToken: env.PAYMENTS_INTERNAL_TOKEN,
      timeoutMs: env.S2S_TIMEOUT_MS,
    }),
    new CatalogHttpClient({ baseUrl: env.CATALOG_BASE_URL, timeoutMs: env.S2S_TIMEOUT_MS }),
    {
      conversionOfferSlugs: env.CONVERSION_OFFER_SLUGS,
      bonusAmountCents: env.BONUS_AMOUNT_CENTS,
      matureHours: env.BONUS_MATURE_HOURS,
    },
    logger,
  )
  const sweep = new SweepConversionsService(
    repo,
    gateway,
    { funnelPublicUrl: env.FUNNEL_PUBLIC_URL, batchSize: 50 },
    logger,
  )
  if (!consumerEnabled) logger.warn('referrals.payments_consumer_disabled', {})

  const processedWebhooks = new DrizzleProcessedWebhookStore(connection.db)

  const app = createServer({
    logger,
    repo,
    redeem,
    invite,
    ambassadors,
    funnelPublicUrl: env.FUNNEL_PUBLIC_URL,
    bonusAmountCents: env.BONUS_AMOUNT_CENTS,
    webhooks: {
      handle: recordConversion,
      processedWebhooks,
      webhookHmacSecret: env.PAYMENTS_WEBHOOK_HMAC_SECRET,
      requireSignature: env.NODE_ENV === 'production',
      webhookToleranceSeconds: env.WEBHOOK_TOLERANCE_SECONDS,
      webhookProcessingStaleMs: env.WEBHOOK_PROCESSING_STALE_MS,
    },
    requireAdminEnabled: env.REQUIRE_ADMIN,
    internalToken: env.INTERNAL_API_TOKEN,
    metricsToken: env.METRICS_TOKEN,
    maxRequestBodyBytes: env.MAX_REQUEST_BODY_BYTES,
    readiness: async () => {
      await connection.sql`select 1`
    },
  })

  // Sweep periódico: a maturação roda sob advisory xact-lock DENTRO do
  // repositório (uma réplica por ciclo); a notificação roda fora de transação
  // (S2S nunca em tx; a Idempotency-Key do messaging torna corrida inócua).
  // ⚠️ SEMPRE ligado (não depende do secret do consumer): conversões já
  // gravadas — inclusive as antecipadas pelo `mature-now` do admin — precisam
  // ser promovidas/avisadas mesmo com o webhook desligado/rotacionando.
  let sweepTimer: ReturnType<typeof setInterval> | null = null
  async function runSweepCycle(): Promise<void> {
    try {
      await sweep.mature()
      await sweep.notify()
      // Retenção do dedupe do consumer (padrão fiscal): 30 dias, muito acima
      // do lease + janela de re-entrega do outbox do payments.
      const cutoff = new Date(Date.now() - PROCESSED_WEBHOOK_RETENTION_DAYS * 24 * 3600_000)
      await processedWebhooks.pruneProcessedBefore(cutoff)
    } catch (error) {
      logger.error('referrals.conversion_sweep_failed', { error: serializeError(error) })
    }
  }

  let server: ReturnType<typeof app.listen> | null = null

  return {
    logger,
    async start() {
      server = app.listen({ hostname: env.HOST, port: env.PORT })
      sweepTimer = setInterval(() => void runSweepCycle(), env.CONVERSION_SWEEP_INTERVAL_MS)
      void runSweepCycle()
      logger.info('app.started', { port: env.PORT, appEnv: env.APP_ENV ?? 'dev' })
    },
    async stop() {
      if (sweepTimer) clearInterval(sweepTimer)
      await server?.stop()
      await connection.close()
    },
  }
}

const PROCESSED_WEBHOOK_RETENTION_DAYS = 30
