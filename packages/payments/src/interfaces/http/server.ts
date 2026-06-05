import { swagger } from '@elysiajs/swagger'
import { Elysia } from 'elysia'
import type { CancelSubscriptionService } from '../../application/cancel-subscription/cancel-subscription.service'
import type { CreateSubscriptionService } from '../../application/create-subscription/create-subscription.service'
import type { GetAdminPaymentService } from '../../application/get-admin-payment/get-admin-payment.service'
import type { GetAdminSubscriptionService } from '../../application/get-admin-subscription/get-admin-subscription.service'
import type { GetMyPaymentService } from '../../application/get-my-payment/get-my-payment.service'
import type { GetPaymentService } from '../../application/get-payment/get-payment.service'
import type { GetSubscriptionService } from '../../application/get-subscription/get-subscription.service'
import type { HandleBoletoNotificationService } from '../../application/handle-boleto-notification/handle-boleto-notification.service'
import type { HandleProviderWebhookService } from '../../application/handle-provider-webhook/handle-provider-webhook.service'
import type { ListMyPaymentsService } from '../../application/list-my-payments/list-my-payments.service'
import type { ListPaymentsService } from '../../application/list-payments/list-payments.service'
import type { ListSubscriptionsService } from '../../application/list-subscriptions/list-subscriptions.service'
import type { GetPaymentsOpsService } from '../../application/payments-ops/get-payments-ops.service'
import type { GetDailyPaymentsStatsService } from '../../application/payments-stats/get-daily-payments-stats.service'
import type { GetPaymentsStatsService } from '../../application/payments-stats/get-payments-stats.service'
import type { ProcessPaymentService } from '../../application/process-payment/process-payment.service'
import type { RefundPaymentService } from '../../application/refund-payment/refund-payment.service'
import type { ConsumerRepository } from '../../domain/ports/consumer-repository.port'
import type { Env } from '../../infrastructure/config/env'
import type { Logger } from '../../infrastructure/logging/logger'
import type { MetricsSnapshot } from '../../infrastructure/persistence/drizzle/metrics.repository'
import type { InMemoryRateLimiter } from '../../infrastructure/security/rate-limiter'
import { buildErrorResponse } from './error-handler'
import { TooManyRequestsError } from './errors'
import { markOversizeBody, storeRawBody } from './raw-body'
import { adminRoutes } from './routes/admin.routes'
import { healthRoutes, type ReadinessProbe } from './routes/health.routes'
import { metricsRoutes } from './routes/metrics.routes'
import { myRoutes } from './routes/my.routes'
import { paymentsRoutes } from './routes/payments.routes'
import { subscriptionsRoutes } from './routes/subscriptions.routes'
import { webhooksRoutes } from './routes/webhooks.routes'

export interface HttpDeps {
  env: Env
  logger: Logger
  consumers: ConsumerRepository
  rateLimiter: InMemoryRateLimiter
  /** Teto global de backpressure das rotas de webhook da Efí (separado do limiter por consumidor). */
  webhookRateLimiter: InMemoryRateLimiter
  /** Probe de readiness (`/readyz`): banco alcançável + warm-up da Efí concluído. */
  readiness: ReadinessProbe
  processPayment: ProcessPaymentService
  getPayment: GetPaymentService
  createSubscription: CreateSubscriptionService
  getSubscription: GetSubscriptionService
  cancelSubscription: CancelSubscriptionService
  handleWebhook: HandleProviderWebhookService
  handleBoletoNotification: HandleBoletoNotificationService
  getMetrics: () => Promise<MetricsSnapshot>
  // Leitura admin (painel @sistemazero/admin) — RBAC no gateway + `requireAdmin` aqui.
  requireAdminEnabled: boolean
  /** Token interno do gateway (`x-internal-token`) — admin + minhas compras. */
  internalToken?: string
  listPayments: ListPaymentsService
  getAdminPayment: GetAdminPaymentService
  listSubscriptions: ListSubscriptionsService
  getAdminSubscription: GetAdminSubscriptionService
  getPaymentsStats: GetPaymentsStatsService
  getDailyPaymentsStats: GetDailyPaymentsStatsService
  getPaymentsOps: GetPaymentsOpsService
  refundPayment: RefundPaymentService
  // Self-service do comprador ("minhas compras", app community) — JWT no gateway.
  listMyPayments: ListMyPaymentsService
  getMyPayment: GetMyPaymentService
}

/** Rotas de infraestrutura fora do access log (healthcheck/polling = ruído). */
const ACCESS_LOG_SKIP = new Set(['/health', '/readyz', '/metrics'])

/**
 * Monta a aplicação Elysia: parser de corpo bruto (necessário para HMAC e
 * idempotência), access log com request-id, tratamento central de erros,
 * Swagger/OpenAPI e as rotas.
 */
