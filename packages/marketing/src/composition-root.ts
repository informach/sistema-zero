import { randomUUID } from 'node:crypto'
import { createLogger, type Logger } from '@sistemazero/core/logging'
import { AccountService } from './application/accounts/account.service'
import { OAuthService } from './application/accounts/oauth.service'
import { AiCopyService } from './application/ai/ai-copy.service'
import { ContentService } from './application/contents/content.service'
import { IdeaService } from './application/ideas/idea.service'
import { PromoteIdeaService } from './application/ideas/promote-idea.service'
import { DriveImportService } from './application/media/drive.service'
import { MediaService } from './application/media/media.service'
import { MetricsService } from './application/metrics/metrics.service'
import { LinkExternalService } from './application/publications/link-external.service'
import { PublicationService } from './application/publications/publication.service'
import { YtQuotaGuard } from './application/publications/yt-quota-guard'
import { MediaNotConfiguredError } from './domain/marketing-errors'
import type { ExternalPostResolver } from './domain/ports/external-post-resolver.port'
import type { MediaStore } from './domain/ports/media-store.port'
import type { MetricsSource } from './domain/ports/metrics-source.port'
import type { OAuthProvider } from './domain/ports/oauth-provider.port'
import type { SocialPublisher } from './domain/ports/social-publisher.port'
import type { Network } from './domain/publication/publication'
import {
  aiCopyConfig,
  type Env,
  googleConfig,
  metaConfig,
  oauthCoreConfig,
  r2Config,
  reminderConfig,
  tiktokConfig,
} from './infrastructure/config/env'
import { OpenRouterCopyClient } from './infrastructure/gateways/ai/openrouter-copy-client'
import { GoogleDriveClient } from './infrastructure/gateways/google/google-drive-client'
import { GoogleOAuthProvider } from './infrastructure/gateways/google/google-oauth-provider'
import { GatewayMessagingClient } from './infrastructure/gateways/messaging/gateway-messaging-client'
import { MetaClient } from './infrastructure/gateways/meta/meta-client'
import { MetaExternalResolver } from './infrastructure/gateways/meta/meta-external-resolver'
import { MetaMetricsSource } from './infrastructure/gateways/meta/meta-metrics-source'
import { MetaOAuthProvider } from './infrastructure/gateways/meta/meta-oauth-provider'
import { MetaPublisher } from './infrastructure/gateways/meta/meta-publisher'
import { R2MediaStore } from './infrastructure/gateways/r2/r2-media-store'
import { TikTokClient } from './infrastructure/gateways/tiktok/tiktok-client'
import { TikTokMetricsSource } from './infrastructure/gateways/tiktok/tiktok-metrics-source'
import { TikTokOAuthProvider } from './infrastructure/gateways/tiktok/tiktok-oauth-provider'
import { TikTokPublisher } from './infrastructure/gateways/tiktok/tiktok-publisher'
import { YoutubeClient } from './infrastructure/gateways/youtube/youtube-client'
import { YoutubeExternalResolver } from './infrastructure/gateways/youtube/youtube-external-resolver'
import { YoutubeMetricsSource } from './infrastructure/gateways/youtube/youtube-metrics-source'
import { YoutubePublisher } from './infrastructure/gateways/youtube/youtube-publisher'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { DrizzleChecklistRepository } from './infrastructure/persistence/drizzle/checklist.repository'
import { DrizzleCommentRepository } from './infrastructure/persistence/drizzle/comment.repository'
import { DrizzleContentRepository } from './infrastructure/persistence/drizzle/content.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleIdeaRepository } from './infrastructure/persistence/drizzle/idea.repository'
import { DrizzleMediaAssetRepository } from './infrastructure/persistence/drizzle/media-asset.repository'
import { DrizzleMetricsRepository } from './infrastructure/persistence/drizzle/metrics.repository'
import { DrizzleOAuthStateRepository } from './infrastructure/persistence/drizzle/oauth-state.repository'
import { DrizzlePublicationRepository } from './infrastructure/persistence/drizzle/publication.repository'
import { DrizzlePublicationAssetRepository } from './infrastructure/persistence/drizzle/publication-asset.repository'
import { DrizzleQuotaUsageRepository } from './infrastructure/persistence/drizzle/quota-usage.repository'
import { DrizzleSocialAccountRepository } from './infrastructure/persistence/drizzle/social-account.repository'
import { createSecretBox } from './infrastructure/security/secret-box'
import { MediaArchiverWorker } from './infrastructure/workers/media-archiver-worker'
import { MediaTransferWorker } from './infrastructure/workers/media-transfer-worker'
import { MetricsWorker } from './infrastructure/workers/metrics-worker'
import { PublisherWorker } from './infrastructure/workers/publisher-worker'
import { TokenRefreshWorker } from './infrastructure/workers/token-refresh-worker'
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
/** Lock do ciclo de métricas do YouTube (mesma família, chave própria). */
const METRICS_ADVISORY_LOCK_KEY = '61120324050607092'

