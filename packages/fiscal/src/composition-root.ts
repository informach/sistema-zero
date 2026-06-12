import { createLogger, type Logger } from '@sistemazero/core/logging'
import { EmitInvoiceService } from './application/emit-invoice/emit-invoice.service'
import { HandlePaymentWebhookService } from './application/handle-payment-webhook/handle-payment-webhook.service'
import { buildDpsId, type EmitterProfile, INFORMACH_BASE } from './domain/dps/emitter-profile'
import type { DanfseClient, SefinNacionalGateway } from './domain/ports/sefin-gateway.port'
import {
  type A1Certificate,
  certDaysLeft,
  loadA1Certificate,
} from './infrastructure/certificate/a1-certificate'
import type { Env } from './infrastructure/config/env'
import { CatalogHttpClient } from './infrastructure/gateways/catalog-http.client'
import { FakeDanfseClient, FakeSefinGateway } from './infrastructure/gateways/fake-sefin.gateway'
import { PaymentsHttpClient } from './infrastructure/gateways/payments-http.client'
import { AdnDanfseClient, SefinHttpGateway } from './infrastructure/gateways/sefin/sefin.gateway'
import {
  createGatewayMessagingClient,
  createNullMessagingClient,
} from './infrastructure/messaging/gateway-messaging-client'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { createDbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleInvoiceRepository } from './infrastructure/persistence/drizzle/invoice.repository'
import {
  DrizzleProcessedWebhookStore,
  FISCAL_RETENTION_LOCK_KEY,
  withAdvisoryLock,
} from './infrastructure/persistence/drizzle/processed-webhook.store'
import { CancellationWorker } from './infrastructure/workers/cancellation-worker'
import { EmissionWorker } from './infrastructure/workers/emission-worker'
import { createServer } from './interfaces/http/server'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

const RETENTION_INTERVAL_MS = 6 * 3600_000
const PROCESSED_WEBHOOK_RETENTION_DAYS = 30