export function createServer(deps: HttpDeps) {
  // Início da request p/ medir a latência no access log (chaveado pela própria
  // Request — GC-coletável, mesmo padrão do raw-body).
  const requestStart = new WeakMap<Request, number>()

  const app = new Elysia({
    // Teto de corpo no nível do Bun (rejeita no socket ANTES de bufferizar) —
    // defesa em profundidade junto da checagem por bytes do onParse (que cobre o
    // caso de Content-Length ausente/mentiroso no `app.handle` dos testes).
    serve: { maxRequestBodySize: deps.env.MAX_REQUEST_BODY_BYTES },
  })
    .onRequest(({ request }) => {
      requestStart.set(request, performance.now())
    })
    // Access log: UMA linha por request com o X-Request-Id do gateway — é o campo
    // que junta o `gateway.access` do gateway com os logs deste serviço num
    // incidente. Roda também em erro (onAfterResponse cobre o caminho do onError).
    .onAfterResponse({ as: 'global' }, ({ request, set }) => {
      const path = new URL(request.url).pathname
      if (ACCESS_LOG_SKIP.has(path)) return
      const start = requestStart.get(request)
      deps.logger.info('http.access', {
        requestId: request.headers.get('x-request-id') ?? undefined,
        method: request.method,
        path,
        status: typeof set.status === 'number' ? set.status : (set.status ?? 200),
        durationMs: start === undefined ? undefined : Math.round(performance.now() - start),
      })
    })
    // Captura o corpo bruto p/ HMAC/idempotência e MARCA corpos acima do teto
    // (anti-DoS). Não lança aqui: o Elysia não preserva erros tipados no onParse
    // (viram PARSE/400). A marca é consumida nas rotas via `enforceBodyLimit`.
    .onParse({ as: 'global' }, async ({ request, contentType }) => {
      const maxBytes = deps.env.MAX_REQUEST_BODY_BYTES
      const declared = Number(request.headers.get('content-length') ?? '0')
      if (Number.isFinite(declared) && declared > maxBytes) {
        markOversizeBody(request) // evita até bufferizar o corpo
        return undefined
      }
      if (contentType?.includes('application/json')) {
        const text = await request.text()
        // Rede de segurança caso o Content-Length minta/esteja ausente.
        if (Buffer.byteLength(text, 'utf8') > maxBytes) {
          markOversizeBody(request)
          return {}
        }
        storeRawBody(request, text)
        return text.length > 0 ? JSON.parse(text) : {}
      }
      return undefined
    })
    .onError({ as: 'global' }, ({ code, error, set }) => {
      if (error instanceof TooManyRequestsError && error.retryAfterSeconds) {
        set.headers['retry-after'] = String(error.retryAfterSeconds)
      }
      const { status, body } = buildErrorResponse({ code, error, logger: deps.logger })
      set.status = status
      return body
    })

  // Swagger/OpenAPI só FORA de produção: não expõe o mapa de rotas nem o esquema
  // de autenticação de um serviço de pagamentos a quem apenas alcança a porta HTTP.
  if (deps.env.NODE_ENV !== 'production') {
    app.use(
      swagger({
        path: '/swagger',
        documentation: {
          info: {
            title: 'Sistema Zero — Payments API',
            version: '0.1.0',
            description:
              'Serviço de pagamentos (Pix/boleto/cartão) via Efí. Requer X-Consumer-Id + X-Signature (HMAC) e IP autorizado.',
          },
        },
      }),
    )
  }

  return app
    .use(healthRoutes(deps.readiness))
    .use(metricsRoutes(deps.getMetrics, deps.env.METRICS_TOKEN))
    .use(
      webhooksRoutes({
        handleWebhook: deps.handleWebhook,
        handleBoletoNotification: deps.handleBoletoNotification,
        logger: deps.logger,
        webhookSecret: deps.env.EFI_WEBHOOK_SECRET,
        rateLimiter: deps.webhookRateLimiter,
      }),
    )
    .use(
      paymentsRoutes({
        auth: {
          consumers: deps.consumers,
          logger: deps.logger,
          trustProxy: deps.env.TRUST_PROXY,
          trustedProxyHops: deps.env.TRUSTED_PROXY_HOPS,
          hmacToleranceSeconds: deps.env.HMAC_TOLERANCE_SECONDS,
        },
        rateLimiter: deps.rateLimiter,
        processPayment: deps.processPayment,
        getPayment: deps.getPayment,
      }),
    )
    .use(
      subscriptionsRoutes({
        auth: {
          consumers: deps.consumers,
          logger: deps.logger,
          trustProxy: deps.env.TRUST_PROXY,
          trustedProxyHops: deps.env.TRUSTED_PROXY_HOPS,
          hmacToleranceSeconds: deps.env.HMAC_TOLERANCE_SECONDS,
        },
        rateLimiter: deps.rateLimiter,
        createSubscription: deps.createSubscription,
        getSubscription: deps.getSubscription,
        cancelSubscription: deps.cancelSubscription,
      }),
    )
    .use(
      myRoutes({
        listMyPayments: deps.listMyPayments,
        getMyPayment: deps.getMyPayment,
        internalToken: deps.internalToken,
      }),
    )
    .use(
      adminRoutes({
        requireAdminEnabled: deps.requireAdminEnabled,
        internalToken: deps.internalToken,
        listPayments: deps.listPayments,
        getPayment: deps.getAdminPayment,
        listSubscriptions: deps.listSubscriptions,
        getSubscription: deps.getAdminSubscription,
        getStats: deps.getPaymentsStats,
        getDailyStats: deps.getDailyPaymentsStats,
        getOps: deps.getPaymentsOps,
        refundPayment: deps.refundPayment,
        cancelSubscription: deps.cancelSubscription,
      }),
    )
}
