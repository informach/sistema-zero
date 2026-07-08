import { randomUUID } from 'node:crypto'
import { createLogger, type Logger } from '@sistemazero/core/logging'
import { ConnectionService } from './application/connection/connection.service'
import { KbService } from './application/kb/kb.service'
import { SettingsService } from './application/settings/settings.service'
import { TicketService } from './application/tickets/ticket.service'
import { type Env, gmailConfig } from './infrastructure/config/env'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { DrizzleConnectionRepository } from './infrastructure/persistence/drizzle/connection.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleKbRepository } from './infrastructure/persistence/drizzle/kb.repository'
import { DrizzleMessageRepository } from './infrastructure/persistence/drizzle/message.repository'
import { DrizzleSettingsRepository } from './infrastructure/persistence/drizzle/settings.repository'
import { DrizzleTicketRepository } from './infrastructure/persistence/drizzle/ticket.repository'
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

  // Grupo Google (F1): ausente = rotas de conexão/envio responderão 503.
  const gmail = gmailConfig(env)
  if (!gmail) {
    logger.warn('gmail.not_configured', {
      hint: 'GOOGLE_CLIENT_ID/SECRET, HELPDESK_TOKEN_ENC_KEY, OAUTH_PUBLIC_BASE_URL ou HELPDESK_APP_URL ausentes — conexão Gmail responderá 503',
    })
  }

  // Casos de uso
  const ticketService = new TicketService(ticketRepo, messageRepo, now)
  const kbService = new KbService(kbRepo, now, idGen)
  const settingsService = new SettingsService(settingsRepo, now)
  const connectionService = new ConnectionService(connectionRepo)

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
      // `::` = dual-stack — necessário p/ o private networking do Railway (IPv6).
      server.listen({ port: env.PORT, hostname: env.HOST })
      logger.info('http.listening', { port: env.PORT, host: env.HOST })
    },
    async stop() {
      if (cleanupTimer) clearInterval(cleanupTimer)
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
