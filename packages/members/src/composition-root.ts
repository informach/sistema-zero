import { randomUUID } from 'node:crypto'
import { createLogger, type Logger } from '@sistemazero/core/logging'
import { CheckAccessService } from './application/access/check-access.service'
import { AccessCheckService } from './application/access-check/access-check.service'
import { CreationCleanupService } from './application/admin/creation-cleanup/creation-cleanup.service'
import { PurgeUserDataService } from './application/admin/purge-user-data/purge-user-data.service'
import { ConsumeAiUsageService } from './application/ai-usage/consume-ai-usage.service'
import { GetAiCreditsService } from './application/ai-usage/get-ai-credits.service'
import { GetAiUsageStatsService } from './application/ai-usage/get-ai-usage-stats.service'
import { GetCourseAnalyticsService } from './application/analytics/get-course-analytics.service'
import { BuyAvatarPartService } from './application/avatar/buy-avatar-part.service'
import { EquipAvatarService } from './application/avatar/equip-avatar.service'
import { GetAvatarService } from './application/avatar/get-avatar.service'
import { GetAvatarsByProfilesService } from './application/avatar/get-avatars-by-profiles.service'
import { SetAvatarPhotoService } from './application/avatar/set-avatar-photo.service'
import { GetChildrenStatsService } from './application/children-stats/get-children-stats.service'
import {
  AttachmentAdminService,
  BlockAdminService,
  CourseAdminService,
  LessonAdminService,
  ModuleAdminService,
} from './application/content-admin/content-admin.service'
import {
  CommitCreationUploadService,
  DeleteCreationService,
  GetCreationDownloadService,
  ListCreationsService,
  ReserveCreationUploadService,
} from './application/creations/creations.service'
import { AwardGamificationService } from './application/gamification/award-gamification.service'
import { BuyStreakFreezeService } from './application/gamification/buy-streak-freeze.service'
import { ChallengeAdminService } from './application/gamification/challenge-admin.service'
import { ClaimMissionService } from './application/gamification/claim-mission.service'
import { GetChallengeService } from './application/gamification/get-challenge.service'
import { GetGamificationService } from './application/gamification/get-gamification.service'
import { GetLeagueService } from './application/gamification/get-league.service'
import { GetMissionsService } from './application/gamification/get-missions.service'
import { RecordStudioActivityDayService } from './application/gamification/record-studio-activity-day.service'
import { RecordStudioRemixService } from './application/gamification/record-studio-remix.service'
import { SetVacationService } from './application/gamification/set-vacation.service'
import { GetAttachmentDownloadService } from './application/get-attachment-download/get-attachment-download.service'
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
import { IssueCertificateService } from './application/issue-certificate/issue-certificate.service'
import { ListCatalogService } from './application/list-catalog/list-catalog.service'
import { ListMemberCertificatesService } from './application/list-member-certificates/list-member-certificates.service'
import { ListMemberRatingsService } from './application/list-member-ratings/list-member-ratings.service'
import { ListMembersService } from './application/list-members/list-members.service'
import { ListMyCoursesService } from './application/list-my-courses/list-my-courses.service'
import { ManageEntitlementService } from './application/manage-entitlement/manage-entitlement.service'
import { MarkLessonCompleteService } from './application/mark-lesson-complete/mark-lesson-complete.service'
import { ParentReportPrefsService } from './application/parent-report/report-prefs.service'
import { SendParentReportsService } from './application/parent-report/send-parent-reports.service'
import { AdvancePensaStageService } from './application/pensa/advance-stage.service'
import { AppendPensaConversationTurnService } from './application/pensa/append-conversation-turn.service'
import { AppendPensaTasksService } from './application/pensa/append-tasks.service'
import { CreatePensaCycleService } from './application/pensa/create-cycle.service'
import { CreatePensaProjectService } from './application/pensa/create-project.service'
import { DeletePensaTaskService } from './application/pensa/delete-task.service'
import { GetPensaProjectService } from './application/pensa/get-project.service'
import { GetPensaStageService } from './application/pensa/get-stage.service'
import { GetPensaTaskHandoffService } from './application/pensa/get-task-handoff.service'
import { ListPensaProjectsService } from './application/pensa/list-projects.service'
import { ReplacePensaTasksService } from './application/pensa/replace-tasks.service'
import { SavePensaArtifactService } from './application/pensa/save-artifact.service'
import { UpdatePensaProjectService } from './application/pensa/update-project.service'
import { UpdatePensaTaskService } from './application/pensa/update-task.service'
import { UpdatePensaTaskProgressService } from './application/pensa/update-task-progress.service'
import { ValidatePensaArtifactService } from './application/pensa/validate-artifact.service'
import { GetProfileAllowanceService } from './application/profile-allowance/get-profile-allowance.service'
import { GetPublicProfileService } from './application/profiles/get-public-profile.service'
import { SendRenewalRemindersService } from './application/renewal-reminder/send-renewal-reminders.service'
import { RevokeEntitlementService } from './application/revoke-entitlement/revoke-entitlement.service'
import { BuyRoomItemService } from './application/room/buy-room-item.service'
import { GetRoomService } from './application/room/get-room.service'
import { SaveRoomService } from './application/room/save-room.service'
import { SaveCourseRatingService } from './application/save-course-rating/save-course-rating.service'
import { SaveVideoPositionService } from './application/save-video-position/save-video-position.service'
import { StudioSubmissionsAdminService } from './application/studio-submissions-admin/studio-submissions-admin.service'
import { GetStudioUnlocksService } from './application/studio-unlocks/get-studio-unlocks.service'
import { SubmitQuizAttemptService } from './application/submit-quiz-attempt/submit-quiz-attempt.service'
import { SubmitStudioProjectService } from './application/submit-studio-project/submit-studio-project.service'
import { TeacherThreadsService } from './application/teacher-threads/teacher-threads.service'
import { GetMemberToolUsageService } from './application/tool-usage/get-member-tool-usage.service'
import {
  RevokeCertificateService,
  ValidateCertificateService,
} from './application/validate-certificate/validate-certificate.service'
import { ZappyHistoryService } from './application/zappy/zappy-history.service'
import { ZappyKnowledgeService } from './application/zappy/zappy-knowledge.service'
import type { Env } from './infrastructure/config/env'
import { createAuthHttpGateway } from './infrastructure/gateways/auth-http.gateway'
import { createCatalogHttpGateway } from './infrastructure/gateways/catalog-http.gateway'
import { createGatewayMessagingClient } from './infrastructure/gateways/gateway-messaging-client'
import { createHubHttpGateway, noopHubGateway } from './infrastructure/gateways/hub-http.gateway'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { DrizzleAiUsageRepository } from './infrastructure/persistence/drizzle/ai-usage.repository'
import { DrizzleAnalyticsRepository } from './infrastructure/persistence/drizzle/analytics.repository'
import { DrizzleAvatarRepository } from './infrastructure/persistence/drizzle/avatar.repository'
import { DrizzleCertificateRepository } from './infrastructure/persistence/drizzle/certificate.repository'
import { DrizzleChallengeConfigRepository } from './infrastructure/persistence/drizzle/challenge-config.repository'
import { DrizzleContentAdminRepository } from './infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from './infrastructure/persistence/drizzle/course.repository'
import { DrizzleCourseRatingRepository } from './infrastructure/persistence/drizzle/course-rating.repository'
import { DrizzleCreationCleanupRepository } from './infrastructure/persistence/drizzle/creation-cleanup.repository'
import { DrizzleCreationsRepository } from './infrastructure/persistence/drizzle/creations.repository'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleEntitlementRepository } from './infrastructure/persistence/drizzle/entitlement.repository'
import { DrizzleGamificationRepository } from './infrastructure/persistence/drizzle/gamification.repository'
import { DrizzleParentReportRepository } from './infrastructure/persistence/drizzle/parent-report.repository'
import { DrizzlePensaRepository } from './infrastructure/persistence/drizzle/pensa.repository'
import { DrizzleProcessedWebhookRepository } from './infrastructure/persistence/drizzle/processed-webhook.repository'
import { DrizzleProgressRepository } from './infrastructure/persistence/drizzle/progress.repository'
import { DrizzleQuizAttemptRepository } from './infrastructure/persistence/drizzle/quiz-attempt.repository'
import { DrizzleRenewalReminderRepository } from './infrastructure/persistence/drizzle/renewal-reminder.repository'
import { DrizzleRoomRepository } from './infrastructure/persistence/drizzle/room.repository'
import { DrizzleStudioSubmissionRepository } from './infrastructure/persistence/drizzle/studio-submission.repository'
import { DrizzleStudioUnlockRepository } from './infrastructure/persistence/drizzle/studio-unlock.repository'
import { DrizzleTeacherThreadRepository } from './infrastructure/persistence/drizzle/teacher-thread.repository'
import { DrizzleToolUsageRepository } from './infrastructure/persistence/drizzle/tool-usage.repository'
import { DrizzleUserDataPurgeRepository } from './infrastructure/persistence/drizzle/user-data-purge.repository'
import { DrizzleVideoPositionRepository } from './infrastructure/persistence/drizzle/video-position.repository'
import { DrizzleZappyRepository } from './infrastructure/persistence/drizzle/zappy.repository'
import { DrizzleZappyKnowledgeRepository } from './infrastructure/persistence/drizzle/zappy-knowledge.repository'
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
 * compartilhado). Só UMA réplica envia por ciclo.
 */
