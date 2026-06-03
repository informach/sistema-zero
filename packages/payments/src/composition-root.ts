import { CancelSubscriptionService } from './application/cancel-subscription/cancel-subscription.service'
import { CreateSubscriptionService } from './application/create-subscription/create-subscription.service'
import { registerPaymentEventHandlers } from './application/event-handlers/payment-event-handlers'
import { GetAdminPaymentService } from './application/get-admin-payment/get-admin-payment.service'
import { GetAdminSubscriptionService } from './application/get-admin-subscription/get-admin-subscription.service'
import { GetPaymentService } from './application/get-payment/get-payment.service'
import { GetSubscriptionService } from './application/get-subscription/get-subscription.service'
import { HandleBoletoNotificationService } from './application/handle-boleto-notification/handle-boleto-notification.service'
import { HandleProviderWebhookService } from './application/handle-provider-webhook/handle-provider-webhook.service'
import { HandleSubscriptionNotificationService } from './application/handle-subscription-notification/handle-subscription-notification.service'
import { ListPaymentsService } from './application/list-payments/list-payments.service'
import { ListSubscriptionsService } from './application/list-subscriptions/list-subscriptions.service'
import { GetPaymentsOpsService } from './application/payments-ops/get-payments-ops.service'
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
import { OutboxPoller } from './infrastructure/outbox/outbox-poller'
import { PG_CHANNELS } from './infrastructure/persistence/drizzle/channels'
import { DrizzleConsumerRepository } from './infrastructure/persistence/drizzle/consumer.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleIdempotencyStore } from './infrastructure/persistence/drizzle/idempotency.store'
import { DrizzleMetricsRepository } from './infrastructure/persistence/drizzle/metrics.repository'
import { DrizzleOutboxRepository } from './infrastructure/persistence/drizzle/outbox.repository'
import { DrizzlePaymentRepository } from './infrastructure/persistence/drizzle/payment.repository'
import { DrizzlePaymentAdminReadRepository } from './infrastructure/persistence/drizzle/payment-admin-read.repository'
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
/** TTL curto da reserva em andamento (recicla reservas presas por crash). */
const IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS = 120

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
  const logger = createLogger({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    pretty: env.NODE_ENV !== 'production',
  })

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
  const consumers = new DrizzleConsumerRepository(db)
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
  })
  // Cliente da API Cobranças (boleto): SEM certificado/mTLS. O `efiCert` acima é
  // exclusivo do Pix — não é passado aqui (o construtor não tem cert/key).
  const cobrancasClient = new EfiCobrancasClient({
    clientId: env.EFI_COBRANCAS_CLIENT_ID ?? env.EFI_CLIENT_ID,
    clientSecret: env.EFI_COBRANCAS_CLIENT_SECRET ?? env.EFI_CLIENT_SECRET,
    sandbox: env.EFI_SANDBOX,
    requestTimeoutMs: env.EFI_REQUEST_TIMEOUT_MS,
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
      idempotencyInFlightTtlSeconds: IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS,
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
      idempotencyInFlightTtlSeconds: IDEMPOTENCY_IN_FLIGHT_TTL_SECONDS,
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
  const getPaymentsOps = new GetPaymentsOpsService(paymentsAdminRead)
  const refundPayment = new RefundPaymentService(payments, gateway, logger)

  // Borda HTTP
  const server = createServer({
    env,
    logger,
    consumers,
    rateLimiter,
    processPayment,
    getPayment,
    createSubscription,
    getSubscription,
    cancelSubscription,
    handleWebhook,
    handleBoletoNotification,
    getMetrics: () => metrics.getMetrics(),
    requireAdminEnabled: env.REQUIRE_ADMIN,
    listPayments,
    getAdminPayment,
    listSubscriptions,
    getAdminSubscription,
    getPaymentsStats,
    getPaymentsOps,
    refundPayment,
  })

  let cleanupTimer: ReturnType<typeof setInterval> | null = null

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
      // para não crescerem sem limite.
      cleanupTimer = setInterval(() => {
        void idempotency.cleanupExpired().catch((error) =>
          logger.error('idempotency.cleanup.failed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
        const cutoff = new Date(Date.now() - env.RETENTION_DAYS * 24 * 60 * 60 * 1000)
        void Promise.all([
          outboxRepo.cleanup(cutoff),
          webhookInbox.cleanup(cutoff),
          webhookDeliveries.cleanup(cutoff),
        ])
          .then(([outboxRows, webhookEventRows, deliveryRows]) => {
            if (outboxRows + webhookEventRows + deliveryRows > 0) {
              logger.info('retention.cleaned', {
                outbox: outboxRows,
                webhookEvents: webhookEventRows,
                deliveries: deliveryRows,
              })
            }
          })
          .catch((error) =>
            logger.error('retention.cleanup.failed', {
              error: error instanceof Error ? error.message : String(error),
            }),
          )
      }, env.IDEMPOTENCY_CLEANUP_INTERVAL_MS)
      server.listen(env.PORT)
      logger.info('http.listening', { port: env.PORT })
      // Pré-aquece os tokens OAuth da Efí (best-effort, fora do caminho da request).
      // O 1º handshake mTLS do Pix é caro (~15s no cold-start) e, sem isto, a 1ª
      // cobrança pós-restart estoura o timeout → 502 no funil. Não bloqueia o boot.
      void efiClient
        .warmUp()
        .then(() => logger.info('efi.pix.token.warmed'))
        .catch((error) =>
          logger.warn('efi.pix.warmup.failed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      void cobrancasClient
        .warmUp()
        .then(() => logger.info('efi.cobrancas.token.warmed'))
        .catch((error) =>
          logger.warn('efi.cobrancas.warmup.failed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
    },
    async stop() {
      if (cleanupTimer) clearInterval(cleanupTimer)
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
