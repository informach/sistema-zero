import { randomUUID } from 'node:crypto'
import { createLogger, type Logger } from '@sistemazero/core/logging'
import { ConnectionService } from './application/connection/connection.service'
import { GmailAccountService } from './application/connection/gmail-account.service'
import { OAuthService } from './application/connection/oauth.service'
import { KbService } from './application/kb/kb.service'
import { SettingsService } from './application/settings/settings.service'
import { IngestService } from './application/tickets/ingest.service'
import { ReplyService } from './application/tickets/reply.service'
import { TicketService } from './application/tickets/ticket.service'
import { aiConfig, type Env, gmailConfig } from './infrastructure/config/env'
import { GoogleGmailClient } from './infrastructure/gateways/google/gmail-client'
import { GmailOAuthProvider } from './infrastructure/gateways/google/gmail-oauth-provider'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { DrizzleConnectionRepository } from './infrastructure/persistence/drizzle/connection.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleKbRepository } from './infrastructure/persistence/drizzle/kb.repository'
import { DrizzleMessageRepository } from './infrastructure/persistence/drizzle/message.repository'
import { DrizzleOAuthStateRepository } from './infrastructure/persistence/drizzle/oauth-state.repository'
import { DrizzleSettingsRepository } from './infrastructure/persistence/drizzle/settings.repository'
import { DrizzleTicketRepository } from './infrastructure/persistence/drizzle/ticket.repository'
import { createSecretBox } from './infrastructure/security/secret-box'
import { GmailSyncWorker } from './infrastructure/workers/gmail-sync-worker'
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
  const ticketRepo = new DrizzleTicketRepository(db)
  const messageRepo = new DrizzleMessageRepository(db)
  const kbRepo = new DrizzleKbRepository(db)
  const settingsRepo = new DrizzleSettingsRepository(db)
  const connectionRepo = new DrizzleConnectionRepository(connection)
  const oauthStateRepo = new DrizzleOAuthStateRepository(db)

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

  // Casos de uso
  const ticketService = new TicketService(ticketRepo, messageRepo, now, idGen)
  const kbService = new KbService(kbRepo, now, idGen)
  const settingsService = new SettingsService(settingsRepo, now)
  const revokeDeps = provider && secretBox ? { provider, secretBox } : null
  const connectionService = new ConnectionService(connectionRepo, revokeDeps, now, logger)
  const oauthService = new OAuthService(
    oauthStateRepo,
    connectionRepo,
    gmail && secretBox
      ? { secretBox, redirectBaseUrl: gmail.redirectBaseUrl, appUrl: gmail.appUrl }
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
    ticketRepo,
    messageRepo,
    { aiEnabled: ai !== null },
    now,
    idGen,
    logger,
  )
  const replyService = new ReplyService(
    ticketRepo,
    messageRepo,
    connectionRepo,
    settingsRepo,
    gmailAccountService,
    gmailClient,
    { fromName: env.HELPDESK_FROM_NAME },
    now,
    idGen,
    logger,
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
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
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

  // Retenção (fora do hot path): estados OAuth vencidos.
  // Advisory xact-lock → só uma réplica limpa por ciclo (solta no commit/crash).
  const runRetentionCycle = async () => {
    await connection.sql.begin(async (gate) => {
      const [row] = await gate`
        select pg_try_advisory_xact_lock(${RETENTION_ADVISORY_LOCK_KEY}::bigint) as locked
      `
      if (!row?.locked) return
      // ⚠️ ISO STRING (não `Date`) como parâmetro: no runtime Bun+postgres.js do
      // container de prod, bindar `Date` estoura (gotcha documentado do monorepo).
      const staleStates = await gate`
        delete from helpdesk.oauth_states where expires_at < ${new Date().toISOString()}
      `
      if (staleStates.count > 0) {
        logger.info('retention.pruned', { oauthStates: staleStates.count })
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
      // `::` = dual-stack — necessário p/ o private networking do Railway (IPv6).
      server.listen({ port: env.PORT, hostname: env.HOST })
      logger.info('http.listening', { port: env.PORT, host: env.HOST })
    },
    async stop() {
      if (cleanupTimer) clearInterval(cleanupTimer)
      // Worker para ANTES do pool fechar (senão um tick em voo estoura no banco).
      await gmailSyncWorker?.stop()
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