export function createApplication(env: Env): Application {
  const logger = withSentryMirror(
    createLogger({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' }),
  )

  const connection = createDbConnection(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX })
  const invoices = new DrizzleInvoiceRepository(connection.db)
  const processedWebhooks = new DrizzleProcessedWebhookStore(connection.db)

  const payments = new PaymentsHttpClient({
    baseUrl: env.PAYMENTS_BASE_URL,
    internalToken: env.PAYMENTS_INTERNAL_TOKEN,
    timeoutMs: env.S2S_TIMEOUT_MS,
  })
  const catalog = new CatalogHttpClient({
    baseUrl: env.CATALOG_BASE_URL,
    timeoutMs: env.S2S_TIMEOUT_MS,
  })

  const profile: EmitterProfile = {
    ...INFORMACH_BASE,
    tpAmb: env.NFSE_AMBIENTE === 'producao' ? '1' : '2',
    im: env.NFSE_IM ?? '',
    serie: env.NFSE_DPS_SERIE,
    cTribMun: env.NFSE_CTRIB_MUN,
    pTotTribSN: env.NFSE_PTOTTRIB_SN,
  }

  // Gateway REAL quando há certificado A1; FAKE só em dev/teste sem cert.
  // Trava dura: o fake NUNCA roda apontando p/ produção (e produção sem cert
  // já falha no env.ts).
  const hasCert = Boolean(env.NFSE_CERT_PFX_BASE64 || env.NFSE_CERT_PFX_PATH)
  let sefin: SefinNacionalGateway
  let danfse: DanfseClient
  let certInfo: A1Certificate | null = null
  if (hasCert) {
    certInfo = loadA1Certificate({
      base64: env.NFSE_CERT_PFX_BASE64,
      path: env.NFSE_CERT_PFX_PATH,
      password: env.NFSE_CERT_PASSWORD,
    })
    const daysLeft = certDaysLeft(certInfo)
    if (daysLeft < 0 && env.NODE_ENV === 'production') {
      throw new Error(
        `Certificado A1 EXPIRADO em ${certInfo.info.notAfter.toISOString()} — renove na AC`,
      )
    }
    if (daysLeft < env.NFSE_CERT_WARN_DAYS) {
      logger.error('fiscal.cert_expiring', {
        daysLeft,
        notAfter: certInfo.info.notAfter.toISOString(),
      })
    }
    logger.info('fiscal.certificate_loaded', {
      subject: certInfo.info.subject,
      notAfter: certInfo.info.notAfter.toISOString(),
    })
    sefin = new SefinHttpGateway(
      profile,
      certInfo,
      { ambiente: env.NFSE_AMBIENTE, timeoutMs: env.NFSE_REQUEST_TIMEOUT_MS },
      logger,
    )
    danfse = new AdnDanfseClient(certInfo, {
      ambiente: env.NFSE_AMBIENTE,
      timeoutMs: env.NFSE_REQUEST_TIMEOUT_MS,
    })
  } else {
    if (env.NFSE_AMBIENTE === 'producao') {
      throw new Error('FakeSefinGateway não pode rodar com NFSE_AMBIENTE=producao')
    }
    sefin = new FakeSefinGateway(logger)
    danfse = new FakeDanfseClient()
  }

  const handleWebhook = new HandlePaymentWebhookService(
    invoices,
    payments,
    catalog,
    {
      ambiente: env.NFSE_AMBIENTE,
      serviceDescPrefix: env.NFSE_SERVICE_DESC_PREFIX,
      defaultGuaranteeDays: env.NFSE_DEFAULT_GUARANTEE_DAYS,
      emitBufferHours: env.NFSE_EMIT_BUFFER_HOURS,
      cancelWindowDays: env.NFSE_CANCEL_WINDOW_DAYS,
    },
    logger,
  )

  // E-mail da nota via gateway → messaging (best-effort; no-op sem credenciais).
  const messaging =
    env.GATEWAY_URL && env.FISCAL_HMAC_SECRET
      ? createGatewayMessagingClient({
          gatewayUrl: env.GATEWAY_URL,
          hmacSecret: env.FISCAL_HMAC_SECRET,
          timeoutMs: env.S2S_TIMEOUT_MS,
        })
      : createNullMessagingClient(logger)

  const emitInvoice = new EmitInvoiceService(
    invoices,
    payments,
    sefin,
    danfse,
    messaging,
    {
      serie: env.NFSE_DPS_SERIE,
      maxAttempts: env.NFSE_MAX_ATTEMPTS,
      buildDpsId: (serie, numero) => buildDpsId(profile, serie, numero),
      selfUrl: env.FISCAL_SELF_URL,
    },
    logger,
  )

  const emissionWorker = new EmissionWorker(invoices, emitInvoice, logger, {
    intervalMs: env.NFSE_WORKER_INTERVAL_MS,
    batchSize: env.NFSE_WORKER_BATCH_SIZE,
    staleMs: env.NFSE_CLAIM_STALE_MS,
    maxAttempts: env.NFSE_MAX_ATTEMPTS,
  })

  const cancellationWorker = new CancellationWorker(invoices, sefin, logger, {
    intervalMs: env.NFSE_WORKER_INTERVAL_MS,
    batchSize: env.NFSE_WORKER_BATCH_SIZE,
    staleMs: env.NFSE_CLAIM_STALE_MS,
  })

  const app = createServer({
    logger,
    handleWebhook,
    processedWebhooks,
    invoices,
    payments,
    catalog,
    ambiente: env.NFSE_AMBIENTE,
    serviceDescPrefix: env.NFSE_SERVICE_DESC_PREFIX,
    webhookHmacSecret: env.PAYMENTS_WEBHOOK_HMAC_SECRET,
    webhookToleranceSeconds: env.PAYMENTS_WEBHOOK_TOLERANCE_SECONDS,
    requireAdminEnabled: env.REQUIRE_ADMIN,
    internalToken: env.INTERNAL_API_TOKEN,
    readiness: async () => {
      await connection.sql`select 1`
    },
  })

  let retentionTimer: ReturnType<typeof setInterval> | null = null
  let server: ReturnType<typeof app.listen> | null = null

  return {
    logger,
    async start() {
      server = app.listen({ hostname: env.HOST, port: env.PORT })
      emissionWorker.start()
      cancellationWorker.start()
      // Retenção do dedupe + alerta diário de expiração do certificado
      // (advisory lock — 1 réplica por ciclo; o espelho do Sentry pega o ERROR).
      retentionTimer = setInterval(() => {
        void withAdvisoryLock(connection.db, FISCAL_RETENTION_LOCK_KEY, async () => {
          const pruned = await processedWebhooks.pruneOlderThan(PROCESSED_WEBHOOK_RETENTION_DAYS)
          if (pruned > 0) logger.info('fiscal.retention_pruned', { pruned })
          if (certInfo) {
            const daysLeft = certDaysLeft(certInfo)
            if (daysLeft < env.NFSE_CERT_WARN_DAYS) {
              logger.error('fiscal.cert_expiring', {
                daysLeft,
                notAfter: certInfo.info.notAfter.toISOString(),
              })
            }
          }
        }).catch((error) => logger.error('fiscal.retention_failed', { error: String(error) }))
      }, RETENTION_INTERVAL_MS)
      logger.info('app.started', {
        port: env.PORT,
        ambiente: env.NFSE_AMBIENTE,
        appEnv: env.APP_ENV ?? 'dev',
      })
    },
    async stop() {
      emissionWorker.stop()
      cancellationWorker.stop()
      if (retentionTimer) clearInterval(retentionTimer)
      await server?.stop()
      await connection.close()
    },
  }
}