const RENEWAL_REMINDER_ADVISORY_LOCK_KEY = '30792292938117749'

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

  // Casos de uso do aluno
  const checkAccess = new CheckAccessService(courses, entitlements, gamificationRepo, clock)
  // S2S: resolução de acesso em lote (consumido pela comunidade @sistemazero/hub).
  const accessCheck = new AccessCheckService(entitlements, clock)
  // S2S: teto de perfis kids da conta (consumido pelo `auth` ao criar perfil).
  const profileAllowance = new GetProfileAllowanceService(entitlements, clock, {
    defaultMaxProfiles: env.DEFAULT_KIDS_MAX_PROFILES,
  })
  // Quota de IA por conta (o BFF consome 1 crédito antes de cada ida ao LLM).
  const aiUsageRepo = new DrizzleAiUsageRepository(db)
  const consumeAiUsage = new ConsumeAiUsageService({
    aiUsage: aiUsageRepo,
    dailyLimit: env.AI_LIMIT_DAILY,
    monthlyLimit: env.AI_LIMIT_MONTHLY,
    clock,
  })
  // Leitura do saldo (medidor da criança + painel dos pais). MESMO repo e MESMAS
  // envs do consume: os tetos vivem num lugar só.
  const aiCredits = new GetAiCreditsService({
    aiUsage: aiUsageRepo,
    dailyLimit: env.AI_LIMIT_DAILY,
    monthlyLimit: env.AI_LIMIT_MONTHLY,
    clock,
  })
  const aiUsageStats = new GetAiUsageStatsService(aiUsageRepo, clock)
  const zappy = new ZappyHistoryService(new DrizzleZappyRepository(db), clock)
  // S2S: resumo de progresso dos filhos (consumido pelo BFF da área dos pais, kids).
  // O hub entra p/ os JOGOS da semana no Mural (best-effort — sem HUB_BASE_URL degrada).
  const childrenStats = new GetChildrenStatsService(
    gamificationRepo,
    courses,
    progress,
    studioSubmissions,
    clock,
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

  // Lembrete de RENOVAÇÃO (anual à vista): mesmo quarteto do report dos pais +
  // FUNNEL_URL (o link /renovar vive no funil). Sem as envs = no-op (dev).
  const renewalReminderSender =
    authGateway && env.GATEWAY_URL && env.MEMBERS_HMAC_SECRET && env.FUNNEL_URL
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
          },
        )
      : null
  const listMyCourses = new ListMyCoursesService(
    entitlements,
    courses,
    progress,
    positions,
    gamificationRepo,
    clock,
  )
  const listCatalog = new ListCatalogService(courses, entitlements, gamificationRepo, clock)
  const getMyCourse = new GetMyCourseService(checkAccess, courses, progress, positions, ratings)
  const zappyKnowledge = new ZappyKnowledgeService(
    new DrizzleZappyKnowledgeRepository(db),
    listMyCourses,
    getMyCourse,
    clock,
  )
  const getLesson = new GetLessonService(
    checkAccess,
    courses,
    progress,
    positions,
    quizAttempts,
    studioSubmissions,
    clock,
  )
  const resolveAttachment = new GetAttachmentDownloadService(checkAccess, courses, progress)
  const resolveEbook = new GetEbookDownloadService(checkAccess, courses, progress)
  const awardGamification = new AwardGamificationService(gamificationRepo, clock, logger)
  const getGamification = new GetGamificationService(gamificationRepo, clock)
  const avatarRepo = new DrizzleAvatarRepository(db)
  const getAvatar = new GetAvatarService(avatarRepo, gamificationRepo)
  const getAvatarsByProfiles = new GetAvatarsByProfilesService(avatarRepo, gamificationRepo)
  const buyAvatarPart = new BuyAvatarPartService(
    avatarRepo,
    gamificationRepo,
    awardGamification,
    clock,
  )
  const equipAvatar = new EquipAvatarService(avatarRepo, clock)
  const setAvatarPhoto = new SetAvatarPhotoService(avatarRepo, clock, env.AVATAR_PHOTO_URL_PREFIXES)
  const roomRepo = new DrizzleRoomRepository(db)
  const studioUnlockRepo = new DrizzleStudioUnlockRepository(db)
  const getRoom = new GetRoomService(roomRepo, gamificationRepo)
  const saveRoom = new SaveRoomService(roomRepo, clock, logger)
  const buyRoomItem = new BuyRoomItemService(roomRepo, gamificationRepo, awardGamification, clock)
  const getPublicProfile = new GetPublicProfileService(
    gamificationRepo,
    avatarRepo,
    roomRepo,
    hub,
    clock,
  )
  const getChallenge = new GetChallengeService(gamificationRepo, challengeConfigRepo, clock)
  // Paleta do Estúdio livre pelo CURRÍCULO (união dos cursos concluídos+publicados).
  const getStudioUnlocks = new GetStudioUnlocksService(gamificationRepo, studioUnlockRepo, logger)
  const challengeAdmin = new ChallengeAdminService(challengeConfigRepo, clock)
  const getMissions = new GetMissionsService(gamificationRepo, accessCheck, clock)
  const claimMission = new ClaimMissionService(gamificationRepo, accessCheck, clock)
  // Remix do Mural (marco de missão gated) — valida posse + playId no hub (anti-farm).
  const recordRemix = new RecordStudioRemixService(accessCheck, hub, awardGamification)
  // XP diário de CRIAR no Estúdio (sem hub/playId — só posse + award do dia).
  const recordStudioActivity = new RecordStudioActivityDayService(accessCheck, awardGamification)
  const buyStreakFreeze = new BuyStreakFreezeService(gamificationRepo, () => randomUUID(), clock)
  const setVacation = new SetVacationService(gamificationRepo, clock)
  const getLeague = new GetLeagueService(gamificationRepo, clock, getAvatarsByProfiles, authGateway)
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
  )
  // Antes do submitStudio: o envio espelha o recado do aluno na conversa (histórico).
  const teacherThreads = new TeacherThreadsService(new DrizzleTeacherThreadRepository(db), clock)
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
  )
  const getStudioCarryover = new GetStudioCarryoverService(
    checkAccess,
    courses,
    progress,
    studioSubmissions,
  )
  const getOwnStudioSubmission = new GetOwnStudioSubmissionService(
    checkAccess,
    courses,
    progress,
    studioSubmissions,
  )
  const getShowcasePayload = new GetShowcasePayloadService(
    checkAccess,
    courses,
    progress,
    studioSubmissions,
  )
  const studioSubmissionsAdmin = new StudioSubmissionsAdminService(studioSubmissions, clock)
  const getCertificate = new GetCertificateService(checkAccess, courses, progress, certificates)
  const issueCertificate = new IssueCertificateService(
    checkAccess,
    courses,
    progress,
    certificates,
    awardGamification,
    clock,
  )
  const validateCertificate = new ValidateCertificateService(certificates)
  const revokeCertificate = new RevokeCertificateService(certificates, clock)

  // Pensa (planejador de jogos — plano + Cartões de Criação + progresso externo)
  const pensaRepo = new DrizzlePensaRepository(db)
  const pensaNewId = () => randomUUID()
  const listPensaProjects = new ListPensaProjectsService(pensaRepo)
  const createPensaProject = new CreatePensaProjectService(pensaRepo, pensaNewId, clock)
  const getPensaProject = new GetPensaProjectService(pensaRepo)
  const updatePensaProject = new UpdatePensaProjectService(pensaRepo, clock)
  const createPensaCycle = new CreatePensaCycleService(pensaRepo, pensaNewId, clock)
  const getPensaStage = new GetPensaStageService(pensaRepo)
  const appendPensaConversationTurn = new AppendPensaConversationTurnService(pensaRepo, clock)
  const savePensaArtifact = new SavePensaArtifactService(pensaRepo, pensaNewId, clock)
  const validatePensaArtifact = new ValidatePensaArtifactService(pensaRepo, clock)
  // O advance credita a gamificação NA RESPOSTA (award-dentro-da-ação, fail-open).
  const advancePensaStage = new AdvancePensaStageService(pensaRepo, awardGamification, clock)
  const replacePensaTasks = new ReplacePensaTasksService(pensaRepo, pensaNewId, clock)
  const appendPensaTasks = new AppendPensaTasksService(pensaRepo, pensaNewId, clock)
  const updatePensaTask = new UpdatePensaTaskService(pensaRepo, pensaNewId, clock)
  const deletePensaTask = new DeletePensaTaskService(pensaRepo, clock)
  const getPensaTaskHandoff = new GetPensaTaskHandoffService(pensaRepo)
  const updatePensaTaskProgress = new UpdatePensaTaskProgressService(pensaRepo, clock)

  // "Guardado na sua conta" (índice das criações do Estúdio Completo/Pinta; blob no R2 via BFF)
  const creationsRepo = new DrizzleCreationsRepository(db)
  const listCreations = new ListCreationsService(creationsRepo)
  const reserveCreationUpload = new ReserveCreationUploadService(creationsRepo, accessCheck, clock)
  const commitCreationUpload = new CommitCreationUploadService(creationsRepo, clock)
  const getCreationDownload = new GetCreationDownloadService(creationsRepo)
  const deleteCreation = new DeleteCreationService(creationsRepo, clock)

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
  const getMemberDetail = new GetMemberDetailService(entitlements, courses, progress, positions)
  // Uso por ferramenta (ficha admin) — hub best-effort (noop sem HUB_BASE_URL → cartões null).
  const toolUsage = new DrizzleToolUsageRepository(db)
  const getMemberToolUsage = new GetMemberToolUsageService(toolUsage, hub)
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

  const server = createServer({
    env,
    logger,
    accountDeletionFence: userDataPurgeRepository,
    readiness,
    members: {
      listMyCourses,
      listCatalog,
      accessCheck,
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
      getMissions,
      claimMission,
      recordRemix,
      recordStudioActivity,
      buyStreakFreeze,
      setVacation,
      getLeague,
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
      aiCredits,
      zappy,
      zappyKnowledge,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    pensa: {
      listProjects: listPensaProjects,
      createProject: createPensaProject,
      getProject: getPensaProject,
      updateProject: updatePensaProject,
      createCycle: createPensaCycle,
      getStage: getPensaStage,
      appendConversationTurn: appendPensaConversationTurn,
      saveArtifact: savePensaArtifact,
      validateArtifact: validatePensaArtifact,
      advanceStage: advancePensaStage,
      replaceTasks: replacePensaTasks,
      appendTasks: appendPensaTasks,
      updateTask: updatePensaTask,
      deleteTask: deletePensaTask,
      getTaskHandoff: getPensaTaskHandoff,
      updateTaskProgress: updatePensaTaskProgress,
      accessCheck,
      getGamification,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    creations: {
      list: listCreations,
      reserveUpload: reserveCreationUpload,
      commitUpload: commitCreationUpload,
      getDownload: getCreationDownload,
      remove: deleteCreation,
      internalToken: env.INTERNAL_API_TOKEN,
    },
    webhooks: {
      grant,
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
      requireAdminEnabled: env.REQUIRE_ADMIN,
      internalToken: env.INTERNAL_API_TOKEN,
      listMembers,
      getMemberDetail,
      getMemberToolUsage,
      getMemberActivity,
      listMemberCertificates,
      listMemberRatings,
      getGamification,
      analytics,
      aiUsageStats,
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
      courses: courseAdmin,
      modules: moduleAdmin,
      lessons: lessonAdmin,
      blocks: blockAdmin,
      attachments: attachmentAdmin,
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
  })

  let cleanupTimer: ReturnType<typeof setInterval> | null = null
  let parentReportTimer: ReturnType<typeof setInterval> | null = null
  let renewalReminderTimer: ReturnType<typeof setInterval> | null = null

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

  // Lembrete de renovação (anual à vista): ciclo periódico sob advisory lock
  // PRÓPRIO (1 réplica) — mesmo desenho do report dos pais.
  const runRenewalReminderCycle = async () => {
    if (!renewalReminderSender) return
    await connection.sql.begin(async (gate) => {
      const [row] = await gate`
        select pg_try_advisory_xact_lock(${RENEWAL_REMINDER_ADVISORY_LOCK_KEY}::bigint) as locked
      `
      if (!row?.locked) return // outra réplica está enviando neste ciclo
      await renewalReminderSender.runCycle()
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
      if (parentReportSender) {
        parentReportTimer = setInterval(() => {
          void runParentReportCycle().catch((error) =>
            logger.error('parent_report.cycle_failed', {
              error: error instanceof Error ? error.message : String(error),
            }),
          )
        }, env.PARENT_REPORT_INTERVAL_MS)
      }
      if (renewalReminderSender) {
        renewalReminderTimer = setInterval(() => {
          void runRenewalReminderCycle().catch((error) =>
            logger.error('renewal_reminder.cycle_failed', {
              error: error instanceof Error ? error.message : String(error),
            }),
          )
        }, env.RENEWAL_REMINDER_INTERVAL_MS)
      }
      // `::` = dual-stack (IPv4+IPv6) — necessário p/ o private networking do
      // Railway (`members.railway.internal` resolve IPv6).
      server.listen({ port: env.PORT, hostname: env.HOST })
      logger.info('http.listening', { port: env.PORT, host: env.HOST })
    },
    async stop() {
      if (cleanupTimer) clearInterval(cleanupTimer)
      if (parentReportTimer) clearInterval(parentReportTimer)
      if (renewalReminderTimer) clearInterval(renewalReminderTimer)
      await server.stop()
      await connection.close()
      logger.info('app.stopped')
    },
  }
}
