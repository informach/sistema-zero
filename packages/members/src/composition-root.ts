import { randomUUID } from 'node:crypto'
import { createLogger, type Logger, serializeError } from '@sistemazero/core/logging'
import { CheckAccessService } from './application/access/check-access.service'
import { AccessCheckService } from './application/access-check/access-check.service'
import { CreationCleanupService } from './application/admin/creation-cleanup/creation-cleanup.service'
import { PurgeUserDataService } from './application/admin/purge-user-data/purge-user-data.service'
import { AdultJourneyService } from './application/adult-journey/adult-journey.service'
import { runAdultJourneySeedOnce } from './application/adult-journey/adult-journey-seed-once'
import { ConsumeAiUsageService } from './application/ai-usage/consume-ai-usage.service'
import { GetAiCreditsService } from './application/ai-usage/get-ai-credits.service'
import { GetAiUsageStatsService } from './application/ai-usage/get-ai-usage-stats.service'
import { StudioAiAccountService } from './application/ai-usage/studio-ai-account.service'
import { StudioAiUsageService } from './application/ai-usage/studio-ai-usage.service'
import { GetCourseAnalyticsService } from './application/analytics/get-course-analytics.service'
import { BuyAvatarPartService } from './application/avatar/buy-avatar-part.service'
import { EquipAvatarService } from './application/avatar/equip-avatar.service'
import { GetAvatarService } from './application/avatar/get-avatar.service'
import { GetAvatarsByProfilesService } from './application/avatar/get-avatars-by-profiles.service'
import { SetAvatarPhotoService } from './application/avatar/set-avatar-photo.service'
import { SendChallengeLifecycleService } from './application/challenge-lifecycle/send-challenge-lifecycle.service'
import { GetChildrenStatsService } from './application/children-stats/get-children-stats.service'
import {
  CourseAdminService,
  LessonAdminService,
  ModuleAdminService,
} from './application/content-admin/content-admin.service'
import {
  CommitCreationUploadService,
  CompactCreationTombstonesService,
  DeleteCreationService,
  GetCreationDownloadService,
  ListCreationsService,
  ReserveCreationUploadService,
} from './application/creations/creations.service'
import { LessonDraftAccessService } from './application/creations/lesson-draft-access.service'
import { AwardGamificationService } from './application/gamification/award-gamification.service'
import { BuyStreakFreezeService } from './application/gamification/buy-streak-freeze.service'
import { ChallengeAdminService } from './application/gamification/challenge-admin.service'
import { ClaimMissionService } from './application/gamification/claim-mission.service'
import { ClaimUnitChestService } from './application/gamification/claim-unit-chest.service'
import { GetChallengeService } from './application/gamification/get-challenge.service'
import { GetGamificationService } from './application/gamification/get-gamification.service'
import { GetLeagueService } from './application/gamification/get-league.service'
import { GetMissionsService } from './application/gamification/get-missions.service'
import { GetRankingLeaderboardService } from './application/gamification/get-ranking-leaderboard.service'
import { ListRankingService } from './application/gamification/list-ranking.service'
import { LiveRewardsService } from './application/gamification/live-rewards.service'
import { RecordStudioActivityDayService } from './application/gamification/record-studio-activity-day.service'
import { RecordStudioRemixService } from './application/gamification/record-studio-remix.service'
import { SetVacationService } from './application/gamification/set-vacation.service'
import { GetAttachmentDownloadService } from './application/get-attachment-download/get-attachment-download.service'
import { RecordMaterialDownloadService } from './application/get-attachment-download/record-material-download.service'
import { GetCertificateService } from './application/get-certificate/get-certificate.service'
import { GetCourseProgressService } from './application/get-course-progress/get-course-progress.service'
import { GetCourseRatingService } from './application/get-course-rating/get-course-rating.service'
import { GetEbookDownloadService } from './application/get-ebook-download/get-ebook-download.service'
import { GetLessonService } from './application/get-lesson/get-lesson.service'
import { GetMemberActivityService } from './application/get-member-activity/get-member-activity.service'
import { GetMemberDetailService } from './application/get-member-detail/get-member-detail.service'
import { GetMyCourseService } from './application/get-my-course/get-my-course.service'
import { GetOwnStudioSubmissionService } from './application/get-own-studio-submission/get-own-studio-submission.service'
import { GetShowcasePayloadService } from './application/get-showcase-payload/get-showcase-payload.service'
import { GetStudioCarryoverService } from './application/get-studio-carryover/get-studio-carryover.service'
import { GrantEntitlementService } from './application/grant-entitlement/grant-entitlement.service'
import { GrantManualEntitlementService } from './application/grant-manual-entitlement/grant-manual-entitlement.service'
import { HelpService } from './application/help/help.service'
import { IssueCertificateService } from './application/issue-certificate/issue-certificate.service'
import { KidsJourneyConfigurationService } from './application/kids-journey/kids-journey-configuration.service'
import { KidsJourneyProfilesService } from './application/kids-journey/kids-journey-profiles.service'
import { KidsJourneyQueryService } from './application/kids-journey/kids-journey-query.service'
import { KidsProfileAdmissionService } from './application/kids-journey/kids-profile-admission.service'
import { LearningService } from './application/learning/learning.service'
import { LearningImportService } from './application/learning/learning-import.service'
import { SectionProgressionService } from './application/learning/section-progression.service'
import { ListCatalogService } from './application/list-catalog/list-catalog.service'
import { ListMemberCertificatesService } from './application/list-member-certificates/list-member-certificates.service'
import { ListMemberRatingsService } from './application/list-member-ratings/list-member-ratings.service'
import { ListMembersService } from './application/list-members/list-members.service'
import { ListMyCoursesService } from './application/list-my-courses/list-my-courses.service'
import { LiveService } from './application/live/live.service'
import { LiveMaterialsService } from './application/live/live-materials.service'
import { LivePublicationService } from './application/live/live-publication.service'
import { LiveWorkspaceService } from './application/live/live-workspace.service'
import { LiveTeacherNotesService } from './application/live-course/teacher-notes.service'
import { ManageEntitlementService } from './application/manage-entitlement/manage-entitlement.service'
import { MarkLessonCompleteService } from './application/mark-lesson-complete/mark-lesson-complete.service'
import { MasteryService } from './application/mastery/mastery.service'
import { ParentReportPrefsService } from './application/parent-report/report-prefs.service'
import { SendParentReportsService } from './application/parent-report/send-parent-reports.service'
import { GetPensaFunnelService } from './application/pensa/pensa-funnel.service'
import { PensaProjectService } from './application/pensa/project.service'
import { PensaTeamService } from './application/pensa/team.service'
import { GetProfileAllowanceService } from './application/profile-allowance/get-profile-allowance.service'
import { AdultProfileService } from './application/profiles/adult-profile.service'
import { GetPublicProfileService } from './application/profiles/get-public-profile.service'
import { GetProfilesOverviewService } from './application/profiles-overview/get-profiles-overview.service'
import { SendAccessEndedMessagesService } from './application/renewal-reminder/send-access-ended-messages.service'
import { SendRenewalRemindersService } from './application/renewal-reminder/send-renewal-reminders.service'
import { RevokeEntitlementService } from './application/revoke-entitlement/revoke-entitlement.service'
import { BuyRoomItemService } from './application/room/buy-room-item.service'
import { GetRoomService } from './application/room/get-room.service'
import { SaveRoomService } from './application/room/save-room.service'
import { SaveCourseRatingService } from './application/save-course-rating/save-course-rating.service'
import { SaveVideoPositionService } from './application/save-video-position/save-video-position.service'
import { AuthorizeAuthoringRuntimeService } from './application/studio/authorize-authoring-runtime.service'
import { AuthorizeFreeRuntimeService } from './application/studio/authorize-free-runtime.service'
import { AuthorizeLessonRuntimeService } from './application/studio/authorize-lesson-runtime.service'
import { AuthorizeLivePublicationRuntimeService } from './application/studio/authorize-live-publication-runtime.service'
import { AuthorizeLiveRuntimeService } from './application/studio/authorize-live-runtime.service'
import { AuthorizeMasteryReviewRuntimeService } from './application/studio/authorize-mastery-review-runtime.service'
import { AuthorizePublicRuntimeService } from './application/studio/authorize-public-runtime.service'
import { AuthorizePythonAnalysisService } from './application/studio/authorize-python-analysis.service'
import { FreeStudioAccessService } from './application/studio/free-studio-access.service'
import { OpenLessonStudioService } from './application/studio/open-lesson-studio.service'
import { PythonProjectCheckerService } from './application/studio/python-project-checker.service'
import { StudioPythonBuilderPolicy } from './application/studio-pro/python-builder-policy'
import { StudioBuilderService } from './application/studio-pro/studio-builder.service'
import { createStudioBuilderCoordinator } from './application/studio-pro/studio-builder-coordinator'
import { StudioSubmissionsAdminService } from './application/studio-submissions-admin/studio-submissions-admin.service'
import { GetStudioUnlocksService } from './application/studio-unlocks/get-studio-unlocks.service'
import { SubmitQuizAttemptService } from './application/submit-quiz-attempt/submit-quiz-attempt.service'
import { SubmitStudioProjectService } from './application/submit-studio-project/submit-studio-project.service'
import { TeacherBroadcastsService } from './application/teacher-threads/teacher-broadcasts.service'
import { TeacherThreadsService } from './application/teacher-threads/teacher-threads.service'
import { GetMemberToolUsageService } from './application/tool-usage/get-member-tool-usage.service'
import {
  RevokeCertificateService,
  ValidateCertificateService,
} from './application/validate-certificate/validate-certificate.service'
import { ZappyHistoryService } from './application/zappy/zappy-history.service'
import { ZappyKnowledgeService } from './application/zappy/zappy-knowledge.service'
import type { LiveRewardsPort } from './domain/ports/live-rewards.port'
import type { MasteryOwner } from './domain/ports/mastery-repository.port'
import { createStudioRuntimeHosts } from './domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from './domain/studio/runtime-policy'
import type { Env } from './infrastructure/config/env'
import { loadStudioAuthoringPolicy } from './infrastructure/config/studio-authoring-policy'
import { createAuthHttpGateway } from './infrastructure/gateways/auth-http.gateway'
import { createCatalogHttpGateway } from './infrastructure/gateways/catalog-http.gateway'
import { FunnelChallengeAnalyticsGateway } from './infrastructure/gateways/funnel-challenge-analytics.gateway'
import { createGatewayMessagingClient } from './infrastructure/gateways/gateway-messaging-client'
import { createHubHttpGateway, noopHubGateway } from './infrastructure/gateways/hub-http.gateway'
import { LiveProfileOwnershipGateway } from './infrastructure/gateways/live-profile-ownership.gateway'
import { OpenRouterOAuthGateway } from './infrastructure/gateways/openrouter-oauth'
import { createStudioBuilderExecutorDelivery } from './infrastructure/gateways/studio-builder-executor.gateway'
import { createStudioRuntimeChecker } from './infrastructure/gateways/studio-runtime-checker'
import { teacherRecipientDirectory } from './infrastructure/gateways/teacher-recipient-http.gateway'
import type { CloudflareSfuMediaProvider } from './infrastructure/live/cloudflare-sfu.provider'
import { createLiveMediaInfrastructure } from './infrastructure/live/create-live-media'
import { OwnRecordingProvider } from './infrastructure/live/own-recording.provider'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { DrizzleAdultJourneyRepository } from './infrastructure/persistence/drizzle/adult-journey.repository'
import { DrizzleAdultProfileRepository } from './infrastructure/persistence/drizzle/adult-profile.repository'
import { DrizzleAiUsageRepository } from './infrastructure/persistence/drizzle/ai-usage.repository'
import { DrizzleAnalyticsRepository } from './infrastructure/persistence/drizzle/analytics.repository'
import { DrizzleAvatarRepository } from './infrastructure/persistence/drizzle/avatar.repository'
import { DrizzleCertificateRepository } from './infrastructure/persistence/drizzle/certificate.repository'
import { DrizzleChallengeConfigRepository } from './infrastructure/persistence/drizzle/challenge-config.repository'
import { DrizzleChallengeLifecycleRepository } from './infrastructure/persistence/drizzle/challenge-lifecycle.repository'
import { DrizzleContentAdminRepository } from './infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from './infrastructure/persistence/drizzle/course.repository'
import { DrizzleCourseRatingRepository } from './infrastructure/persistence/drizzle/course-rating.repository'
import { DrizzleCreationCleanupRepository } from './infrastructure/persistence/drizzle/creation-cleanup.repository'
import { DrizzleCreationsRepository } from './infrastructure/persistence/drizzle/creations.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleEntitlementRepository } from './infrastructure/persistence/drizzle/entitlement.repository'
import { DrizzleGalleryCopyRepository } from './infrastructure/persistence/drizzle/gallery-copy.repository'
import { DrizzleGamificationRepository } from './infrastructure/persistence/drizzle/gamification.repository'
import {
  DrizzleHelpCollectionRepository,
  DrizzleHelpTutorialRepository,
} from './infrastructure/persistence/drizzle/help.repository'
import { DrizzleKidsJourneyRepository } from './infrastructure/persistence/drizzle/kids-journey.repository'
import { DrizzleLearningRepository } from './infrastructure/persistence/drizzle/learning.repository'
import { DrizzleLessonDraftRepository } from './infrastructure/persistence/drizzle/lesson-draft.repository'
import { DrizzleLiveRepository } from './infrastructure/persistence/drizzle/live.repository'
import { DrizzleLiveBenefitsRepository } from './infrastructure/persistence/drizzle/live-benefits.repository'
import { DrizzleLiveCourseRepository } from './infrastructure/persistence/drizzle/live-course.repository'
import { DrizzleLiveLessonAccessRepository } from './infrastructure/persistence/drizzle/live-lesson-access.repository'
import { DrizzleLiveMaterialsRepository } from './infrastructure/persistence/drizzle/live-materials.repository'
import { DrizzleLiveWorkspaceRepository } from './infrastructure/persistence/drizzle/live-workspace.repository'
import { DrizzleMasteryRepository } from './infrastructure/persistence/drizzle/mastery.repository'
import { readMasteryJourneyFacts } from './infrastructure/persistence/drizzle/mastery-journey-facts'
import { DrizzleParentReportRepository } from './infrastructure/persistence/drizzle/parent-report.repository'
import { DrizzlePensaCheckpointsRepository } from './infrastructure/persistence/drizzle/pensa-checkpoints.repository'
import { DrizzlePensaFunnelRepository } from './infrastructure/persistence/drizzle/pensa-funnel.repository'
import { DrizzlePensaNarrationsRepository } from './infrastructure/persistence/drizzle/pensa-narrations.repository'
import { DrizzlePensaOperationsRepository } from './infrastructure/persistence/drizzle/pensa-operations.repository'
import { DrizzlePensaProjectCommands } from './infrastructure/persistence/drizzle/pensa-project.commands'
import { DrizzlePensaProjectRepository } from './infrastructure/persistence/drizzle/pensa-project.repository'
import { DrizzlePensaRewardsRepository } from './infrastructure/persistence/drizzle/pensa-rewards.repository'
import { DrizzlePensaTeamRepository } from './infrastructure/persistence/drizzle/pensa-team.repository'
import { DrizzleProcessedWebhookRepository } from './infrastructure/persistence/drizzle/processed-webhook.repository'
import { DrizzleProgressRepository } from './infrastructure/persistence/drizzle/progress.repository'
import { DrizzleQuizAttemptRepository } from './infrastructure/persistence/drizzle/quiz-attempt.repository'
import { DrizzleRenewalReminderRepository } from './infrastructure/persistence/drizzle/renewal-reminder.repository'
import { DrizzleRoomRepository } from './infrastructure/persistence/drizzle/room.repository'
import { withSessionAdvisoryLock } from './infrastructure/persistence/drizzle/session-advisory-lock'
import { DrizzleStudioAiAccountRepository } from './infrastructure/persistence/drizzle/studio-ai-account.repository'
import { DrizzleStudioAiUsageRepository } from './infrastructure/persistence/drizzle/studio-ai-usage.repository'
import { DrizzleStudioBuilderRepository } from './infrastructure/persistence/drizzle/studio-builder.repository'
import { DrizzleStudioLessonBindingRepository } from './infrastructure/persistence/drizzle/studio-lesson-binding.repository'
import { DrizzleStudioSubmissionRepository } from './infrastructure/persistence/drizzle/studio-submission.repository'
import { DrizzleStudioUnlockRepository } from './infrastructure/persistence/drizzle/studio-unlock.repository'
import { DrizzleTeacherBroadcastRepository } from './infrastructure/persistence/drizzle/teacher-broadcast.repository'
import { DrizzleTeacherThreadRepository } from './infrastructure/persistence/drizzle/teacher-thread.repository'
import { DrizzleToolUsageRepository } from './infrastructure/persistence/drizzle/tool-usage.repository'
import { DrizzleUserDataPurgeRepository } from './infrastructure/persistence/drizzle/user-data-purge.repository'
import { DrizzleVideoPositionRepository } from './infrastructure/persistence/drizzle/video-position.repository'
import { DrizzleZappyRepository } from './infrastructure/persistence/drizzle/zappy.repository'
import { DrizzleZappyKnowledgeRepository } from './infrastructure/persistence/drizzle/zappy-knowledge.repository'
import { EncryptedRankingCursorCodec } from './infrastructure/security/ranking-cursor.codec'
import { studioAiVaultConfig } from './infrastructure/security/studio-ai-vault-config'
import { parsePublishedLessonBlock } from './interfaces/http/lesson-draft.dtos'
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
 * Chave do advisory lock do REPORT semanal dos pais (retenção+1 — única no banco
 * compartilhado: payments 8103081227979411315, retenção 30792292938117747, hub
 * 51020304050607081, auth 1635430504). Só UMA réplica envia por ciclo.
 */
