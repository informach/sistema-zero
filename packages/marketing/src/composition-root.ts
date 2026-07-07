import { randomUUID } from 'node:crypto'
import { createLogger, type Logger } from '@sistemazero/core/logging'
import { ContentService } from './application/contents/content.service'
import { IdeaService } from './application/ideas/idea.service'
import { PromoteIdeaService } from './application/ideas/promote-idea.service'
import { MediaService } from './application/media/media.service'
import { PublicationService } from './application/publications/publication.service'
import { MediaNotConfiguredError } from './domain/marketing-errors'
import type { MediaStore } from './domain/ports/media-store.port'
import { type Env, r2Config } from './infrastructure/config/env'
import { R2MediaStore } from './infrastructure/gateways/r2/r2-media-store'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { DrizzleChecklistRepository } from './infrastructure/persistence/drizzle/checklist.repository'
import { DrizzleCommentRepository } from './infrastructure/persistence/drizzle/comment.repository'
import { DrizzleContentRepository } from './infrastructure/persistence/drizzle/content.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleIdeaRepository } from './infrastructure/persistence/drizzle/idea.repository'
import { DrizzleMediaAssetRepository } from './infrastructure/persistence/drizzle/media-asset.repository'
import { DrizzlePublicationRepository } from './infrastructure/persistence/drizzle/publication.repository'
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
 * hub=51020304050607081).
 */
const RETENTION_ADVISORY_LOCK_KEY = '61120324050607091'

/** MediaStore quando o R2 não está configurado: toda chamada vira 503 amigável. */
const notConfiguredMediaStore: MediaStore = {
  presignPut: () => Promise.reject(new MediaNotConfiguredError()),
  presignGet: () => Promise.reject(new MediaNotConfiguredError()),
  head: () => Promise.reject(new MediaNotConfiguredError()),
  delete: () => Promise.reject(new MediaNotConfiguredError()),
}

/**
 * Raiz de composição (injeção de dependências). ÚNICO lugar que instancia
 * adapters concretos e os pluga nos ports. Cresce a cada fase (workers de
 * publicação/token/métricas/transferência entram nas próximas).
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
  const ideaRepo = new DrizzleIdeaRepository(db)
  const contentRepo = new DrizzleContentRepository(db)
  const checklistRepo = new DrizzleChecklistRepository(db)
  const commentRepo = new DrizzleCommentRepository(db)
  const assetRepo = new DrizzleMediaAssetRepository(db)
  const publicationRepo = new DrizzlePublicationRepository(db)
  const r2 = r2Config(env)
  const mediaStore: MediaStore = r2 ? new R2MediaStore(r2) : notConfiguredMediaStore
  if (!r2) logger.warn('media.not_configured', { hint: 'R2_* ausentes — presign responderá 503' })

  // Casos de uso
  const ideaService = new IdeaService(ideaRepo, now, idGen)
  const contentService = new ContentService(
    contentRepo,
    checklistRepo,
    commentRepo,
    publicationRepo,
    now,
    idGen,
  )
  const promoteService = new PromoteIdeaService(ideaService, contentService)
  const publicationService = new PublicationService(publicationRepo, contentService, now, idGen)
  const mediaService = new MediaService(
    assetRepo,
    contentRepo,
    mediaStore,
    {
      maxUploadBytes: env.MARKETING_MAX_UPLOAD_BYTES,
      presignPutTtlSeconds: env.R2_PRESIGN_PUT_TTL_SECONDS,
      presignGetTtlSeconds: env.R2_PRESIGN_GET_TTL_SECONDS,
    },
    now,
    idGen,
  )

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
    ideas: {
      ideas: ideaService,
      promote: promoteService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    contents: {
      contents: contentService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    publications: {
      publications: publicationService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    media: {
      media: mediaService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
  })

  let cleanupTimer: ReturnType<typeof setInterval> | null = null

  // Retenção (fora do hot path): estados OAuth vencidos + snapshots antigos.
  // Advisory xact-lock → só uma réplica limpa por ciclo (solta no commit/crash).
  const runRetentionCycle = async () => {
    await connection.sql.begin(async (gate) => {
      const [row] = await gate`
        select pg_try_advisory_xact_lock(${RETENTION_ADVISORY_LOCK_KEY}::bigint) as locked
      `
      if (!row?.locked) return
      // ⚠️ ISO STRING (não `Date`) como parâmetro: no runtime Bun+postgres.js do
      // container de prod, bindar `Date` estoura (gotcha documentado do monorepo).
      const nowMs = Date.now()
      const staleStates = await gate`
        delete from marketing.oauth_states where expires_at < ${new Date(nowMs).toISOString()}
      `
      const metricsCutoff = new Date(nowMs - env.METRICS_RETENTION_DAYS * 86_400_000).toISOString()
      const oldPubSnapshots = await gate`
        delete from marketing.metric_publication_snapshots where captured_at < ${metricsCutoff}
      `
      const oldAccSnapshots = await gate`
        delete from marketing.metric_account_snapshots where captured_at < ${metricsCutoff}
      `
      const eventsCutoff = new Date(
        nowMs - env.STAGE_EVENTS_RETENTION_DAYS * 86_400_000,
      ).toISOString()
      const oldEvents = await gate`
        delete from marketing.content_stage_events where created_at < ${eventsCutoff}
      `
      const total =
        staleStates.count + oldPubSnapshots.count + oldAccSnapshots.count + oldEvents.count
      if (total > 0) {
        logger.info('retention.pruned', {
          oauthStates: staleStates.count,
          pubSnapshots: oldPubSnapshots.count,
          accountSnapshots: oldAccSnapshots.count,
          stageEvents: oldEvents.count,
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
