import { randomUUID } from 'node:crypto'
import { createLogger, type Logger } from '@sistemazero/core/logging'
import { TicketAiService } from './application/ai/ticket-ai.service'
import { ConnectionService } from './application/connection/connection.service'
import { GmailAccountService } from './application/connection/gmail-account.service'
import { OAuthService } from './application/connection/oauth.service'
import { KbService } from './application/kb/kb.service'
import { SettingsService } from './application/settings/settings.service'
import { CustomerTicketService } from './application/tickets/customer-ticket.service'
import { IngestService } from './application/tickets/ingest.service'
import { ReplyService } from './application/tickets/reply.service'
import { TicketService } from './application/tickets/ticket.service'
import {
  aiConfig,
  type Env,
  gmailConfig,
  portalNotifyConfig,
  portalUrls,
} from './infrastructure/config/env'
import { GoogleGmailClient } from './infrastructure/gateways/google/gmail-client'
import { GmailOAuthProvider } from './infrastructure/gateways/google/gmail-oauth-provider'
import { createGatewayMessagingClient } from './infrastructure/gateways/messaging/gateway-messaging-client'
import { OpenRouterClient } from './infrastructure/gateways/openrouter/openrouter-client'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { DrizzleConnectionRepository } from './infrastructure/persistence/drizzle/connection.repository'
import { DrizzleCustomerTicketRepository } from './infrastructure/persistence/drizzle/customer-ticket.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleKbRepository } from './infrastructure/persistence/drizzle/kb.repository'
import { DrizzleMessageRepository } from './infrastructure/persistence/drizzle/message.repository'
import { DrizzleOAuthStateRepository } from './infrastructure/persistence/drizzle/oauth-state.repository'
import { DrizzlePortalNotificationOutboxRepository } from './infrastructure/persistence/drizzle/portal-notification-outbox.repository'
import { DrizzleReplyDeliveryRepository } from './infrastructure/persistence/drizzle/reply-delivery.repository'
import { DrizzleSettingsRepository } from './infrastructure/persistence/drizzle/settings.repository'
import { DrizzleTicketRepository } from './infrastructure/persistence/drizzle/ticket.repository'
import { DrizzleTicketIngestionRepository } from './infrastructure/persistence/drizzle/ticket-ingestion.repository'
import { createSecretBox } from './infrastructure/security/secret-box'
import { AiWorker } from './infrastructure/workers/ai-worker'
import { GmailSyncWorker } from './infrastructure/workers/gmail-sync-worker'
import { PortalNotificationWorker } from './infrastructure/workers/portal-notification-worker'
import { createServer } from './interfaces/http/server'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Chave do advisory lock do ciclo de retenção. O espaço de advisory locks é
 * GLOBAL ao banco compartilhado do monorepo — precisa ser única entre serviços
 * (members=30792297…, payments=8103081227979411315, messaging=120342423629415,
 * hub=51020304050607081, marketing=61120324050607091/92).
 */
const RETENTION_ADVISORY_LOCK_KEY = '71130324050607093'

/**
 * Raiz de composição (injeção de dependências). ÚNICO lugar que instancia
 * adapters concretos e os pluga nos ports. Cresce por fase (F1: OAuth Gmail +
 * gmail-sync-worker; F3: llm-client + ai-worker).
 */