const PARENT_REPORT_ADVISORY_LOCK_KEY = '30792292938117748'

/**
 * Chave do advisory lock do LEMBRETE de renovação (report+1 — única no banco
 * compartilhado). Só UMA réplica envia por ciclo. Lock de SESSÃO (o ciclo faz HTTP).
 */
const RENEWAL_REMINDER_ADVISORY_LOCK_KEY = '30792292938117749'

/**
 * Atraso do ciclo de boot (retenção + `expireLapsed`, depois vencimentos e fim do acesso). O
 * intervalo de 6 h sozinho nunca roda quando o deploy é mais frequente que ele, e os avisos de
 * fim do acesso só olham para trás `ACCESS_ENDED_WINDOW_MS` (72 h). Alguns segundos depois do
 * `listen`, para não competir com a subida nem com o seed da jornada.
 */
const BOOT_CYCLE_DELAY_MS = 15_000

/**
 * Raiz de composição (injeção de dependências). ÚNICO lugar que instancia adapters
 * concretos e os pluga nos ports.
 */
export async function createApplication(env: Env): Promise<Application> {
  // Verify before opening connections: malformed deployment policy fails startup.
  const studioAuthoringPolicy = await loadStudioAuthoringPolicy(env)
  if (env.STUDIO_RUNTIME_HOSTS_JSON && !studioAuthoringPolicy)
    throw new Error('Os hosts de execução precisam de um catálogo aprovado.')
  const studioRuntimePolicy = studioAuthoringPolicy
    ? await createStudioRuntimePolicy(
        studioAuthoringPolicy.describe(),
        createStudioRuntimeHosts(
          studioAuthoringPolicy.describe().catalog,
          JSON.parse(env.STUDIO_RUNTIME_HOSTS_JSON ?? '[]'),
        ),
      )
    : undefined
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
  const learningRepository = new DrizzleLearningRepository(db, studioAuthoringPolicy)
  const courses = new DrizzleCourseRepository(db)
  const content = new DrizzleContentAdminRepository(db, studioAuthoringPolicy)
  const entitlements = new DrizzleEntitlementRepository(db)
  const progress = new DrizzleProgressRepository(db)
  const positions = new DrizzleVideoPositionRepository(db)
  const quizAttempts = new DrizzleQuizAttemptRepository(db)
  const studioSubmissions = new DrizzleStudioSubmissionRepository(db)
  const ratings = new DrizzleCourseRatingRepository(db)
  const gamificationRepo = new DrizzleGamificationRepository(db)
  const challengeConfigRepo = new DrizzleChallengeConfigRepository(db)
  const certificates = new DrizzleCertificateRepository(db)
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
  // O executor dos objetivos que RODAM o jogo (etapa 3 dos objetivos, 18/10/2026).
  const projectExecutor =
    env.STUDIO_PRO_RUNTIME_URL && env.STUDIO_PRO_RUNTIME_TOKEN
      ? createStudioRuntimeChecker({
          runtimeUrl: env.STUDIO_PRO_RUNTIME_URL,
          runtimeToken: env.STUDIO_PRO_RUNTIME_TOKEN,
          logger,
        })
      : undefined

  // Casos de uso do aluno
  // Curso AO VIVO (14/10/2026): a aula abre pela vaga na turma (grants das oficinas).
  const liveLessonAccess = new DrizzleLiveLessonAccessRepository(db)
  const kidsJourneyRepo = new DrizzleKidsJourneyRepository(db)
  const masteryRepository = new DrizzleMasteryRepository(db)
  const masteryFactsReader = async (owner: MasteryOwner) =>
    (await readMasteryJourneyFacts(db, [owner])).get(owner.userId)!
  const kidsJourneyConfiguration = new KidsJourneyConfigurationService(kidsJourneyRepo)
  const kidsJourneyQuery = new KidsJourneyQueryService(kidsJourneyRepo, masteryFactsReader)
  const kidsJourneyProfiles = new KidsJourneyProfilesService(kidsJourneyRepo, kidsJourneyQuery)
  const adultJourney = new AdultJourneyService(
    new DrizzleAdultJourneyRepository(db),
    courses,
    clock,
    masteryFactsReader,
  )
  const masteries = new MasteryService(
    masteryRepository,
    (owner, extraCourseIds) =>
      owner.audience === 'kids'
        ? kidsJourneyQuery.masteryContext(owner)
        : adultJourney.masteryContext(owner.userId, extraCourseIds),
    entitlements,
    clock,
    randomUUID,
  )
  const checkAccess = new CheckAccessService(
    courses,
    entitlements,
    kidsJourneyQuery,
    clock,
    liveLessonAccess,
    adultJourney,
  )
  // S2S: resolução de acesso em lote (consumido pela comunidade @sistemazero/hub).
  const accessCheck = new AccessCheckService(entitlements, clock)
  const kidsProfileAdmission = new KidsProfileAdmissionService(kidsJourneyRepo)
  const studioUnlockRepo = new DrizzleStudioUnlockRepository(db)
  const getStudioUnlocks = new GetStudioUnlocksService(gamificationRepo, studioUnlockRepo, logger)
  const freeStudioAccess = new FreeStudioAccessService(
    accessCheck,
    getStudioUnlocks,
    kidsJourneyQuery,
    adultJourney,
  )
  const authorizeFreeRuntime = new AuthorizeFreeRuntimeService(
    freeStudioAccess,
    studioRuntimePolicy,
    studioAuthoringPolicy,
  )
  const liveBenefits = new DrizzleLiveBenefitsRepository(db)
  // S2S: teto de perfis kids da conta (consumido pelo `auth` ao criar perfil).
  const profileAllowance = new GetProfileAllowanceService(
    entitlements,
    clock,
    {
      defaultMaxProfiles: env.DEFAULT_KIDS_MAX_PROFILES,
    },
    liveBenefits,
  )
  // Quota de IA por conta (o BFF consome 1 crédito antes de cada ida ao LLM).
  const aiUsageRepo = new DrizzleAiUsageRepository(db)
  const studioAiSecrets = studioAiVaultConfig(env)
  const studioAiAccountsRepo = new DrizzleStudioAiAccountRepository(db)
  const studioAiAccount = new StudioAiAccountService({
    accounts: studioAiAccountsRepo,
    oauth: new OpenRouterOAuthGateway(),
    ...studioAiSecrets,
  })
  const studioAiUsageRepo = new DrizzleStudioAiUsageRepository(db)
  const studioBuilderRepository = new DrizzleStudioBuilderRepository(
    db,
    env.STUDIO_PYTHON_RUNTIME_URL ? new URL(env.STUDIO_PYTHON_RUNTIME_URL).origin : undefined,
    clock,
  )
  const pythonBuilderPolicy = new StudioPythonBuilderPolicy(
    authorizeFreeRuntime,
    Boolean(env.STUDIO_PYTHON_RUNTIME_URL && env.STUDIO_PYTHON_RUNTIME_TOKEN),
  )
  const studioBuilder = new StudioBuilderService(
    studioBuilderRepository,
    clock,
    Boolean(env.STUDIO_BUILDER_EXECUTOR_URL && env.STUDIO_BUILDER_EXECUTOR_SECRET),
    Boolean(env.ADULT_STUDIO_BUILDER_EXECUTOR_URL && env.STUDIO_BUILDER_EXECUTOR_SECRET),
    (...args) => pythonBuilderPolicy.execute(...args),
    async (actor, signal) => {
      signal.throwIfAborted()
      await freeStudioAccess.execute(
        { ...actor, audience: actor.audience ?? 'kids', readOnly: false },
        'existing-pro',
        'javascript',
      )
      signal.throwIfAborted()
    },
  )
  const studioAiUsage = new StudioAiUsageService({
    repository: studioAiUsageRepo,
    vault: studioAiSecrets.vault,
    clock,
    limits: {
      dailyLimit: env.AI_LIMIT_DAILY,
      monthlyLimit: env.AI_LIMIT_MONTHLY,
      dailyMicroUsd: env.STUDIO_AI_DAILY_MICRO_USD,
      monthlyMicroUsd: env.STUDIO_AI_MONTHLY_MICRO_USD,
      maxConcurrent: env.STUDIO_AI_MAX_CONCURRENT,
      externalDailyRuns: env.STUDIO_AI_EXTERNAL_DAILY_RUNS,
      priceCaps: {
        prompt: env.STUDIO_AI_MAX_PROMPT_PRICE,
        completion: env.STUDIO_AI_MAX_COMPLETION_PRICE,
        request: 0,
      },
    },
  })
  const studioBuilderCoordinator = createStudioBuilderCoordinator({
    pending: (now, limit) => studioBuilderRepository.pendingExecutions(now, limit),
    reconcile: async (job) =>
      (
        await studioBuilder.execute(job.actor, {
          operation: 'get',
          id: job.id,
          projectId: job.projectId,
        })
      )?.job ?? null,
    finish: async (job) => {
      await studioAiUsage.finish(job.actor, job.id)
    },
    deliver: createStudioBuilderExecutorDelivery({
      kidsUrl: env.STUDIO_BUILDER_EXECUTOR_URL,
      adultUrl: env.ADULT_STUDIO_BUILDER_EXECUTOR_URL,
      secret: env.STUDIO_BUILDER_EXECUTOR_SECRET,
    }),
    report: (error) =>
      logger.error('studio.builder_delivery_failed', {
        error: error instanceof Error ? error.name : 'Error',
      }),
  })
  const consumeAiUsage = new ConsumeAiUsageService({
    aiUsage: aiUsageRepo,
    dailyLimit: env.AI_LIMIT_DAILY,
    monthlyLimit: env.AI_LIMIT_MONTHLY,
    clock,
  })
  // Leitura do saldo (medidor da criança + painel dos pais). MESMO repo e MESMAS
  // envs do consume: os tetos vivem num lugar só.
  const aiCredits = new GetAiCreditsService({
    studioAccounts: studioAiAccountsRepo,
    aiUsage: aiUsageRepo,
    dailyLimit: env.AI_LIMIT_DAILY,
    monthlyLimit: env.AI_LIMIT_MONTHLY,
    clock,
  })
  const aiUsageStats = new GetAiUsageStatsService(aiUsageRepo, clock, studioAiUsageRepo)
  const pensaFunnel = new GetPensaFunnelService(new DrizzlePensaFunnelRepository(db), clock)
  const zappy = new ZappyHistoryService(new DrizzleZappyRepository(db), clock)
  // S2S: resumo de progresso dos filhos (consumido pelo BFF da área dos pais, kids).
  // O hub entra p/ os JOGOS da semana no Mural (best-effort — sem HUB_BASE_URL degrada).
  const childrenStats = new GetChildrenStatsService(
    gamificationRepo,
    courses,
    progress,
    studioSubmissions,
    accessCheck,
    learningRepository,
    clock,
    kidsJourneyProfiles,
    hub,
  )

  // Report SEMANAL dos pais (Fase 5): prefs (opt-out) sempre; o JOB de envio só
  // liga com o quarteto AUTH_BASE_URL/AUTH_INTERNAL_TOKEN/GATEWAY_URL/
  // MEMBERS_HMAC_SECRET configurado (sem eles = no-op, dev).
  const parentReports = new DrizzleParentReportRepository(db)
  const parentReportPrefs = new ParentReportPrefsService(parentReports, clock)
  // Auth S2S (nomes/flag-público das crianças) — reusado pelo report dos pais E pela
  // liga kids (rosto+nome dos colegas). `null` (dev/local sem envs) → ambos degradam.
  const authGateway =
    env.AUTH_BASE_URL && env.AUTH_INTERNAL_TOKEN
      ? createAuthHttpGateway({
          baseUrl: env.AUTH_BASE_URL,
          internalToken: env.AUTH_INTERNAL_TOKEN,
          timeoutMs: env.AUTH_REQUEST_TIMEOUT_MS,
          logger,
        })
      : null
  const parentReportSender =
    authGateway && env.GATEWAY_URL && env.MEMBERS_HMAC_SECRET
      ? new SendParentReportsService(
          gamificationRepo,
          studioSubmissions,
          learningRepository,
          childrenStats,
          parentReports,
          authGateway,
          createGatewayMessagingClient({
            gatewayUrl: env.GATEWAY_URL,
            consumerId: 'members',
            hmacSecret: env.MEMBERS_HMAC_SECRET,
          }),
          clock,
          logger,
          {
            dow: env.PARENT_REPORT_DOW,
            hour: env.PARENT_REPORT_HOUR,
            batchLimit: env.PARENT_REPORT_BATCH_LIMIT,
            kidsUrl: env.KIDS_COMMUNITY_URL,
          },
        )
      : null

  const challengeAnalytics =
    env.FUNNEL_URL && env.FUNNEL_INTERNAL_TOKEN
      ? new FunnelChallengeAnalyticsGateway(
          env.FUNNEL_URL,
          env.FUNNEL_INTERNAL_TOKEN,
          env.AUTH_REQUEST_TIMEOUT_MS,
        )
      : undefined

  // Lembrete de RENOVAÇÃO (anual à vista): mesmo quarteto do report dos pais +
  // FUNNEL_URL (o link /renovar vive no funil). Sem as envs = no-op (dev).
  const renewalReminderSender =
    authGateway &&
    env.GATEWAY_URL &&
    env.MEMBERS_HMAC_SECRET &&
    env.FUNNEL_URL &&
    env.KIDS_COMMUNITY_URL
      ? new SendRenewalRemindersService(
          new DrizzleRenewalReminderRepository(db),
          authGateway,
          createGatewayMessagingClient({
            gatewayUrl: env.GATEWAY_URL,
            consumerId: 'members',
            hmacSecret: env.MEMBERS_HMAC_SECRET,
          }),
          clock,
          logger,
          {
            daysBefore: env.RENEWAL_REMINDER_DAYS_BEFORE,
            batchLimit: env.RENEWAL_REMINDER_BATCH_LIMIT,
            funnelUrl: env.FUNNEL_URL,
            kidsUrl: env.KIDS_COMMUNITY_URL,
            adultUrl: env.COMMUNITY_URL,
          },
          challengeAnalytics,
        )
      : null
  const challengeLifecycleSender =
    authGateway &&
    env.GATEWAY_URL &&
    env.MEMBERS_HMAC_SECRET &&
    env.FUNNEL_URL &&
    env.KIDS_COMMUNITY_URL
      ? new SendChallengeLifecycleService(
          new DrizzleChallengeLifecycleRepository(db, logger),
          authGateway,
          createGatewayMessagingClient({
            gatewayUrl: env.GATEWAY_URL,
            consumerId: 'members',
            hmacSecret: env.MEMBERS_HMAC_SECRET,
          }),
          clock,
          logger,
          {
            batchLimit: env.RENEWAL_REMINDER_BATCH_LIMIT,
            funnelUrl: env.FUNNEL_URL,
            kidsUrl: env.KIDS_COMMUNITY_URL,
            adultUrl: env.COMMUNITY_URL,
          },
          challengeAnalytics,
        )
      : null
  // Fim do acesso (20/10/2026): presente de 7 dias (2 dias antes e no dia) e assinatura da
  // Comunidade que venceu (Kids e adulta). Mesmo quarteto + FUNNEL_URL; roda no mesmo ciclo.
  const accessEndedSender =
    authGateway && env.GATEWAY_URL && env.MEMBERS_HMAC_SECRET && env.FUNNEL_URL
      ? new SendAccessEndedMessagesService(
          new DrizzleRenewalReminderRepository(db),
          authGateway,
          createGatewayMessagingClient({
            gatewayUrl: env.GATEWAY_URL,
            consumerId: 'members',
            hmacSecret: env.MEMBERS_HMAC_SECRET,
          }),
          clock,
          logger,
          { funnelUrl: env.FUNNEL_URL, batchLimit: env.RENEWAL_REMINDER_BATCH_LIMIT },
        )
      : null
  const listMyCourses = new ListMyCoursesService(
    entitlements,
    courses,
    progress,
    positions,
    gamificationRepo,
    clock,
    kidsJourneyQuery,
    adultJourney,
  )
  const listCatalog = new ListCatalogService(
    courses,
    entitlements,
    gamificationRepo,
    clock,
    kidsJourneyQuery,
    adultJourney,
  )
  const getMyCourse = new GetMyCourseService(
    checkAccess,
    courses,
    progress,
    positions,
    ratings,
    gamificationRepo,
  )
  // "Como fazer": coleções e tutoriais da biblioteca de ajuda do Kids. O Zappy pesquisa os
  // tutoriais publicados pelo MESMO serviço (é a mesma linha que o admin publica).
  const help = new HelpService(
    new DrizzleHelpCollectionRepository(db),
    new DrizzleHelpTutorialRepository(db),
    clock,
  )
  const adultHelp = new HelpService(
    new DrizzleHelpCollectionRepository(db, 'adult'),
    new DrizzleHelpTutorialRepository(db, 'adult'),
    clock,
  )

  let liveMedia: CloudflareSfuMediaProvider | undefined
  let liveRecording: OwnRecordingProvider | undefined
  let stopLiveRecording: (() => Promise<void>) | undefined
  const liveRepository = new DrizzleLiveRepository(db)
  const liveMaterials = new LiveMaterialsService(new DrizzleLiveMaterialsRepository(db), clock)
  const liveConfigurationComplete = Boolean(
    env.LIVE_SFU_APP_ID &&
      env.LIVE_SFU_APP_SECRET &&
      env.LIVE_TURN_KEY_ID &&
      env.LIVE_TURN_API_TOKEN &&
      env.LIVE_SUPERVISOR_URL &&
      env.LIVE_SUPERVISOR_TOKEN &&
      env.LIVE_RECORDER_URL &&
      env.LIVE_RECORDER_TOKEN,
  )
  if (env.LIVE_MEDIA_READY && !liveConfigurationComplete)
    throw new Error('LIVE_MEDIA_READY exige SFU, TURN, supervisor e gravador configurados.')
  // As recompensas dos encontros dependem da gamificação, montada mais abaixo: o LiveService
  // recebe um delegado que passa a valer quando ela existe (antes disso, nada a premiar).
  let liveRewardsImpl: LiveRewardsPort | undefined
  const liveService = new LiveService(
    liveRepository,
    clock,
    new LiveProfileOwnershipGateway({
      baseUrl: env.AUTH_BASE_URL,
      internalToken: env.AUTH_INTERNAL_TOKEN,
      timeoutMs: env.AUTH_REQUEST_TIMEOUT_MS,
    }),
    {
      mediaReady: env.LIVE_MEDIA_READY,
      async onPermissionsChanged(occurrenceId) {
        // Media revocation must be prompt and is awaited. The recorder is NOT: a slow or
        // unreachable recorder must not hold a teacher's command or a child's join (the
        // recording loop retries it with its own backoff).
        void liveRecording
          ?.syncOccurrence(occurrenceId)
          .catch(() => logger.warn('live_recording.sync_deferred', { occurrenceId }))
        await liveMedia?.reconcile(occurrenceId)
      },
      // Cohorts of LIVE courses: the course, its published lessons, parts and Studio blocks.
      courses: new DrizzleLiveCourseRepository(db),
      recordingBucket: env.LIVE_RECORDING_BUCKET,
      // Chapters of a published recording come from the segment timeline of the recorder.
      async recordingTimeline(occurrenceId) {
        return (await liveRecording?.timeline(occurrenceId)) ?? null
      },
      liveRewards: {
        encounterAttended: (input) =>
          liveRewardsImpl?.encounterAttended(input) ?? Promise.resolve(),
      },
      onRewardsError(error) {
        logger.warn('live.rewards_failed', { error: serializeError(error) })
      },
    },
  )
  if (liveConfigurationComplete) {
    liveMedia = createLiveMediaInfrastructure({
      db,
      live: liveService,
      config: {
        appId: env.LIVE_SFU_APP_ID!,
        appSecret: env.LIVE_SFU_APP_SECRET!,
        turnKeyId: env.LIVE_TURN_KEY_ID!,
        turnApiToken: env.LIVE_TURN_API_TOKEN!,
        supervisorUrl: env.LIVE_SUPERVISOR_URL!,
        supervisorToken: env.LIVE_SUPERVISOR_TOKEN!,
      },
    })
    liveRecording = new OwnRecordingProvider(db, liveRepository, liveService, {
      url: env.LIVE_RECORDER_URL!,
      token: env.LIVE_RECORDER_TOKEN!,
    })
  }
  const liveWorkspace = new LiveWorkspaceService(
    new DrizzleLiveWorkspaceRepository(db),
    liveService,
    clock,
    {
      // Without a configured recorder nothing can be recording: help is never blocked by it.
      async confirmPaused(occurrenceId) {
        await liveRecording?.confirmPaused(occurrenceId)
      },
    },
    {
      async canContinue(accountId) {
        return (await accessCheck.execute(accountId, [])).communities.includes('estudio-completo')
      },
    },
  )
  const livePublication = new LivePublicationService(liveWorkspace, env.INTERNAL_API_TOKEN, clock)
  const zappyKnowledge = new ZappyKnowledgeService(
    new DrizzleZappyKnowledgeRepository(db),
    listMyCourses,
    getMyCourse,
    clock,
    help,
    adultHelp,
  )
  const teacherThreads = new TeacherThreadsService(new DrizzleTeacherThreadRepository(db), clock)
  const teacherBroadcasts = new TeacherBroadcastsService(
    new DrizzleTeacherBroadcastRepository(db),
    teacherRecipientDirectory(
      env.AUTH_BASE_URL ?? 'http://localhost:3002',
      env.AUTH_INTERNAL_TOKEN,
    ),
    courses,
    entitlements,
    checkAccess,
    clock,
  )
  const avatarRepo = new DrizzleAvatarRepository(db)
  const roomRepo = new DrizzleRoomRepository(db)
  const preferencesRepository = new DrizzleProfilePreferencesRepository(db)
  const preferences = new ProfilePreferencesService(preferencesRepository, clock)
  // "Guardado na sua conta" (índice das criações do Estúdio Completo/Pinta; blob no R2 via BFF).
  // Nasce aqui porque o "envio em dia" das seções lê os rascunhos da fase.
  const creationsRepo = new DrizzleCreationsRepository(db)
  const awardGamification = new AwardGamificationService(gamificationRepo, clock, logger)
  const studioBindings = new DrizzleStudioLessonBindingRepository(db)
  const pythonProjectChecker = new PythonProjectCheckerService({
    runtimeUrl: env.STUDIO_PYTHON_RUNTIME_URL,
    runtimeToken: env.STUDIO_PYTHON_RUNTIME_TOKEN,
    policy: studioRuntimePolicy,
    cleanupFailed: () => logger.warn('studio.python_activity.cleanup_failed'),
  })
  const sectionProgression = new SectionProgressionService(
    learningRepository,
    progress,
    quizAttempts,
    studioSubmissions,
    clock,
    new PlatformActionService(avatarRepo, roomRepo, preferencesRepository),
    certificates,
    creationsRepo,
    async (courseId) => (await courses.findCourseById(courseId))?.modality ?? 'recorded',
    awardGamification,
    projectExecutor,
    async (courseId) => (await courses.findCourseById(courseId))?.audience ?? 'kids',
    { checker: pythonProjectChecker, bindings: studioBindings, live: liveWorkspace },
  )
  const learning = new LearningService(
    learningRepository,
    courses,
    checkAccess,
    progress,
    clock,
    teacherThreads,
    sectionProgression,
  )
  const getLesson = new GetLessonService(
    checkAccess,
    courses,
    progress,
    positions,
    quizAttempts,
    studioSubmissions,
    clock,
    learning,
  )
  const resolveAttachment = new GetAttachmentDownloadService(checkAccess, courses, progress)
  const recordMaterialDownload = new RecordMaterialDownloadService(
    resolveAttachment,
    courses,
    learningRepository,
    sectionProgression,
    clock,
  )
  const resolveEbook = new GetEbookDownloadService(
    checkAccess,
    courses,
    progress,
    sectionProgression,
  )
  liveRewardsImpl = new LiveRewardsService(awardGamification)
  const adultProfileRepository = new DrizzleAdultProfileRepository(db)
  const adultProfile = new AdultProfileService(
    adultProfileRepository,
    clock,
    avatarRepo,
    adultJourney,
  )
  const getGamification = new GetGamificationService(
    gamificationRepo,
    clock,
    kidsJourneyQuery,
    kidsJourneyProfiles,
    adultJourney,
  )
  const getAvatar = new GetAvatarService(avatarRepo, gamificationRepo)
  const getAvatarsByProfiles = new GetAvatarsByProfilesService(
    avatarRepo,
    gamificationRepo,
    kidsJourneyProfiles,
  )
  const ranking = new ListRankingService(gamificationRepo, getAvatarsByProfiles, clock)
  const getRankingLeaderboard = new GetRankingLeaderboardService(
    gamificationRepo,
    ranking,
    clock,
    authGateway,
    new EncryptedRankingCursorCodec(env.GATEWAY_HMAC_SECRET),
    adultProfileRepository,
    adultJourney,
  )
  const buyAvatarPart = new BuyAvatarPartService(
    avatarRepo,
    gamificationRepo,
    awardGamification,
    clock,
  )
  const equipAvatar = new EquipAvatarService(avatarRepo, clock)
  const setAvatarPhoto = new SetAvatarPhotoService(avatarRepo, clock, env.AVATAR_PHOTO_URL_PREFIXES)
  const getRoom = new GetRoomService(roomRepo, gamificationRepo)
  const saveRoom = new SaveRoomService(roomRepo, clock, logger)
  const buyRoomItem = new BuyRoomItemService(roomRepo, gamificationRepo, awardGamification, clock)
  const getPublicProfile = new GetPublicProfileService(
    gamificationRepo,
    avatarRepo,
    roomRepo,
    hub,
    clock,
    kidsJourneyProfiles,
    adultProfileRepository,
    adultJourney,
  )
  const getChallenge = new GetChallengeService(gamificationRepo, challengeConfigRepo, clock)
  const challengeAdmin = new ChallengeAdminService(challengeConfigRepo, clock)
  // A missão das oficinas ao vivo (`live_encounter`) entra só para quem tem vaga ativa.
  const getMissions = new GetMissionsService(
    gamificationRepo,
    accessCheck,
    clock,
    listMyCourses,
    kidsJourneyQuery,
    liveLessonAccess,
    adultJourney,
    hub,
  )
  const claimMission = new ClaimMissionService(
    gamificationRepo,
    accessCheck,
    clock,
    liveLessonAccess,
    getMissions,
  )
  // Baú de fim de unidade: a criança clica na trilha e AÍ ganha o XP (antes ele caía
  // sozinho ao concluir a última aula do módulo).
  const claimUnitChest = new ClaimUnitChestService(
    checkAccess,
    courses,
    progress,
    awardGamification,
  )
  // Remix do Mural (marco de missão gated) — valida posse + playId no hub (anti-farm).
  const recordRemix = new RecordStudioRemixService(
    accessCheck,
    hub,
    awardGamification,
    adultJourney,
  )
  // XP diário de CRIAR no Estúdio (sem hub/playId — só posse + award do dia).
  const recordStudioActivity = new RecordStudioActivityDayService(
    accessCheck,
    awardGamification,
    adultJourney,
  )
  const buyStreakFreeze = new BuyStreakFreezeService(gamificationRepo, () => randomUUID(), clock)
  const setVacation = new SetVacationService(gamificationRepo, clock)
  const getLeague = new GetLeagueService(
    gamificationRepo,
    clock,
    getAvatarsByProfiles,
    authGateway,
    adultProfileRepository,
    adultJourney,
  )
  const markComplete = new MarkLessonCompleteService(
    checkAccess,
    courses,
    progress,
    quizAttempts,
    studioSubmissions,
    awardGamification,
    clock,
    learning,
  )
  const getProgress = new GetCourseProgressService(checkAccess, courses, progress)
  const savePosition = new SaveVideoPositionService(
    checkAccess,
    courses,
    progress,
    positions,
    clock,
  )
  const getCourseRating = new GetCourseRatingService(checkAccess, ratings)
  const saveCourseRating = new SaveCourseRatingService(
    checkAccess,
    ratings,
    awardGamification,
    clock,
  )
  const submitQuiz = new SubmitQuizAttemptService(
    checkAccess,
    courses,
    progress,
    quizAttempts,
    awardGamification,
    () => randomUUID(),
    clock,
    sectionProgression,
  )
  // Antes do submitStudio: o envio espelha o recado do aluno na conversa (histórico).
  const submitStudio = new SubmitStudioProjectService(
    checkAccess,
    courses,
    progress,
    studioSubmissions,
    awardGamification,
    teacherThreads,
    logger,
    () => randomUUID(),
    clock,
    sectionProgression,
    studioBindings,
  )
  const getStudioCarryover = new GetStudioCarryoverService(
    checkAccess,
    courses,
    progress,
    studioSubmissions,
    sectionProgression,
    studioBindings,
  )
  const openLessonStudio = new OpenLessonStudioService(
    new LessonDraftAccessService(courses, checkAccess, progress, sectionProgression),
    courses,
    studioBindings,
  )
  const getOwnStudioSubmission = new GetOwnStudioSubmissionService(
    checkAccess,
    courses,
    progress,
    studioSubmissions,
    sectionProgression,
  )
  const getShowcasePayload = new GetShowcasePayloadService(
    checkAccess,
    courses,
    progress,
    studioSubmissions,
    sectionProgression,
  )
  const studioSubmissionsAdmin = new StudioSubmissionsAdminService(studioSubmissions, clock)
  const getCertificate = new GetCertificateService(
    checkAccess,
    courses,
    progress,
    certificates,
    sectionProgression,
  )
  const issueCertificate = new IssueCertificateService(
    checkAccess,
    courses,
    progress,
    certificates,
    awardGamification,
    clock,
    learningRepository,
    sectionProgression,
  )
  const validateCertificate = new ValidateCertificateService(certificates)
  const revokeCertificate = new RevokeCertificateService(certificates, clock)

  // Pensa (planejador de jogos — plano + Cartões de Criação + progresso externo)
  const adultCreationsRepo = new DrizzleCreationsRepository(db, 'adult')
  const listCreations = new ListCreationsService(creationsRepo)
  const reserveCreationUpload = new ReserveCreationUploadService(
    creationsRepo,
    accessCheck,
    clock,
    new LessonDraftAccessService(courses, checkAccess, progress, sectionProgression),
  )
  const commitCreationUpload = new CommitCreationUploadService(creationsRepo, clock)
  const getCreationDownload = new GetCreationDownloadService(creationsRepo)
  const deleteCreation = new DeleteCreationService(creationsRepo, clock)
  // One project aggregate: accepted definition, functional plan and team progress.
  const pensaRepo = new DrizzlePensaProjectRepository(db, clock)
  const pensaCommands = new DrizzlePensaProjectCommands(pensaRepo, {
    dailyLimit: env.AI_LIMIT_DAILY,
    monthlyLimit: env.AI_LIMIT_MONTHLY,
  })
  const pensaProjects = new PensaProjectService(pensaCommands)
  const pensaOperations = new DrizzlePensaOperationsRepository(pensaCommands, {
    dailyLimit: env.AI_LIMIT_DAILY,
    monthlyLimit: env.AI_LIMIT_MONTHLY,
  })
  const pensaCheckpoints = new DrizzlePensaCheckpointsRepository(pensaRepo)
  const pensaNarrations = new DrizzlePensaNarrationsRepository(pensaRepo)
  const pensaTeam = new PensaTeamService(
    new DrizzlePensaTeamRepository({
      projects: pensaCommands,
      authGateway,
      avatars: getAvatarsByProfiles,
      accessCheck,
      gamification: getGamification,
      studioUnlocks: getStudioUnlocks,
      creations: creationsRepo,
      creationDownload: getCreationDownload,
      adultProfiles: adultProfileRepository,
      adultCreations: adultCreationsRepo,
      adultCreationDownload: new GetCreationDownloadService(adultCreationsRepo),
    }),
  )
  const compactCreationTombstones = new CompactCreationTombstonesService(creationsRepo, clock)

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
  const courseAdmin = new CourseAdminService(content, courses, async () =>
    Boolean((await kidsJourneyConfiguration.policy()).policy.curriculum),
  )
  const moduleAdmin = new ModuleAdminService(content, courses)
  const lessonAdmin = new LessonAdminService(content, courses, learning)

  // Gestão admin (painel)
  const listMembers = new ListMembersService(entitlements, clock)
  const getMemberDetail = new GetMemberDetailService(entitlements, courses, progress, positions)
  // Uso por ferramenta (ficha admin) — hub best-effort (noop sem HUB_BASE_URL → cartões null).
  const toolUsage = new DrizzleToolUsageRepository(db)
  const getMemberToolUsage = new GetMemberToolUsageService(toolUsage, hub)
  const profilesOverview = new GetProfilesOverviewService(
    gamificationRepo,
    studioSubmissions,
    clock,
    kidsJourneyProfiles,
  )
  const getMemberActivity = new GetMemberActivityService(
    progress,
    positions,
    quizAttempts,
    studioSubmissions,
  )
  const listMemberCertificates = new ListMemberCertificatesService(certificates)
  const listMemberRatings = new ListMemberRatingsService(ratings)
  const analytics = new GetCourseAnalyticsService(new DrizzleAnalyticsRepository(db))
  const grantManual = new GrantManualEntitlementService({
    catalog,
    courses,
    entitlements,
    newId: () => randomUUID(),
    clock,
    logger,
  })
  const manageEntitlement = new ManageEntitlementService(entitlements, clock)
  // Exclusão de usuário (painel): purga TODOS os dados do aluno em transação.
  const userDataPurgeRepository = new DrizzleUserDataPurgeRepository(db)
  const purgeUserData = new PurgeUserDataService(userDataPurgeRepository)
  const creationCleanup = new CreationCleanupService(
    new DrizzleCreationCleanupRepository(db),
    clock,
  )

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

  const studioDrafts = new DrizzleLessonDraftRepository(
    db,
    parsePublishedLessonBlock,
    studioAuthoringPolicy,
  )
  const authorizeAuthoringRuntime = new AuthorizeAuthoringRuntimeService(
    studioDrafts,
    studioRuntimePolicy,
  )
  const authorizeLessonRuntime = new AuthorizeLessonRuntimeService(
    openLessonStudio,
    studioRuntimePolicy,
  )
  const authorizeLiveRuntime = new AuthorizeLiveRuntimeService(
    liveWorkspace,
    studioRuntimePolicy,
    () => clock().getTime(),
  )
  const server = createServer({
    liveMaterials,
    livePublication,
    liveBenefits,
    liveWorkspace,
    publicRuntime: new AuthorizePublicRuntimeService(studioRuntimePolicy),
    pythonAnalysis: new AuthorizePythonAnalysisService({
      authoring: authorizeAuthoringRuntime,
      lesson: authorizeLessonRuntime,
      free: authorizeFreeRuntime,
      live: authorizeLiveRuntime,
    }),
    livePublicationRuntime: new AuthorizeLivePublicationRuntimeService(
      liveWorkspace,
      studioRuntimePolicy,
      () => clock().getTime(),
    ),
    liveRuntime: authorizeLiveRuntime,
    liveMedia,
    liveRecording,
    learning: {
      gallery: new GalleryDeliveryService(
        courses,
        checkAccess,
        progress,
        sectionProgression,
        creationsRepo,
        studioSubmissions,
        submitStudio,
        new DrizzleGalleryCopyRepository(db),
        new StudioGallerySourceService({
          storageBaseURL: env.STUDIO_GALLERY_STORAGE_BASE_URL,
          allowLoopbackHttp: env.NODE_ENV !== 'production',
        }),
      ),
      preferences,
      learning,
      imports: new LearningImportService(studioDrafts, courses),
      drafts: studioDrafts,
      authorizeStudioRuntime: authorizeAuthoringRuntime,
      internalToken: env.INTERNAL_API_TOKEN,
      requireAdminEnabled: env.REQUIRE_ADMIN,
    },
    env,
    logger,
    accountDeletionFence: userDataPurgeRepository,
    readiness,
    members: {
      adultJourney,
      listMyCourses,
      listCatalog,
      accessCheck,
      getMyCourse,
      getLesson,
      resolveAttachment,
      recordMaterialDownload,
      resolveEbook,
      markComplete,
      getProgress,
      savePosition,
      submitQuiz,
      submitStudio,
      getStudioCarryover,
      openLessonStudio,
      authorizeLessonRuntime,
      getOwnStudioSubmission,
      teacherThreads,
      getShowcasePayload,
      getCertificate,
      issueCertificate,
      getCourseRating,
      saveCourseRating,
      getGamification,
      getChallenge,
      getStudioUnlocks,
      authorizeFreeRuntime,
      getMissions,
      claimMission,
      claimUnitChest,
      recordRemix,
      recordStudioActivity,
      buyStreakFreeze,
      setVacation,
      getLeague,
      getRankingLeaderboard,
      childrenStats,
      parentReportPrefs,
      getAvatar,
      buyAvatarPart,
      equipAvatar,
      setAvatarPhoto,
      getAvatarsByProfiles,
      getPublicProfile,
      getRoom,
      saveRoom,
      buyRoomItem,
      profileAllowance,
      consumeAiUsage,
      studioAiAccount,
      studioAiUsage,
      studioBuilder,
      aiCredits,
      zappy,
      zappyKnowledge,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    pensa: {
      adultJourney,
      store: pensaRepo,
      projects: pensaProjects,
      team: pensaTeam,
      operations: pensaOperations,
      checkpoints: pensaCheckpoints,
      narrations: pensaNarrations,
      rewards: new DrizzlePensaRewardsRepository(
        db,
        (tx) =>
          new AwardGamificationService(
            { award: (input) => gamificationRepo.awardInTransaction(tx, input) },
            clock,
            logger,
          ),
      ),
      accessCheck,
      getGamification,
      credits: aiCredits,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    adultProfiles: { service: adultProfile, internalToken: env.INTERNAL_API_TOKEN },
    kidsJourney: {
      service: kidsJourneyConfiguration,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    kidsProfileAdmission: {
      service: kidsProfileAdmission,
      admissionToken: env.MEMBERS_PROFILE_ADMISSION_TOKEN,
    },
    adultJourney: {
      service: adultJourney,
      profiles: adultProfile,
      internalToken: env.INTERNAL_API_TOKEN,
      requireAdminEnabled: env.REQUIRE_ADMIN,
    },
    masteries: {
      service: masteries,
      runtime: new AuthorizeMasteryReviewRuntimeService(
        masteryRepository,
        studioRuntimePolicy,
        Date.now,
        new StudioGallerySourceService({
          storageBaseURL: env.STUDIO_GALLERY_STORAGE_BASE_URL,
          allowLoopbackHttp: env.NODE_ENV !== 'production',
        }),
      ),
      internalToken: env.INTERNAL_API_TOKEN,
    },
    creations: {
      adult: {
        list: new ListCreationsService(adultCreationsRepo),
        reserveUpload: new ReserveCreationUploadService(
          adultCreationsRepo,
          accessCheck,
          clock,
          new LessonDraftAccessService(courses, checkAccess, progress, sectionProgression),
          adultJourney,
        ),
        commitUpload: new CommitCreationUploadService(adultCreationsRepo, clock),
        getDownload: new GetCreationDownloadService(adultCreationsRepo),
        remove: new DeleteCreationService(adultCreationsRepo, clock),
      },
      list: listCreations,
      reserveUpload: reserveCreationUpload,
      commitUpload: commitCreationUpload,
      getDownload: getCreationDownload,
      remove: deleteCreation,
      compactTombstones: compactCreationTombstones,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    webhooks: {
      grant,
      grantManual,
      revoke,
      processed,
      hub,
      award: awardGamification,
      teacherThreads,
      webhookSecret: env.GATEWAY_HMAC_SECRET,
      toleranceSeconds: env.HMAC_TOLERANCE_SECONDS,
      now: clock,
      logger,
    },
    admin: {
      teacherBroadcasts,
      requireAdminEnabled: env.REQUIRE_ADMIN,
      internalToken: env.INTERNAL_API_TOKEN,
      listMembers,
      getMemberDetail,
      getMemberToolUsage,
      profilesOverview,
      getMemberActivity,
      listMemberCertificates,
      listMemberRatings,
      getGamification,
      ranking,
      analytics,
      aiUsageStats,
      pensaFunnel,
      grantManual,
      manageEntitlement,
      teacherThreads,
      challengeAdmin,
      revokeCertificate,
      purgeUserData,
      creationCleanup,
      hub,
    },
    content: {
      requireAdminEnabled: env.REQUIRE_ADMIN,
      internalToken: env.INTERNAL_API_TOKEN,
      studioAuthoringPolicy,
      courses: courseAdmin,
      modules: moduleAdmin,
      lessons: lessonAdmin,
      studioSubmissions: studioSubmissionsAdmin,
      zappyKnowledge,
      zappyHistory: zappy,
    },
    internal: {
      purgeUserData,
      accessCheck,
      profileAllowance,
      showcasePayload: getShowcasePayload,
      validateCertificate,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    adultHelp: {
      help: adultHelp,
      internalToken: env.INTERNAL_API_TOKEN,
      requireAdminEnabled: true,
    },
    help: {
      help,
      internalToken: env.INTERNAL_API_TOKEN,
      requireAdminEnabled: env.REQUIRE_ADMIN,
    },
    live: {
      live: liveService,
      internalToken: env.INTERNAL_API_TOKEN,
      requireAdminEnabled: env.REQUIRE_ADMIN,
    },
    liveCourse: {
      teacherNotes: new LiveTeacherNotesService(courses, learningRepository, liveLessonAccess),
      internalToken: env.INTERNAL_API_TOKEN,
      requireAdminEnabled: env.REQUIRE_ADMIN,
    },
  })

  let cleanupTimer: ReturnType<typeof setInterval> | null = null
  let broadcastTimer: ReturnType<typeof setInterval> | null = null
  let broadcastCycle: Promise<unknown> | null = null
  let parentReportTimer: ReturnType<typeof setInterval> | null = null
  let renewalReminderTimer: ReturnType<typeof setInterval> | null = null
  let renewalReminderCycle: Promise<void> | null = null
  let retentionCycle: Promise<void> | null = null
  let bootCycleTimer: ReturnType<typeof setTimeout> | null = null
  let bootCycle: Promise<void> | null = null
  // Live deadlines (end overdue calls, cancel encounters that never happened) run in their own
  // loop: independent of the recorder and of whether live media is configured at all.
  let liveDeadlineTimer: ReturnType<typeof setInterval> | null = null
  let liveDeadlineCycle: Promise<void> | null = null
  // Seed automático da jornada adulta (decisão da dona, 20/10/2026): uma vez por boot, sem
  // bloquear a subida; só grava quando ainda não há política e nunca sobrescreve.
  let adultJourneySeed: Promise<unknown> | null = null

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
      const zappyConversations = await zappy.pruneExpired()
      if (pruned > 0 || zappyConversations > 0) {
        logger.info('retention.pruned', { processedWebhooks: pruned, zappyConversations })
      }
      // ⭐ Varredura de matrículas VENCIDAS pega uma carona aqui de propósito: é o
      // único ciclo periódico do serviço que só faz trabalho de BANCO, então o
      // advisory lock (que morre com a transação) serve sem risco de
      // `idle in transaction`. Sem isso a coluna `status` fica `'active'` para
      // sempre depois da validade passar — e foi o que fez o painel dizer "Ativo"
      // sobre um acesso cortado no incidente de 08/2026.
      const expired = await entitlements.expireLapsed(new Date(), env.EXPIRE_LAPSED_BATCH_SIZE)
      if (expired > 0) logger.info('entitlements.expired_lapsed', { affected: expired })
    })
  }

  // Report SEMANAL dos pais: ciclo horário sob advisory lock PRÓPRIO (1 réplica).
  // O lock cobre a duração do CICLO inteiro (a transação fica aberta enquanto o
  // sender roda) — dois ciclos concorrentes não disputam contas; o dedupe do
  // messaging por idempotencyKey é o backstop.
  const runParentReportCycle = async () => {
    if (!parentReportSender) return
    await connection.sql.begin(async (gate) => {
      const [row] = await gate`
        select pg_try_advisory_xact_lock(${PARENT_REPORT_ADVISORY_LOCK_KEY}::bigint) as locked
      `
      if (!row?.locked) return // outra réplica está enviando neste ciclo
      await parentReportSender.runCycle()
    })
  }

  // Renovação anual + ciclo do Desafio + fim do acesso: um advisory lock cobre os envios. Lock de
  // SESSÃO numa conexão reservada (não xact): os senders fazem HTTP (Auth, Messaging) e uma
  // transação-portão ficaria `idle in transaction`, derrubada pelo timeout de 30 s do pool.
  const runRenewalReminderCycle = async () => {
    if (!renewalReminderSender && !challengeLifecycleSender && !accessEndedSender) return
    // `false` = outra réplica (ou um ciclo anterior desta) está enviando agora.
    await withSessionAdvisoryLock(connection.sql, RENEWAL_REMINDER_ADVISORY_LOCK_KEY, async () => {
      await renewalReminderSender?.runCycle()
      await challengeLifecycleSender?.runCycle()
      await accessEndedSender?.runCycle()
    })
  }
  const hasLifecycleSenders = Boolean(
    renewalReminderSender || challengeLifecycleSender || accessEndedSender,
  )

  // Disparos sem lançar, um por vez nesta réplica (o boot e o timer podem coincidir); `stop()`
  // espera o que estiver em voo antes de fechar a conexão.
  const retentionSafely = (): Promise<void> => {
    retentionCycle ??= runRetentionCycle()
      .catch((error) =>
        logger.error('retention.cleanup.failed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      )
      .finally(() => {
        retentionCycle = null
      })
    return retentionCycle
  }
  const renewalReminderSafely = (): Promise<void> => {
    renewalReminderCycle ??= runRenewalReminderCycle()
      .catch((error) =>
        logger.error('entitlement_lifecycle.cycle_failed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      )
      .finally(() => {
        renewalReminderCycle = null
      })
    return renewalReminderCycle
  }

  return {
    logger,
    async start() {
      if (studioBuilder.executionAvailable || studioBuilder.adultExecutionAvailable)
        studioBuilderCoordinator.start()
      stopLiveRecording = liveRecording?.start()
      adultJourneySeed = runAdultJourneySeedOnce({
        service: adultJourney,
        listCourses: () => courses.listPublishedCourses('adult'),
        listShowcaseCourseIds: (ids) => content.listCourseIdsWithShowcaseBlock([...ids]),
        logger,
      })
      liveDeadlineTimer = setInterval(() => {
        if (liveDeadlineCycle) return
        liveDeadlineCycle = liveService
          .reconcileDeadlines()
          .catch((error) =>
            logger.error('live.deadline_sweep_failed', {
              error: error instanceof Error ? error.message : String(error),
            }),
          )
          .finally(() => {
            liveDeadlineCycle = null
          })
      }, 5000)
      const deliverRecados = () => {
        if (broadcastCycle) return
        broadcastCycle = teacherBroadcasts
          .runCycle()
          .catch((error) =>
            logger.error('teacher_broadcast.cycle_failed', { error: String(error) }),
          )
          .finally(() => {
            broadcastCycle = null
          })
      }
      deliverRecados()
      broadcastTimer = setInterval(deliverRecados, 5000)
      cleanupTimer = setInterval(() => void retentionSafely(), env.RETENTION_CLEANUP_INTERVAL_MS)
      if (parentReportSender) {
        parentReportTimer = setInterval(() => {
          void runParentReportCycle().catch((error) =>
            logger.error('parent_report.cycle_failed', {
              error: error instanceof Error ? error.message : String(error),
            }),
          )
        }, env.PARENT_REPORT_INTERVAL_MS)
      }
      if (hasLifecycleSenders) {
        renewalReminderTimer = setInterval(
          () => void renewalReminderSafely(),
          env.RENEWAL_REMINDER_INTERVAL_MS,
        )
      }
      // Um ciclo logo depois do boot, sem bloquear a subida e sob os MESMOS locks: primeiro a
      // retenção (o `expireLapsed` marca as assinaturas vencidas), depois os avisos, que leem
      // esse `expired`. Deploys mais frequentes que o intervalo não deixam e-mail para trás.
      bootCycleTimer = setTimeout(() => {
        bootCycleTimer = null
        bootCycle = (async () => {
          await retentionSafely()
          if (hasLifecycleSenders) await renewalReminderSafely()
        })().finally(() => {
          bootCycle = null
        })
      }, BOOT_CYCLE_DELAY_MS)
      // `::` = dual-stack (IPv4+IPv6) — necessário p/ o private networking do
      // Railway (`members.railway.internal` resolve IPv6).
      // O Bun fecha a conexão depois de `idleTimeout` sem bytes, INCLUSIVE com a resposta ainda
      // sendo preparada (padrão 10 s). O teste dos objetivos que rodam o jogo espera o
      // studio-runtime (até 150 s): sem a folga, o gateway via a conexão cair no meio.
      server.listen({ port: env.PORT, hostname: env.HOST, idleTimeout: 170 })
      logger.info('http.listening', { port: env.PORT, host: env.HOST })
    },
    async stop() {
      // Timers primeiro: nenhum ciclo novo começa enquanto o resto desliga.
      if (liveDeadlineTimer) clearInterval(liveDeadlineTimer)
      if (broadcastTimer) clearInterval(broadcastTimer)
      if (cleanupTimer) clearInterval(cleanupTimer)
      if (parentReportTimer) clearInterval(parentReportTimer)
      if (renewalReminderTimer) clearInterval(renewalReminderTimer)
      if (bootCycleTimer) clearTimeout(bootCycleTimer)
      await studioBuilderCoordinator.stop()
      await stopLiveRecording?.()
      if (adultJourneySeed) await adultJourneySeed
      if (liveDeadlineCycle) await liveDeadlineCycle
      if (broadcastCycle) await broadcastCycle
      if (bootCycle) await bootCycle
      if (retentionCycle) await retentionCycle
      if (renewalReminderCycle) await renewalReminderCycle
      await server.stop()
      await connection.close()
      logger.info('app.stopped')
    },
  }
}

import { GalleryDeliveryService } from './application/learning/gallery-delivery.service'
import { PlatformActionService } from './application/learning/platform-action.service'
import { StudioGallerySourceService } from './application/learning/studio-gallery-source.service'
import { ProfilePreferencesService } from './application/profile-preferences/profile-preferences.service'
import { DrizzleProfilePreferencesRepository } from './infrastructure/persistence/drizzle/profile-preferences.repository'
