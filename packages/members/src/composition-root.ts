import { randomUUID } from 'node:crypto'
import { createLogger, type Logger } from '@sistemazero/core/logging'
import { CheckAccessService } from './application/access/check-access.service'
import { AccessCheckService } from './application/access-check/access-check.service'
import { GetChildrenStatsService } from './application/children-stats/get-children-stats.service'
import {
  AttachmentAdminService,
  BlockAdminService,
  CourseAdminService,
  LessonAdminService,
  ModuleAdminService,
} from './application/content-admin/content-admin.service'
import { AwardGamificationService } from './application/gamification/award-gamification.service'
import { GetGamificationService } from './application/gamification/get-gamification.service'
import { GetAttachmentDownloadService } from './application/get-attachment-download/get-attachment-download.service'
import { GetCourseProgressService } from './application/get-course-progress/get-course-progress.service'
import { GetCourseRatingService } from './application/get-course-rating/get-course-rating.service'
import { GetEbookDownloadService } from './application/get-ebook-download/get-ebook-download.service'
import { GetLessonService } from './application/get-lesson/get-lesson.service'
import { GetMemberDetailService } from './application/get-member-detail/get-member-detail.service'
import { GetMyCourseService } from './application/get-my-course/get-my-course.service'
import { GetShowcasePayloadService } from './application/get-showcase-payload/get-showcase-payload.service'
import { GetStudioCarryoverService } from './application/get-studio-carryover/get-studio-carryover.service'
import { GrantEntitlementService } from './application/grant-entitlement/grant-entitlement.service'
import { GrantManualEntitlementService } from './application/grant-manual-entitlement/grant-manual-entitlement.service'
import { ListCatalogService } from './application/list-catalog/list-catalog.service'
import { ListMembersService } from './application/list-members/list-members.service'
import { ListMyCoursesService } from './application/list-my-courses/list-my-courses.service'
import { ManageEntitlementService } from './application/manage-entitlement/manage-entitlement.service'
import { MarkLessonCompleteService } from './application/mark-lesson-complete/mark-lesson-complete.service'
import { GetProfileAllowanceService } from './application/profile-allowance/get-profile-allowance.service'
import { RevokeEntitlementService } from './application/revoke-entitlement/revoke-entitlement.service'
import { SaveCourseRatingService } from './application/save-course-rating/save-course-rating.service'
import { SaveVideoPositionService } from './application/save-video-position/save-video-position.service'
import { StudioSubmissionsAdminService } from './application/studio-submissions-admin/studio-submissions-admin.service'
import { SubmitQuizAttemptService } from './application/submit-quiz-attempt/submit-quiz-attempt.service'
import { SubmitStudioProjectService } from './application/submit-studio-project/submit-studio-project.service'
import type { Env } from './infrastructure/config/env'
import { createCatalogHttpGateway } from './infrastructure/gateways/catalog-http.gateway'
import { createHubHttpGateway, noopHubGateway } from './infrastructure/gateways/hub-http.gateway'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { DrizzleContentAdminRepository } from './infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from './infrastructure/persistence/drizzle/course.repository'
import { DrizzleCourseRatingRepository } from './infrastructure/persistence/drizzle/course-rating.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleEntitlementRepository } from './infrastructure/persistence/drizzle/entitlement.repository'
import { DrizzleGamificationRepository } from './infrastructure/persistence/drizzle/gamification.repository'
import { DrizzleProcessedWebhookRepository } from './infrastructure/persistence/drizzle/processed-webhook.repository'
import { DrizzleProgressRepository } from './infrastructure/persistence/drizzle/progress.repository'
import { DrizzleQuizAttemptRepository } from './infrastructure/persistence/drizzle/quiz-attempt.repository'
import { DrizzleStudioSubmissionRepository } from './infrastructure/persistence/drizzle/studio-submission.repository'
import { DrizzleVideoPositionRepository } from './infrastructure/persistence/drizzle/video-position.repository'
import { createServer } from './interfaces/http/server'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Chave do advisory lock do ciclo de limpeza/retenção ('members' em ASCII int8;
 * string + cast ::bigint — o driver não tipa BigInt como parâmetro). O espaço de
 * advisory locks é GLOBAL ao banco compartilhado do monorepo — precisa ser única
 * entre os serviços (a do payments é 8103081227979411315).
 */
