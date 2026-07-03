import { randomUUID } from 'node:crypto'
import { createLogger, type Logger } from '@sistemazero/core/logging'
import { AccessResolutionService } from './application/access/access-resolution.service'
import { AttachmentService } from './application/attachments/attachment.service'
import {
  ChannelAdminService,
  SpaceAdminService,
} from './application/community-admin/community-admin.service'
import { ModerationService } from './application/moderation/moderation.service'
import { ReportService } from './application/moderation/report.service'
import { PurgeUserDataService } from './application/purge-user-data/purge-user-data.service'
import { ReactionService } from './application/reactions/reaction.service'
import { ReadCommunityService } from './application/read-community/read-community.service'
import { ReadStateService } from './application/read-state/read-state.service'
import { ShowcaseService } from './application/showcase/showcase.service'
import { ThreadService } from './application/threads/thread.service'
import { noopStudioArtifactGateway } from './domain/ports/studio-artifact-gateway.port'
import { MicroCache } from './infrastructure/cache/micro-cache'
import {
  accessCacheTtlMs,
  attachmentLimits,
  type Env,
  showcaseWallChannelSlug,
  showcaseWallSlugs,
} from './infrastructure/config/env'
import { createMembersHttpGateway } from './infrastructure/gateways/members-http.gateway'
import { createStudioArtifactHttpGateway } from './infrastructure/gateways/studio-artifact-http.gateway'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { DrizzleAttachmentRepository } from './infrastructure/persistence/drizzle/attachment.repository'
import { DrizzleCommunityAdminRepository } from './infrastructure/persistence/drizzle/community-admin.repository'
import { DrizzleCommunityReadRepository } from './infrastructure/persistence/drizzle/community-read.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleModerationRepository } from './infrastructure/persistence/drizzle/moderation.repository'
import { DrizzleProcessedWebhookRepository } from './infrastructure/persistence/drizzle/processed-webhook.repository'
import { DrizzleReactionRepository } from './infrastructure/persistence/drizzle/reaction.repository'
import { DrizzleReadStateRepository } from './infrastructure/persistence/drizzle/read-state.repository'
import { DrizzleThreadRepository } from './infrastructure/persistence/drizzle/thread.repository'
import { DrizzleUserDataPurgeRepository } from './infrastructure/persistence/drizzle/user-data-purge.repository'
import { createServer } from './interfaces/http/server'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Chave do advisory lock do ciclo de retenção. O espaço de advisory locks é GLOBAL
 * ao banco compartilhado do monorepo — precisa ser única entre os serviços
 * (members = 30792297..., payments = 8103081227979411315).
 */
const RETENTION_ADVISORY_LOCK_KEY = '51020304050607081'

/**
 * Raiz de composição (injeção de dependências). ÚNICO lugar que instancia adapters
 * concretos e os pluga nos ports. Cresce a cada fatia (spaces/channels/threads/...).
 */