/** MediaStore quando o R2 não está configurado: toda chamada vira 503 amigável. */
const notConfiguredMediaStore: MediaStore = {
  presignPut: () => Promise.reject(new MediaNotConfiguredError()),
  presignGet: () => Promise.reject(new MediaNotConfiguredError()),
  head: () => Promise.reject(new MediaNotConfiguredError()),
  delete: () => Promise.reject(new MediaNotConfiguredError()),
  put: () => Promise.reject(new MediaNotConfiguredError()),
  getRange: () => Promise.reject(new MediaNotConfiguredError()),
  getStream: () => Promise.reject(new MediaNotConfiguredError()),
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
  const publicationAssetRepo = new DrizzlePublicationAssetRepository(db)
  const accountRepo = new DrizzleSocialAccountRepository(db)
  const oauthStateRepo = new DrizzleOAuthStateRepository(db)
  const r2 = r2Config(env)
  const mediaStore: MediaStore = r2
    ? new R2MediaStore({ ...r2, transferTimeoutMs: env.MEDIA_TRANSFER_TIMEOUT_MS })
    : notConfiguredMediaStore
  if (!r2) logger.warn('media.not_configured', { hint: 'R2_* ausentes — presign responderá 503' })

  // OAuth (núcleo comum + provedores por rede) — grupos atômicos independentes:
  // incompleto = rotas 503, boot ok.
  const oauthCore = oauthCoreConfig(env)
  const secretBox = oauthCore ? createSecretBox(oauthCore.encKeyBase64) : null
  const oauthProviders = new Map<Network, OAuthProvider>()
  const googleCfg = googleConfig(env)
  if (oauthCore && googleCfg) {
    oauthProviders.set('youtube', new GoogleOAuthProvider(googleCfg))
  }
  const googleEnabled = Boolean(oauthCore && googleCfg)
  const driveClient = googleEnabled ? new GoogleDriveClient() : null
  // Meta: o MESMO provider serve facebook (Páginas) e instagram (IG business).
  const metaCfg = metaConfig(env)
  if (oauthCore && metaCfg) {
    const metaProvider = new MetaOAuthProvider(metaCfg)
    oauthProviders.set('facebook', metaProvider)
    oauthProviders.set('instagram', metaProvider)
  }
  // TikTok (F4): conta única do criador (open_id).
  const tiktokCfg = tiktokConfig(env)
  if (oauthCore && tiktokCfg) {
    oauthProviders.set('tiktok', new TikTokOAuthProvider(tiktokCfg))
  }
  if (!oauthCore) {
    logger.warn('oauth.not_configured', {
      hint: 'MARKETING_TOKEN_ENC_KEY/OAUTH_PUBLIC_BASE_URL/MARKETING_APP_URL ausentes — OAuth/Drive responderão 503',
    })
  } else {
    if (!googleCfg) {
      logger.warn('oauth.google_not_configured', {
        hint: 'GOOGLE_CLIENT_ID/SECRET ausentes — YouTube/Drive responderão 503',
      })
    }
    if (!metaCfg) {
      logger.warn('oauth.meta_not_configured', {
        hint: 'META_APP_ID/SECRET ausentes — Instagram/Facebook seguem em modo lembrete',
      })
    }
    if (!tiktokCfg) {
      logger.warn('oauth.tiktok_not_configured', {
        hint: 'TIKTOK_CLIENT_KEY/SECRET ausentes — TikTok segue em modo lembrete',
      })
    }
  }

  // Lembrete WhatsApp (consumer HMAC do messaging via gateway).
  const reminder = reminderConfig(env)
  const reminderNotifier = reminder
    ? new GatewayMessagingClient({
        gatewayUrl: reminder.gatewayUrl,
        consumerId: reminder.consumerId,
        hmacSecret: reminder.hmacSecret,
        templateKey: reminder.templateKey,
      })
    : null
  if (!reminder) {
    logger.warn('reminder.not_configured', {
      hint: 'MARKETING_HMAC_SECRET ausente — lembrete de publicação manual desligado (o Painel é o fallback)',
    })
  }

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
  // Publishers automáticos: cada rede só monta com o OAuth do provedor E o R2
  // (a mídia sai de lá) configurados — ausente = rede segue em modo lembrete.
  const youtubeEnabled = Boolean(googleEnabled && r2)
  const metaPublishEnabled = Boolean(oauthCore && metaCfg && r2)
  const tiktokPublishEnabled = Boolean(oauthCore && tiktokCfg && r2)
  const autoCapableNetworks: ReadonlySet<Network> = new Set<Network>([
    ...(youtubeEnabled ? (['youtube'] as const) : []),
    ...(metaPublishEnabled ? (['instagram', 'facebook'] as const) : []),
    ...(tiktokPublishEnabled ? (['tiktok'] as const) : []),
  ])
  const publicationService = new PublicationService(
    publicationRepo,
    contentService,
    now,
    idGen,
    { links: publicationAssetRepo, media: assetRepo },
    autoCapableNetworks.size > 0
      ? { accounts: accountRepo, capableNetworks: autoCapableNetworks }
      : null,
  )
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
  const accountService = new AccountService(
    accountRepo,
    secretBox && oauthProviders.size > 0 ? { providers: oauthProviders, secretBox } : null,
    autoCapableNetworks,
    now,
    logger,
  )
  const oauthService = new OAuthService(
    oauthStateRepo,
    accountRepo,
    oauthCore && secretBox
      ? { secretBox, redirectBaseUrl: oauthCore.redirectBaseUrl, appUrl: oauthCore.appUrl }
      : null,
    oauthProviders,
    { stateTtlMinutes: env.OAUTH_STATE_TTL_MINUTES },
    now,
    idGen,
    logger,
  )
  const driveService = new DriveImportService(
    driveClient,
    accountService,
    assetRepo,
    contentRepo,
    { maxUploadBytes: env.MARKETING_MAX_UPLOAD_BYTES },
    now,
    idGen,
  )
  const metricsRepo = new DrizzleMetricsRepository(db)
  const metricsService = new MetricsService(accountRepo, publicationRepo, metricsRepo, now)

  // IA da copy (F5): sem chave, o client responde isConfigured=false e o
  // serviço devolve 503 — os botões somem no front (nunca quebra o boot).
  const aiCfg = aiCopyConfig(env)
  if (!aiCfg) {
    logger.warn('ai.not_configured', {
      hint: 'OPENROUTER_API_KEY ausente — a IA da copy fica desligada (o linter passivo segue)',
    })
  }
  const aiCopyClient = new OpenRouterCopyClient(
    aiCfg ?? { apiKey: '', model: '', referer: null, maxTokens: 1, timeoutMs: 1 },
  )
  const aiCopyService = new AiCopyService(aiCopyClient, contentService, env.AI_COPY_MAX_INPUT_CHARS)

  // Publisher automático (F2): YouTube com quota guard (reset à meia-noite PT).
  const quotaGuard = new YtQuotaGuard(
    new DrizzleQuotaUsageRepository(db),
    { budgetUnits: env.YT_QUOTA_BUDGET_UNITS, uploadDailyCap: env.YT_UPLOAD_DAILY_CAP },
    now,
  )
  const publishers = new Map<Network, SocialPublisher>()
  if (youtubeEnabled) {
    publishers.set(
      'youtube',
      new YoutubePublisher({
        api: new YoutubeClient(),
        quota: quotaGuard,
        config: {
          chunkBytes: env.YT_UPLOAD_CHUNK_BYTES,
          insertUnits: env.YT_VIDEOS_INSERT_UNITS,
        },
        now,
      }),
    )
  }
  // Meta (F3): mesma API client p/ as duas redes (o page token serve os dois).
  // Métricas/link-external só precisam do OAuth; o PUBLISHER exige também o R2.
  const metaApi =
    oauthCore && metaCfg ? new MetaClient({ graphVersion: metaCfg.graphVersion }) : null
  if (metaPublishEnabled && metaApi) {
    const metaPublisherConfig = { presignTtlSeconds: env.R2_PRESIGN_GET_TTL_SECONDS }
    publishers.set(
      'instagram',
      new MetaPublisher({ api: metaApi, network: 'instagram', config: metaPublisherConfig, now }),
    )
    publishers.set(
      'facebook',
      new MetaPublisher({ api: metaApi, network: 'facebook', config: metaPublisherConfig, now }),
    )
  }
  // TikTok (F4): Direct Post por FILE_UPLOAD (bytes saem do R2 em chunks).
  if (tiktokPublishEnabled) {
    publishers.set(
      'tiktok',
      new TikTokPublisher({
        api: new TikTokClient(),
        config: { chunkBytes: env.TT_UPLOAD_CHUNK_BYTES },
        now,
      }),
    )
  }

  // Workers (processo único, padrão messaging: claim SKIP LOCKED + lease).
  const publisherWorker = new PublisherWorker({
    publications: publicationRepo,
    contents: contentRepo,
    notifier: reminderNotifier,
    reminder: reminder
      ? {
          phones: reminder.phones,
          recipientName: reminder.recipientName,
          appUrl: oauthCore?.appUrl ?? env.MARKETING_APP_URL ?? '',
        }
      : null,
    auto:
      publishers.size > 0
        ? {
            publishers,
            accounts: accountRepo,
            accountService,
            assets: assetRepo,
            publicationAssets: publicationAssetRepo,
            store: mediaStore,
            publicationService,
          }
        : null,
    now,
    logger,
    config: {
      intervalMs: env.PUBLISHER_POLL_INTERVAL_MS,
      batchSize: env.PUBLISHER_BATCH_SIZE,
      claimLeaseMs: env.PUBLISHER_CLAIM_LEASE_MS,
      maxAttempts: env.REMINDER_MAX_ATTEMPTS,
      retryBaseMs: env.REMINDER_RETRY_BASE_MS,
      retryMaxMs: env.REMINDER_RETRY_MAX_MS,
      leadMsByNetwork: new Map<Network, number>([
        ['youtube', env.YT_UPLOAD_LEAD_HOURS * 60 * 60_000],
        ['instagram', env.META_PUBLISH_LEAD_MS],
        ['facebook', env.META_PUBLISH_LEAD_MS],
        // TikTok publica NA hora (upload = publicar) — lead só acorda o worker.
        ['tiktok', 60_000],
      ]),
    },
  })
  const mediaTransferWorker = new MediaTransferWorker({
    assets: assetRepo,
    store: mediaStore,
    drive: driveClient,
    accounts: accountService,
    now,
    logger,
    config: {
      intervalMs: env.MEDIA_TRANSFER_POLL_INTERVAL_MS,
      batchSize: env.MEDIA_TRANSFER_BATCH_SIZE,
      leaseMs: env.MEDIA_TRANSFER_LEASE_MS,
      maxAttempts: env.MEDIA_TRANSFER_MAX_ATTEMPTS,
      maxUploadBytes: env.MARKETING_MAX_UPLOAD_BYTES,
    },
  })
  // Arquivador R2→Drive (F4): precisa do Drive (Google) E do R2 configurados.
  const mediaArchiverWorker =
    driveClient && r2
      ? new MediaArchiverWorker({
          assets: assetRepo,
          store: mediaStore,
          drive: driveClient,
          accounts: accountService,
          now,
          logger,
          config: {
            intervalMs: env.MEDIA_ARCHIVER_INTERVAL_MS,
            batchSize: 2,
            leaseMs: 30 * 60_000,
            maxAttempts: 5,
            afterDays: env.MEDIA_ARCHIVE_AFTER_DAYS,
          },
        })
      : null
  const tokenRefreshWorker = new TokenRefreshWorker({
    accounts: accountRepo,
    accountService,
    now,
    logger,
    config: {
      intervalMs: env.TOKEN_REFRESH_INTERVAL_MS,
      marginMs: env.TOKEN_REFRESH_MARGIN_MS,
      renewMarginMs: env.META_TOKEN_RENEW_MARGIN_DAYS * 86_400_000,
    },
  })
  // Fontes de métricas por rede (YouTube na F2; Instagram/Facebook na F3).
  const metricsSources: MetricsSource[] = []
  if (youtubeEnabled) {
    metricsSources.push(new YoutubeMetricsSource(new YoutubeClient(), quotaGuard))
  }
  if (metaApi) {
    metricsSources.push(new MetaMetricsSource(metaApi, 'instagram'))
    metricsSources.push(new MetaMetricsSource(metaApi, 'facebook'))
  }
  if (oauthCore && tiktokCfg) {
    metricsSources.push(new TikTokMetricsSource(new TikTokClient()))
  }

  // Vínculo publicação manual ↔ post real (YouTube por regex; IG/FB pela API).
  const externalResolvers = new Map<Network, ExternalPostResolver>()
  externalResolvers.set('youtube', new YoutubeExternalResolver())
  if (metaApi) {
    externalResolvers.set('instagram', new MetaExternalResolver(metaApi, 'instagram'))
    externalResolvers.set('facebook', new MetaExternalResolver(metaApi, 'facebook'))
  }
  const linkExternalService = new LinkExternalService(
    publicationRepo,
    accountRepo,
    accountService,
    publicationAssetRepo,
    externalResolvers,
    now,
  )
  const metricsWorker =
    metricsSources.length > 0
      ? new MetricsWorker({
          sources: metricsSources,
          accounts: accountRepo,
          accountService,
          publications: publicationRepo,
          metrics: metricsRepo,
          // Advisory xact-lock: só uma réplica coleta por ciclo (solta no commit).
          withLock: async (fn) => {
            await connection.sql.begin(async (gate) => {
              const [row] = await gate`
                select pg_try_advisory_xact_lock(${METRICS_ADVISORY_LOCK_KEY}::bigint) as locked
              `
              if (!row?.locked) return
              await fn()
            })
          },
          now,
          logger,
          config: {
            intervalMs: env.METRICS_WORKER_INTERVAL_MS ?? env.YT_METRICS_INTERVAL_MS,
            maxAgeDays: env.METRICS_MAX_AGE_DAYS ?? env.YT_METRICS_MAX_AGE_DAYS,
            batchSize: env.METRICS_BATCH_SIZE,
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
      linkExternal: linkExternalService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    media: {
      media: mediaService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    oauth: {
      oauth: oauthService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    accounts: {
      accounts: accountService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    drive: {
      drive: driveService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    metrics: {
      metrics: metricsService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireStaffEnabled: env.REQUIRE_STAFF,
    },
    ai: {
      ai: aiCopyService,
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
      publisherWorker.start()
      mediaTransferWorker.start()
      mediaArchiverWorker?.start()
      tokenRefreshWorker.start()
      metricsWorker?.start()
      // `::` = dual-stack — necessário p/ o private networking do Railway (IPv6).
      server.listen({ port: env.PORT, hostname: env.HOST })
      logger.info('http.listening', { port: env.PORT, host: env.HOST })
    },
    async stop() {
      if (cleanupTimer) clearInterval(cleanupTimer)
      // Workers param ANTES do pool fechar (senão um tick em voo estoura no banco).
      await Promise.all([
        publisherWorker.stop(),
        mediaTransferWorker.stop(),
        mediaArchiverWorker?.stop() ?? Promise.resolve(),
        tokenRefreshWorker.stop(),
        metricsWorker?.stop() ?? Promise.resolve(),
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
