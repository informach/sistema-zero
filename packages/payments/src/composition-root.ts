import { CancelSubscriptionService } from './application/cancel-subscription/cancel-subscription.service'
import { CreateSubscriptionService } from './application/create-subscription/create-subscription.service'
import { registerPaymentEventHandlers } from './application/event-handlers/payment-event-handlers'
import { GetAdminPaymentService } from './application/get-admin-payment/get-admin-payment.service'
import { GetAdminSubscriptionService } from './application/get-admin-subscription/get-admin-subscription.service'
import { GetMyPaymentService } from './application/get-my-payment/get-my-payment.service'
import { GetPaymentService } from './application/get-payment/get-payment.service'
import { GetSubscriptionService } from './application/get-subscription/get-subscription.service'
import { HandleBoletoNotificationService } from './application/handle-boleto-notification/handle-boleto-notification.service'
import { HandleProviderWebhookService } from './application/handle-provider-webhook/handle-provider-webhook.service'
import { HandleSubscriptionNotificationService } from './application/handle-subscription-notification/handle-subscription-notification.service'
import { ListMyPaymentsService } from './application/list-my-payments/list-my-payments.service'
import { ListPaymentsService } from './application/list-payments/list-payments.service'
import { ListSubscriptionsService } from './application/list-subscriptions/list-subscriptions.service'
import { GetPaymentsOpsService } from './application/payments-ops/get-payments-ops.service'
import { GetDailyPaymentsStatsService } from './application/payments-stats/get-daily-payments-stats.service'
import { GetPaymentsStatsService } from './application/payments-stats/get-payments-stats.service'
import { ProcessPaymentService } from './application/process-payment/process-payment.service'
import { RefundPaymentService } from './application/refund-payment/refund-payment.service'
import type { Env } from './infrastructure/config/env'
import { InProcessEventPublisher } from './infrastructure/events/in-process-event-publisher'
import { loadEfiCertificate } from './infrastructure/gateways/efi/certificate'
import { EfiClient } from './infrastructure/gateways/efi/efi.client'
import { EfiPaymentGateway } from './infrastructure/gateways/efi/efi.gateway'
import { EfiCobrancasClient } from './infrastructure/gateways/efi/efi-cobrancas.client'
import { createLogger, type Logger } from './infrastructure/logging/logger'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { OutboxPoller } from './infrastructure/outbox/outbox-poller'
import { CachingConsumerRepository } from './infrastructure/persistence/caching-consumer-repository'
import { PG_CHANNELS } from './infrastructure/persistence/drizzle/channels'
import { DrizzleConsumerRepository } from './infrastructure/persistence/drizzle/consumer.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleIdempotencyStore } from './infrastructure/persistence/drizzle/idempotency.store'
import { DrizzleMetricsRepository } from './infrastructure/persistence/drizzle/metrics.repository'
import { DrizzleOutboxRepository } from './infrastructure/persistence/drizzle/outbox.repository'
import { DrizzlePaymentRepository } from './infrastructure/persistence/drizzle/payment.repository'
import { DrizzlePaymentAdminReadRepository } from './infrastructure/persistence/drizzle/payment-admin-read.repository'
import { DrizzlePaymentMyReadRepository } from './infrastructure/persistence/drizzle/payment-my-read.repository'
import { PgNotificationListener } from './infrastructure/persistence/drizzle/pg-notification-listener'
import { DrizzleSubscriptionRepository } from './infrastructure/persistence/drizzle/subscription.repository'
import { DrizzleSubscriptionAdminReadRepository } from './infrastructure/persistence/drizzle/subscription-admin-read.repository'
import { DrizzleSubscriptionPlanRegistry } from './infrastructure/persistence/drizzle/subscription-plan-registry.repository'
import { DrizzleWebhookDeliveryRepository } from './infrastructure/persistence/drizzle/webhook-delivery.repository'
import { DrizzleWebhookInbox } from './infrastructure/persistence/drizzle/webhook-inbox.repository'
import { InMemoryRateLimiter } from './infrastructure/security/rate-limiter'
import { ChargeCreationWorker } from './infrastructure/workers/charge-creation-worker'
import { ReconciliationWorker } from './infrastructure/workers/reconciliation-worker'
import { WebhookDeliveryWorker } from './infrastructure/workers/webhook-delivery-worker'
import { createServer } from './interfaces/http/server'

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60
/**
 * Re-aquecimento periódico do token OAuth do Pix (token vive 1h; mTLS frio custa
 * ~15-16s sob Bun). Passa `intervalo + margem` ao `warmUp` p/ SEMPRE renovar fora
 * do hot path. Só o client Pix: o da API Cobranças não usa mTLS (re-auth barata)
 * e o token dele vive ~600s (re-warm de 45min não o manteria vivo de toda forma).
 */