export async function createApplication(env: Env): Promise<Application> {
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

  // Adapters
  const communityAdmin = new DrizzleCommunityAdminRepository(db)
  const communityRead = new DrizzleCommunityReadRepository(db)
  const threadRepo = new DrizzleThreadRepository(db)
  const reactionRepo = new DrizzleReactionRepository(db)
  const readStateRepo = new DrizzleReadStateRepository(db)
  const moderationRepo = new DrizzleModerationRepository(db)
  const attachmentRepo = new DrizzleAttachmentRepository(db)
  const processedWebhookRepo = new DrizzleProcessedWebhookRepository(db)
  const members = createMembersHttpGateway({
    baseUrl: env.MEMBERS_BASE_URL,
    timeoutMs: env.MEMBERS_REQUEST_TIMEOUT_MS,
    internalToken: env.MEMBERS_INTERNAL_TOKEN,
    // Assina o webhook `/members/webhooks/showcase` (nível do aluno) — o members o verifica.
    hmacSecret: env.GATEWAY_HMAC_SECRET,
    logger,
  })
  // Limpeza de R2 na moderação: ao APAGAR um post do Mural, avisa o BFF do kids a
  // apagar o snapshot jogável + a capa. Sem `KIDS_BFF_BASE_URL` (dev/local) → no-op.
  const studioArtifacts = env.KIDS_BFF_BASE_URL
    ? createStudioArtifactHttpGateway({
        baseUrl: env.KIDS_BFF_BASE_URL,
        hmacSecret: env.GATEWAY_HMAC_SECRET,
        timeoutMs: env.KIDS_BFF_REQUEST_TIMEOUT_MS,
        logger,
      })
    : noopStudioArtifactGateway
  const accessCache = new MicroCache<{
    granted: Set<string>
    hasMaster: boolean
    hasMasterKids: boolean
    communities: Set<string>
  }>(accessCacheTtlMs(env))
  const limits = attachmentLimits(env)

  // Casos de uso (admin da estrutura)
  const spaceAdmin = new SpaceAdminService(communityAdmin)
  const channelAdmin = new ChannelAdminService(communityAdmin)
  // Exclusão de usuário (painel): purga reações/leitura/mutes-bans.
  const purgeUserData = new PurgeUserDataService(new DrizzleUserDataPurgeRepository(db))

  // Casos de uso (leitura do aluno, com resolução de acesso)
  const accessResolution = new AccessResolutionService(members, accessCache)
  const readCommunity = new ReadCommunityService(
    communityRead,
    accessResolution,
    readStateRepo,
    threadRepo,
  )
  const threadService = new ThreadService(
    communityRead,
    accessResolution,
    threadRepo,
    reactionRepo,
    moderationRepo,
    attachmentRepo,
    limits,
    () => new Date(),
    () => randomUUID(),
  )
  const attachmentService = new AttachmentService(
    attachmentRepo,
    communityRead,
    accessResolution,
    threadRepo,
    limits,
    () => new Date(),
    () => randomUUID(),
  )
  const reactionService = new ReactionService(
    communityRead,
    accessResolution,
    threadRepo,
    reactionRepo,
    moderationRepo,
    () => new Date(),
  )
  const readStateService = new ReadStateService(
    communityRead,
    accessResolution,
    readStateRepo,
    () => new Date(),
  )
  const reportService = new ReportService(
    communityRead,
    accessResolution,
    threadRepo,
    moderationRepo,
    () => new Date(),
  )
  const showcaseService = new ShowcaseService(
    communityRead,
    threadRepo,
    members,
    () => new Date(),
    () => randomUUID(),
    showcaseWallSlugs(env),
    showcaseWallChannelSlug(env),
  )
  const moderationService = new ModerationService(
    threadRepo,
    moderationRepo,
    () => new Date(),
    studioArtifacts,
  )

  // Readiness (`/readyz`, healthcheck do Railway): só promove a réplica quando o
  // banco responde — sem isto o redeploy promove uma réplica que ainda não fala
  // com o Postgres e o gateway vê 5xx.
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
    spaces: {
      read: readCommunity,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    threads: {
      threads: threadService,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    attachments: {
      attachments: attachmentService,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    reactions: {
      reactions: reactionService,
      readState: readStateService,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    report: {
      report: reportService,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    showcase: {
      showcase: showcaseService,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    admin: {
      requireAdminEnabled: env.REQUIRE_ADMIN,
      internalToken: env.INTERNAL_API_TOKEN,
      spaces: spaceAdmin,
      channels: channelAdmin,
      purgeUserData,
    },
    moderation: {
      requireAdminEnabled: env.REQUIRE_ADMIN,
      internalToken: env.INTERNAL_API_TOKEN,
      moderation: moderationService,
    },
    webhooks: {
      access: accessResolution,
      processed: processedWebhookRepo,
      webhookSecret: env.GATEWAY_HMAC_SECRET,
      toleranceSeconds: env.HMAC_TOLERANCE_SECONDS,
    },
    // S2S direto members→hub (HMAC — report dos pais). NUNCA expor no gateway.
    internal: {
      showcase: showcaseService,
      webhookSecret: env.GATEWAY_HMAC_SECRET,
      toleranceSeconds: env.HMAC_TOLERANCE_SECONDS,
    },
  })

  let cleanupTimer: ReturnType<typeof setInterval> | null = null

  // Retenção do dedupe de webhooks (fora do hot path). Advisory xact-lock → só uma
  // réplica limpa por ciclo (solta sozinho no commit/crash).
  const runRetentionCycle = async () => {
    await connection.sql.begin(async (gate) => {
      const [row] = await gate`
        select pg_try_advisory_xact_lock(${RETENTION_ADVISORY_LOCK_KEY}::bigint) as locked
      `
      if (!row?.locked) return
      const cutoff = new Date(Date.now() - env.PROCESSED_WEBHOOKS_RETENTION_DAYS * 86_400_000)
      const deleted = await gate`
        delete from hub.processed_webhooks where processed_at < ${cutoff}
      `
      if (deleted.count > 0) logger.info('retention.pruned', { processedWebhooks: deleted.count })
      // Anexos órfãos (upload abandonado, nunca vinculado a tópico/comentário). O
      // objeto no R2 é do BFF (member-shell); aqui só limpamos o metadado.
      const orphanCutoff = new Date(Date.now() - env.ATTACHMENT_ORPHAN_RETENTION_HOURS * 3_600_000)
      const orphans = await gate`
        delete from hub.attachments
        where status = 'pending_upload' and created_at < ${orphanCutoff}
      `
      if (orphans.count > 0) logger.info('retention.pruned', { orphanAttachments: orphans.count })
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
      await server.stop()
      await connection.close()
      logger.info('app.stopped')
    },
  }
}