export function createApplication(env: Env): Application {
  const logger = withSentryMirror(
    createLogger({
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      pretty: env.NODE_ENV !== 'production',
    }),
  )

  const connection: DbConnection = createDbConnection(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
    ssl: env.DATABASE_SSL,
  })
  const db = connection.db
  const now = () => new Date()
  const idGen = () => randomUUID()

  // Adapters
  const ticketRepo = new DrizzleTicketRepository(connection)
  const customerTicketRepo = new DrizzleCustomerTicketRepository(db)
  const messageRepo = new DrizzleMessageRepository(db)
  const replyDeliveryRepo = new DrizzleReplyDeliveryRepository(db)
  const ticketIngestionRepo = new DrizzleTicketIngestionRepository(db)
  const kbRepo = new DrizzleKbRepository(db)
  const settingsRepo = new DrizzleSettingsRepository(db)
  const connectionRepo = new DrizzleConnectionRepository(connection)
  const oauthStateRepo = new DrizzleOAuthStateRepository(db)
  const portalNotificationOutboxRepo = new DrizzlePortalNotificationOutboxRepository(db)

  // Grupo Google (F1): ausente = rotas de conexão/OAuth respondem 503, boot ok.
  const gmail = gmailConfig(env)
  const secretBox = gmail ? createSecretBox(gmail.encKeyBase64) : null
  const provider = gmail
    ? new GmailOAuthProvider({ clientId: gmail.clientId, clientSecret: gmail.clientSecret })
    : null
  const gmailClient = new GoogleGmailClient()
  if (!gmail) {
    logger.warn('gmail.not_configured', {
      hint: 'GOOGLE_CLIENT_ID/SECRET, HELPDESK_TOKEN_ENC_KEY, OAUTH_PUBLIC_BASE_URL ou HELPDESK_APP_URL ausentes — conexão Gmail responderá 503',
    })
  }

  // Grupo IA (fail-soft): ausente = ingest marca `skipped`, tudo mais funciona.
  const ai = aiConfig(env)
  if (!ai) {
    logger.warn('ai.not_configured', {
      hint: 'OPENROUTER_API_KEY/OPENROUTER_HELPDESK_MODEL ausentes — tickets seguem sem IA (ai_status=skipped)',
    })
  }

  // A resposta e o aviso entram na mesma transação. Sem transporte configurado
  // em dev, os jobs ficam pendentes; em produção o grupo é obrigatório no boot.
  const notify = portalNotifyConfig(env)
  if (!notify) {
    logger.warn('messaging.not_configured', {
      hint: 'GATEWAY_URL/HELPDESK_HMAC_SECRET ausentes — jobs de aviso ficarão pendentes até o worker ser configurado',
    })
  }
  const messaging = notify
    ? createGatewayMessagingClient({
        gatewayUrl: notify.gatewayUrl,
        hmacSecret: notify.hmacSecret,
        timeoutMs: notify.timeoutMs,
      })
    : null

  // Casos de uso
  const ticketService = new TicketService(ticketRepo, messageRepo, now, idGen)
  const customerTicketService = new CustomerTicketService(
    customerTicketRepo,
    messageRepo,
    { aiEnabled: ai !== null },
    now,
    idGen,
  )
  const kbService = new KbService(kbRepo, now, idGen)
  const settingsService = new SettingsService(settingsRepo, now)
  const revokeDeps = provider && secretBox ? { provider, secretBox } : null
  const connectionService = new ConnectionService(connectionRepo, revokeDeps, now, logger)
  const oauthService = new OAuthService(
    oauthStateRepo,
    connectionRepo,
    gmail && secretBox
      ? {
          secretBox,
          redirectBaseUrl: gmail.redirectBaseUrl,
          appUrl: gmail.appUrl,
          mailboxAddress: gmail.mailboxAddress,
        }
      : null,
    provider,
    gmailClient,
    { stateTtlMinutes: env.OAUTH_STATE_TTL_MINUTES },
    now,
    idGen,
    logger,
  )
  const gmailAccountService = new GmailAccountService(
    connectionRepo,
    provider && secretBox ? { provider, secretBox } : null,
    now,
    logger,
  )
  const ingestService = new IngestService(
    ticketIngestionRepo,
    { aiEnabled: ai !== null },
    now,
    idGen,
  )
  const replyService = new ReplyService(
    ticketRepo,
    messageRepo,
    replyDeliveryRepo,
    connectionRepo,
    settingsRepo,
    gmailAccountService,
    gmailClient,
    { fromName: env.HELPDESK_FROM_NAME },
    portalUrls(env),
    now,
    idGen,
    logger,
  )
  // IA (F3): cliente OpenRouter só quando o grupo IA está configurado (senão as
  // rotas summarize/regenerate respondem 503; o worker nem monta). KB entra na F4.
  const llmClient = ai
    ? new OpenRouterClient({
        apiKey: ai.apiKey,
        model: ai.model,
        referer: ai.referer,
        maxTokens: 1500,
        timeoutMs: env.AI_TIMEOUT_MS,
      })
    : null
  const ticketAiService = new TicketAiService(
    llmClient,
    ticketRepo,
    messageRepo,
    async () =>
      (await kbRepo.listPublished(env.AI_KB_MAX_CANDIDATES)).map((article) => ({
        title: article.title,
        content: article.content,
      })),
    {
      maxThreadChars: env.AI_MAX_THREAD_CHARS,
      maxKbChars: env.AI_MAX_KB_CHARS,
      onKbContextSelected: (stats) => logger.debug('ai.kb_context_selected', stats),
    },
    now,
  )

  // Worker de sincronização do Gmail (só monta com o grupo Google configurado).
  const gmailSyncWorker =
    gmail && secretBox
      ? new GmailSyncWorker({
          connections: connectionRepo,
          gmailAccount: gmailAccountService,
          gmail: gmailClient,
          ingest: ingestService,
          now,
          logger,
          config: {
            intervalMs: env.GMAIL_POLL_INTERVAL_MS,
            pollIntervalMs: env.GMAIL_POLL_INTERVAL_MS,
            leaseMs: env.GMAIL_SYNC_LEASE_MS,
            maxAttempts: env.GMAIL_SYNC_MAX_ATTEMPTS,
            backfillQuery: env.GMAIL_BACKFILL_QUERY,
            fetchBatchSize: env.GMAIL_FETCH_BATCH_SIZE,
            tokenRefreshMarginMs: env.TOKEN_REFRESH_MARGIN_MS,
          },
        })
      : null

  // Worker da IA (só monta com o grupo IA configurado). Consome os tickets que o
  // ingest marcou `ai_status='pending'`.
  const aiWorker = llmClient
    ? new AiWorker({
        tickets: ticketRepo,
        ticketAi: ticketAiService,
        now,
        logger,
        config: {
          intervalMs: env.AI_WORKER_INTERVAL_MS,
          leaseMs: Math.max(env.AI_TIMEOUT_MS * 3, 120_000),
          maxAttempts: env.AI_MAX_ATTEMPTS,
        },
      })
    : null

  const portalNotificationWorker = messaging
    ? new PortalNotificationWorker({
        outbox: portalNotificationOutboxRepo,
        messaging,
        now,
        logger,
        config: {
          intervalMs: env.PORTAL_NOTIFICATION_WORKER_INTERVAL_MS,
          leaseMs: Math.max(env.PORTAL_NOTIFICATION_LEASE_MS, env.S2S_TIMEOUT_MS * 3),
          retryBaseMs: env.PORTAL_NOTIFICATION_RETRY_BASE_MS,
          retryMaxMs: env.PORTAL_NOTIFICATION_RETRY_MAX_MS,
        },
      })
    : null

  // Readiness (`/readyz`, healthcheck do Railway): banco respondendo.
  const readiness = async () => {
    const checks: Record<string, string> = { db: 'ok' }
    try {
      await connection.sql`select 1`
    } catch {
      checks.db = 'error'
    }
    return { ready: checks.db === 'ok', checks }
  }

  const server = createServer({
    env,
    logger,
    readiness,
    tickets: {
      tickets: ticketService,
      reply: replyService,
      ai: ticketAiService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    customerTickets: {
      tickets: customerTicketService,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    kb: {
      kb: kbService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    settings: {
      settings: settingsService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    connection: {
      connection: connectionService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    oauth: {
      oauth: oauthService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
  })

  let cleanupTimer: ReturnType<typeof setInterval> | null = null

  // Retenção (fora do hot path): estados OAuth vencidos e outbox já entregue.
  // Advisory xact-lock → só uma réplica limpa por ciclo (solta no commit/crash).
  const runRetentionCycle = async () => {
    await connection.sql.begin(async (gate) => {
      const [row] = await gate`
        select pg_try_advisory_xact_lock(${RETENTION_ADVISORY_LOCK_KEY}::bigint) as locked
      `
      if (!row?.locked) return
      // ⚠️ ISO STRING (não `Date`) como parâmetro: no runtime Bun+postgres.js do
      // container de prod, bindar `Date` estoura (gotcha documentado do monorepo).
      const retentionNow = now()
      const staleStates = await gate`
        delete from helpdesk.oauth_states where expires_at < ${retentionNow.toISOString()}
      `
      const sentOutboxBefore = new Date(
        retentionNow.getTime() - env.RETENTION_SENT_OUTBOX_DAYS * 24 * 60 * 60_000,
      ).toISOString()
      const sentNotifications = await gate`
        delete from helpdesk.portal_notification_outbox
        where status = 'sent' and sent_at < ${sentOutboxBefore}
      `
      if (staleStates.count > 0 || sentNotifications.count > 0) {
        logger.info('retention.pruned', {
          oauthStates: staleStates.count,
          sentPortalNotifications: sentNotifications.count,
        })
      }
    })
  }

  return {
    logger,
    async start() {
      cleanupTimer = setInterval(() => {
        void runRetentionCycle().catch((error) =>
          logger.error('retention.cleanup.failed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      }, env.RETENTION_CLEANUP_INTERVAL_MS)
      gmailSyncWorker?.start()
      aiWorker?.start()
      portalNotificationWorker?.start()
      // `::` = dual-stack — necessário p/ o private networking do Railway (IPv6).
      server.listen({ port: env.PORT, hostname: env.HOST })
      logger.info('http.listening', { port: env.PORT, host: env.HOST })
    },
    async stop() {
      if (cleanupTimer) clearInterval(cleanupTimer)
      // Workers param ANTES do pool fechar (senão um tick em voo estoura no banco).
      await Promise.all([
        gmailSyncWorker?.stop(),
        aiWorker?.stop(),
        portalNotificationWorker?.stop(),
      ])
      try {
        await server.stop()
      } catch {
        // server pode nunca ter feito listen (caminho de testes via app.handle)
      }
      await connection.close()
      logger.info('app.stopped')
    },
  }
}