const EFI_TOKEN_REWARM_INTERVAL_MS = 45 * 60 * 1000

/**
 * Chave do advisory lock do ciclo de limpeza/retenção ('payments' em ASCII
 * int8; string + cast ::bigint — o driver não tipa BigInt como parâmetro). O
 * espaço de advisory locks é GLOBAL ao banco compartilhado do monorepo — a
 * constante precisa ser única entre os serviços.
 */
const RETENTION_ADVISORY_LOCK_KEY = '8103081227979411315'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Raiz de composição (injeção de dependências). É o ÚNICO lugar onde as
 * implementações concretas são instanciadas e plugadas nos ports. Tudo abaixo
 * depende apenas de interfaces — o que mantém o domínio testável e os adapters
 * substituíveis.
 */
export function createApplication(env: Env): Application {
  // Espelho Sentry: TODO log de nível ERROR vira evento/issue (a convenção do
  // package é "log ERROR = sinal alertável"). No-op sem SENTRY_DSN.
  const logger = withSentryMirror(
    createLogger({
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      pretty: env.NODE_ENV !== 'production',
    }),
  )

  const connection: DbConnection = createDbConnection(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
  })
  const db = connection.db

  // Adapters de persistência
  const payments = new DrizzlePaymentRepository(db)
  const subscriptions = new DrizzleSubscriptionRepository(db)
  const planRegistry = new DrizzleSubscriptionPlanRegistry(db)
  const idempotency = new DrizzleIdempotencyStore(db)
  const outboxRepo = new DrizzleOutboxRepository(db)
  // Cache TTL 30s: o consumer é lido em TODA request autenticada e em toda
  // entrega de webhook; o conjunto é minúsculo/quase estático (db:seed).
  const consumers = new CachingConsumerRepository(new DrizzleConsumerRepository(db), 30_000)
  const webhookInbox = new DrizzleWebhookInbox(db)
  const webhookDeliveries = new DrizzleWebhookDeliveryRepository(db)
  const metrics = new DrizzleMetricsRepository(db)
  // Leitura admin (cross-consumer): SELECTs paginados + agregações p/ o painel.
  const paymentsAdminRead = new DrizzlePaymentAdminReadRepository(db)
  const subscriptionsAdminRead = new DrizzleSubscriptionAdminReadRepository(db)

  // Adapter do provedor (Efí)
  const efiCert = loadEfiCertificate({
    path: env.EFI_CERTIFICATE_PATH,
    base64: env.EFI_CERTIFICATE_BASE64,
    password: env.EFI_CERTIFICATE_PASSWORD,
  })
  const efiClient = new EfiClient({
    clientId: env.EFI_CLIENT_ID,
    clientSecret: env.EFI_CLIENT_SECRET,
    cert: efiCert.cert,
    key: efiCert.key,
    sandbox: env.EFI_SANDBOX,
    requestTimeoutMs: env.EFI_REQUEST_TIMEOUT_MS,
    totalBudgetMs: env.EFI_TOTAL_RETRY_BUDGET_MS,
  })
  // Cliente da API Cobranças (boleto): SEM certificado/mTLS. O `efiCert` acima é
  // exclusivo do Pix — não é passado aqui (o construtor não tem cert/key).
  const cobrancasClient = new EfiCobrancasClient({
    clientId: env.EFI_COBRANCAS_CLIENT_ID ?? env.EFI_CLIENT_ID,
    clientSecret: env.EFI_COBRANCAS_CLIENT_SECRET ?? env.EFI_CLIENT_SECRET,
    sandbox: env.EFI_SANDBOX,
    requestTimeoutMs: env.EFI_REQUEST_TIMEOUT_MS,
    totalBudgetMs: env.EFI_TOTAL_RETRY_BUDGET_MS,
  })
  const gateway = new EfiPaymentGateway(efiClient, cobrancasClient, {
    expiresDays: env.EFI_BOLETO_DEFAULT_EXPIRES_DAYS,
    fine: env.EFI_BOLETO_FINE,
    interest: env.EFI_BOLETO_INTEREST,
    notificationUrl: env.EFI_BOLETO_NOTIFICATION_URL,
  })

  // Eventos + outbox poller
  const publisher = new InProcessEventPublisher(logger)
  registerPaymentEventHandlers(publisher, webhookDeliveries, logger)
  const outboxPoller = new OutboxPoller(outboxRepo, publisher, logger, {
    intervalMs: env.OUTBOX_POLL_INTERVAL_MS,
    batchSize: env.OUTBOX_BATCH_SIZE,
    maxAttempts: env.OUTBOX_MAX_ATTEMPTS,
  })

  const rateLimiter = new InMemoryRateLimiter(env.RATE_LIMIT_PER_MINUTE)
  // Teto global das rotas de webhook (chave única, não por consumidor/IP).
  const webhookRateLimiter = new InMemoryRateLimiter(env.WEBHOOK_RATE_LIMIT_PER_MINUTE)

  // Worker do modo assíncrono (só roda quando ASYNC_CHARGE_CREATION=true).
  const chargeWorker = new ChargeCreationWorker(payments, gateway, logger, {
    intervalMs: env.CHARGE_WORKER_INTERVAL_MS,
    batchSize: env.CHARGE_WORKER_BATCH_SIZE,
    concurrency: env.CHARGE_WORKER_CONCURRENCY,
    maxAttempts: env.CHARGE_MAX_ATTEMPTS,
    staleAfterMs: env.CHARGE_CLAIM_STALE_MS,
    pixKey: env.EFI_PIX_KEY,
  })

  const reconciliationWorker = new ReconciliationWorker(payments, gateway, logger, {
    intervalMs: env.RECONCILE_INTERVAL_MS,
    batchSize: env.RECONCILE_BATCH_SIZE,
  })

  const webhookWorker = new WebhookDeliveryWorker(webhookDeliveries, consumers, logger, {
    intervalMs: env.WEBHOOK_DELIVERY_INTERVAL_MS,
    batchSize: env.WEBHOOK_DELIVERY_BATCH_SIZE,
    maxAttempts: env.WEBHOOK_DELIVERY_MAX_ATTEMPTS,
    concurrency: env.WEBHOOK_DELIVERY_CONCURRENCY,
  })

  // LISTEN/NOTIFY: acorda os workers na hora (latência ~ms); o poll é a rede de segurança.
  const notifications = new PgNotificationListener(connection.sql, logger)

  // Casos de uso
  const processPayment = new ProcessPaymentService(
    payments,
    gateway,
    idempotency,
    {
      pixKey: env.EFI_PIX_KEY,
      idempotencyTtlSeconds: IDEMPOTENCY_TTL_SECONDS,
      idempotencyInFlightTtlSeconds: env.IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS,
      asyncChargeCreation: env.ASYNC_CHARGE_CREATION,
      boletoDefaultExpiresDays: env.EFI_BOLETO_DEFAULT_EXPIRES_DAYS,
    },
    logger,
  )
  const getPayment = new GetPaymentService(payments)
  const createSubscription = new CreateSubscriptionService(
    subscriptions,
    payments,
    planRegistry,
    gateway,
    idempotency,
    {
      idempotencyTtlSeconds: IDEMPOTENCY_TTL_SECONDS,
      idempotencyInFlightTtlSeconds: env.IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS,
    },
    logger,
  )
  const getSubscription = new GetSubscriptionService(subscriptions)
  const cancelSubscription = new CancelSubscriptionService(subscriptions, gateway, logger)
  const handleWebhook = new HandleProviderWebhookService(payments, gateway, webhookInbox, logger)
  const handleSubscriptionNotification = new HandleSubscriptionNotificationService(
    subscriptions,
    payments,
    gateway,
    webhookInbox,
    logger,
  )
  // O handler de Cobranças resolve o token uma vez e despacha ciclos de assinatura
  // ao handler recorrente (5º argumento) — cobranças avulsas seguem o caminho normal.
  const handleBoletoNotification = new HandleBoletoNotificationService(
    payments,
    gateway,
    webhookInbox,
    logger,
    handleSubscriptionNotification,
  )

  // Casos de uso de leitura admin (painel @sistemazero/admin)
  const listPayments = new ListPaymentsService(paymentsAdminRead)
  const getAdminPayment = new GetAdminPaymentService(payments)
  const listSubscriptions = new ListSubscriptionsService(subscriptionsAdminRead)
  const getAdminSubscription = new GetAdminSubscriptionService(subscriptions)
  const getPaymentsStats = new GetPaymentsStatsService(paymentsAdminRead)
  const getDailyPaymentsStats = new GetDailyPaymentsStatsService(paymentsAdminRead)
  const getPaymentsOps = new GetPaymentsOpsService(paymentsAdminRead)
  const refundPayment = new RefundPaymentService(payments, gateway, logger)

  // "Minhas compras" (self-service do comprador — app community). Leitura escopada
  // pelo e-mail das claims (X-Auth-User-Email injetado pelo gateway).
  const paymentsMyRead = new DrizzlePaymentMyReadRepository(db)
  const listMyPayments = new ListMyPaymentsService(paymentsMyRead)
  const getMyPayment = new GetMyPaymentService(paymentsMyRead)

  // Readiness (`/readyz`, healthcheck do Railway): a réplica só é promovida
  // quando o banco responde E o warm-up da Efí TERMINOU (sucesso OU falha — o
  // warm-up é best-effort; Efí fora do ar no boot não pode brickar o deploy, mas
  // promover ANTES da tentativa reintroduz o 502 do PIX frio no redeploy).
  let efiWarmupSettled = false
  const markWarmupSettled = () => {
    efiWarmupSettled = true
  }
  const readiness = async () => {
    const checks: Record<string, string> = {
      db: 'ok',
      efiWarmup: efiWarmupSettled ? 'ok' : 'pending',
    }
    try {
      await connection.sql`select 1`
    } catch {
      checks.db = 'error'
    }
    return { ready: checks.db === 'ok' && efiWarmupSettled, checks }
  }

  // Borda HTTP
  const server = createServer({
    env,
    logger,
    consumers,
    rateLimiter,
    webhookRateLimiter,
    readiness,
    processPayment,
    getPayment,
    createSubscription,
    getSubscription,
    cancelSubscription,
    handleWebhook,
    handleBoletoNotification,
    getMetrics: () => metrics.getMetrics(),
    requireAdminEnabled: env.REQUIRE_ADMIN,
    internalToken: env.INTERNAL_API_TOKEN,
    listPayments,
    getAdminPayment,
    listSubscriptions,
    getAdminSubscription,
    getPaymentsStats,
    getDailyPaymentsStats,
    getPaymentsOps,
    refundPayment,
    listMyPayments,
    getMyPayment,
  })

  let cleanupTimer: ReturnType<typeof setInterval> | null = null
  let rewarmTimer: ReturnType<typeof setInterval> | null = null

  return {
    logger,
    async start() {
      outboxPoller.start()
      reconciliationWorker.start()
      webhookWorker.start()
      if (env.ASYNC_CHARGE_CREATION) chargeWorker.start()
      // Assina os canais para acordar os workers na hora (fail-safe: cai no poll).
      if (env.PG_LISTEN_ENABLED) {
        await notifications.listen(PG_CHANNELS.outbox, () => outboxPoller.wake())
        await notifications.listen(PG_CHANNELS.webhookDeliveries, () => webhookWorker.wake())
      }
      // Limpeza periódica (fora do hot path): chaves de idempotência expiradas +
      // retenção das tabelas append-only (outbox/webhook_events/webhook_deliveries)
      // para não crescerem sem limite. O advisory lock garante que SÓ UMA réplica
      // executa o ciclo (N réplicas disparando os mesmos DELETEs = carga ×N +
      // contenção de lock à toa); xact-lock → solta sozinho no commit/crash.
      const runCleanupCycle = async () => {
        await connection.sql.begin(async (gate) => {
          const [row] = await gate`
            select pg_try_advisory_xact_lock(${RETENTION_ADVISORY_LOCK_KEY}::bigint) as locked
          `
          if (!row?.['locked']) return // outra réplica está limpando neste ciclo
          // ⚠️ A transação-gate fica idle enquanto os DELETEs rodam no pool — o
          // idle_in_transaction_session_timeout (30s) a mata se a limpeza passar
          // disso (o lock solta e outra réplica pode assumir; DELETEs são
          // idempotentes, então é seguro — só perde a exclusividade).
          await idempotency.cleanupExpired().catch((error) =>
            logger.error('idempotency.cleanup.failed', {
              error: error instanceof Error ? error.message : String(error),
            }),
          )
          const cutoff = new Date(Date.now() - env.RETENTION_DAYS * 24 * 60 * 60 * 1000)
          const [outboxRows, webhookEventRows, deliveryRows] = await Promise.all([
            outboxRepo.cleanup(cutoff),
            webhookInbox.cleanup(cutoff),
            webhookDeliveries.cleanup(cutoff),
          ])
          if (outboxRows + webhookEventRows + deliveryRows > 0) {
            logger.info('retention.cleaned', {
              outbox: outboxRows,
              webhookEvents: webhookEventRows,
              deliveries: deliveryRows,
            })
          }
        })
      }
      cleanupTimer = setInterval(() => {
        void runCleanupCycle().catch((error) =>
          logger.error('retention.cleanup.failed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      }, env.IDEMPOTENCY_CLEANUP_INTERVAL_MS)
      // `::` = dual-stack (IPv4+IPv6) — necessário p/ o private networking do
      // Railway (`payments.railway.internal` resolve IPv6).
      server.listen({ port: env.PORT, hostname: env.HOST })
      logger.info('http.listening', { port: env.PORT, host: env.HOST })
      // Pré-aquece os tokens OAuth da Efí (best-effort, fora do caminho da request).
      // O 1º handshake mTLS do Pix é caro (~15s no cold-start) e, sem isto, a 1ª
      // cobrança pós-restart estoura o timeout → 502 no funil. Não bloqueia o boot,
      // mas o `/readyz` (healthcheck do Railway) só fica pronto quando AMBOS os
      // warm-ups terminam — a réplica nova não recebe tráfego com a Efí fria.
      const pixWarmup = efiClient
        .warmUp()
        .then(() => logger.info('efi.pix.token.warmed'))
        .catch((error) =>
          logger.warn('efi.pix.warmup.failed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      const cobrancasWarmup = cobrancasClient
        .warmUp()
        .then(() => logger.info('efi.cobrancas.token.warmed'))
        .catch((error) =>
          logger.warn('efi.cobrancas.warmup.failed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      void Promise.allSettled([pixWarmup, cobrancasWarmup]).then(markWarmupSettled)
      // Re-warm periódico do token Pix: sem isto, o 1º checkout após >1h do boot
      // paga a re-autenticação mTLS (~15-16s) DENTRO da request → timeout → 502.
      rewarmTimer = setInterval(() => {
        void efiClient
          .warmUp(EFI_TOKEN_REWARM_INTERVAL_MS + 60_000)
          .then(() => logger.debug('efi.pix.token.rewarmed'))
          .catch((error) =>
            logger.warn('efi.pix.rewarm.failed', {
              error: error instanceof Error ? error.message : String(error),
            }),
          )
      }, EFI_TOKEN_REWARM_INTERVAL_MS)
    },
    async stop() {
      if (cleanupTimer) clearInterval(cleanupTimer)
      if (rewarmTimer) clearInterval(rewarmTimer)
      // 1) Para de aceitar novas requisições e de receber notificações.
      await server.stop()
      await notifications.stop()
      // 2) Drena os ciclos em andamento dos workers (não corta trabalho no meio).
      await Promise.all([
        chargeWorker.stop(),
        reconciliationWorker.stop(),
        webhookWorker.stop(),
        outboxPoller.stop(),
      ])
      // 3) Só então fecha o pool do banco.
      await connection.close()
      logger.info('app.stopped')
    },
  }
}