const RETENTION_ADVISORY_LOCK_KEY = '30792292938117747'

/**
 * Raiz de composição (injeção de dependências). ÚNICO lugar que instancia adapters
 * concretos e os pluga nos ports.
 */
export async function createApplication(env: Env): Promise<Application> {
  // Espelho Sentry: TODO log de nível ERROR vira evento/issue (a convenção do
  // package é "log ERROR = sinal alertável"). Sem DSN o capture é no-op.
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
  const clock = () => new Date()

  // Adapters
  const courses = new DrizzleCourseRepository(db)
  const content = new DrizzleContentAdminRepository(db)
  const entitlements = new DrizzleEntitlementRepository(db)
  const progress = new DrizzleProgressRepository(db)
  const positions = new DrizzleVideoPositionRepository(db)
  const quizAttempts = new DrizzleQuizAttemptRepository(db)
  const studioSubmissions = new DrizzleStudioSubmissionRepository(db)
  const ratings = new DrizzleCourseRatingRepository(db)
  const gamificationRepo = new DrizzleGamificationRepository(db)
  const processed = new DrizzleProcessedWebhookRepository(db)
  const catalog = createCatalogHttpGateway({
    baseUrl: env.CATALOG_BASE_URL,
    timeoutMs: env.CATALOG_REQUEST_TIMEOUT_MS,
    internalToken: env.CATALOG_INTERNAL_TOKEN,
    logger,
  })
  // Notificador do hub (comunidade) no grant — best-effort. Sem HUB_BASE_URL (dev/local
  // ou hub não configurado) cai no no-op; o TTL do micro-cache do hub cobre.
  const hub = env.HUB_BASE_URL
    ? createHubHttpGateway({
        baseUrl: env.HUB_BASE_URL,
        hmacSecret: env.GATEWAY_HMAC_SECRET,
        timeoutMs: env.HUB_REQUEST_TIMEOUT_MS,
        logger,
      })
    : noopHubGateway

  // Casos de uso do aluno
  const checkAccess = new CheckAccessService(courses, entitlements, clock)
  // S2S: resolução de acesso em lote (consumido pela comunidade @sistemazero/hub).
  const accessCheck = new AccessCheckService(entitlements, clock)
  // S2S: teto de perfis kids da conta (consumido pelo `auth` ao criar perfil).
  const profileAllowance = new GetProfileAllowanceService(entitlements, clock, {
    defaultMaxProfiles: env.DEFAULT_KIDS_MAX_PROFILES,
  })
  // S2S: resumo de progresso dos filhos (consumido pelo BFF da área dos pais, kids).
  const childrenStats = new GetChildrenStatsService(
    gamificationRepo,
    courses,
    progress,
    studioSubmissions,
  )
  const listMyCourses = new ListMyCoursesService(entitlements, courses, progress, positions, clock)
  const listCatalog = new ListCatalogService(courses, entitlements, clock)
  const getMyCourse = new GetMyCourseService(checkAccess, courses, progress, positions, ratings)
  const getLesson = new GetLessonService(
    checkAccess,
    courses,
    progress,
    positions,
    quizAttempts,
    studioSubmissions,
    clock,
  )
  const resolveAttachment = new GetAttachmentDownloadService(checkAccess, courses)
  const resolveEbook = new GetEbookDownloadService(checkAccess, courses)
  const awardGamification = new AwardGamificationService(gamificationRepo, clock, logger)
  const getGamification = new GetGamificationService(gamificationRepo, clock)
  const markComplete = new MarkLessonCompleteService(
    checkAccess,
    courses,
    progress,
    quizAttempts,
    studioSubmissions,
    awardGamification,
    clock,
  )
  const getProgress = new GetCourseProgressService(checkAccess, courses, progress)
  const savePosition = new SaveVideoPositionService(checkAccess, courses, positions, clock)
  const getCourseRating = new GetCourseRatingService(checkAccess, ratings)
  const saveCourseRating = new SaveCourseRatingService(checkAccess, ratings, clock)
  const submitQuiz = new SubmitQuizAttemptService(
    checkAccess,
    courses,
    quizAttempts,
    awardGamification,
    () => randomUUID(),
    clock,
  )
  const submitStudio = new SubmitStudioProjectService(
    checkAccess,
    courses,
    studioSubmissions,
    awardGamification,
    () => randomUUID(),
    clock,
  )
  const getStudioCarryover = new GetStudioCarryoverService(checkAccess, courses, studioSubmissions)
  const getShowcasePayload = new GetShowcasePayloadService(checkAccess, courses, studioSubmissions)
  const studioSubmissionsAdmin = new StudioSubmissionsAdminService(studioSubmissions)

  // Motor de acesso (webhooks)
  const grant = new GrantEntitlementService({
    catalog,
    entitlements,
    graceDays: env.SUBSCRIPTION_GRACE_DAYS,
    newId: () => randomUUID(),
    logger,
  })
  const revoke = new RevokeEntitlementService({ entitlements, clock, logger })

  // Autoria de conteúdo (painel)
  const courseAdmin = new CourseAdminService(content, courses)
  const moduleAdmin = new ModuleAdminService(content, courses)
  const lessonAdmin = new LessonAdminService(content, courses)
  const blockAdmin = new BlockAdminService(content)
  const attachmentAdmin = new AttachmentAdminService(content)

  // Gestão admin (painel)
  const listMembers = new ListMembersService(entitlements, clock)
  const getMemberDetail = new GetMemberDetailService(entitlements, courses, progress)
  const grantManual = new GrantManualEntitlementService({
    catalog,
    courses,
    entitlements,
    newId: () => randomUUID(),
    clock,
    logger,
  })
  const manageEntitlement = new ManageEntitlementService(entitlements, clock)

  // Readiness (`/readyz`, healthcheck do Railway): a réplica só é promovida
  // quando o banco responde — sem isto o redeploy promove uma réplica que ainda
  // não fala com o Postgres e o gateway vê 5xx.
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
    members: {
      listMyCourses,
      listCatalog,
      getMyCourse,
      getLesson,
      resolveAttachment,
      resolveEbook,
      markComplete,
      getProgress,
      savePosition,
      submitQuiz,
      submitStudio,
      getStudioCarryover,
      getShowcasePayload,
      getCourseRating,
      saveCourseRating,
      getGamification,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    webhooks: {
      grant,
      revoke,
      processed,
      hub,
      webhookSecret: env.GATEWAY_HMAC_SECRET,
      toleranceSeconds: env.HMAC_TOLERANCE_SECONDS,
      now: clock,
      logger,
    },
    admin: {
      requireAdminEnabled: env.REQUIRE_ADMIN,
      internalToken: env.INTERNAL_API_TOKEN,
      listMembers,
      getMemberDetail,
      grantManual,
      manageEntitlement,
      hub,
    },
    content: {
      requireAdminEnabled: env.REQUIRE_ADMIN,
      internalToken: env.INTERNAL_API_TOKEN,
      courses: courseAdmin,
      modules: moduleAdmin,
      lessons: lessonAdmin,
      blocks: blockAdmin,
      attachments: attachmentAdmin,
      studioSubmissions: studioSubmissionsAdmin,
    },
    internal: {
      accessCheck,
      profileAllowance,
      showcasePayload: getShowcasePayload,
      childrenStats,
      internalToken: env.INTERNAL_API_TOKEN,
    },
  })

  let cleanupTimer: ReturnType<typeof setInterval> | null = null

  // Retenção do dedupe de webhooks (fora do hot path): apaga `processed_webhooks`
  // antigos para a tabela não crescer sem limite. O advisory lock garante que SÓ
  // UMA réplica executa o ciclo (xact-lock → solta sozinho no commit/crash).
  const runRetentionCycle = async () => {
    await connection.sql.begin(async (gate) => {
      const [row] = await gate`
        select pg_try_advisory_xact_lock(${RETENTION_ADVISORY_LOCK_KEY}::bigint) as locked
      `
      if (!row?.locked) return // outra réplica está limpando neste ciclo
      const cutoff = new Date(Date.now() - env.PROCESSED_WEBHOOKS_RETENTION_DAYS * 86_400_000)
      const pruned = await processed.pruneProcessedBefore(cutoff)
      if (pruned > 0) logger.info('retention.pruned', { processedWebhooks: pruned })
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
      // `::` = dual-stack (IPv4+IPv6) — necessário p/ o private networking do
      // Railway (`members.railway.internal` resolve IPv6).
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
