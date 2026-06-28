import { randomUUID } from 'node:crypto'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { CheckAccessService } from '../src/application/access/check-access.service'
import { AccessCheckService } from '../src/application/access-check/access-check.service'
import { BuyAvatarPartService } from '../src/application/avatar/buy-avatar-part.service'
import { EquipAvatarService } from '../src/application/avatar/equip-avatar.service'
import { GetAvatarService } from '../src/application/avatar/get-avatar.service'
import { SetAvatarPhotoService } from '../src/application/avatar/set-avatar-photo.service'
import { GetChildrenStatsService } from '../src/application/children-stats/get-children-stats.service'
import {
  AttachmentAdminService,
  BlockAdminService,
  CourseAdminService,
  LessonAdminService,
  ModuleAdminService,
} from '../src/application/content-admin/content-admin.service'
import { AwardGamificationService } from '../src/application/gamification/award-gamification.service'
import { BuyStreakFreezeService } from '../src/application/gamification/buy-streak-freeze.service'
import { ClaimMissionService } from '../src/application/gamification/claim-mission.service'
import { GetGamificationService } from '../src/application/gamification/get-gamification.service'
import { GetLeagueService } from '../src/application/gamification/get-league.service'
import { GetMissionsService } from '../src/application/gamification/get-missions.service'
import { SetVacationService } from '../src/application/gamification/set-vacation.service'
import { GetAttachmentDownloadService } from '../src/application/get-attachment-download/get-attachment-download.service'
import { GetCertificateService } from '../src/application/get-certificate/get-certificate.service'
import { GetCourseProgressService } from '../src/application/get-course-progress/get-course-progress.service'
import { GetCourseRatingService } from '../src/application/get-course-rating/get-course-rating.service'
import { GetEbookDownloadService } from '../src/application/get-ebook-download/get-ebook-download.service'
import { GetLessonService } from '../src/application/get-lesson/get-lesson.service'
import { GetMemberDetailService } from '../src/application/get-member-detail/get-member-detail.service'
import { GetMyCourseService } from '../src/application/get-my-course/get-my-course.service'
import { GetOwnStudioSubmissionService } from '../src/application/get-own-studio-submission/get-own-studio-submission.service'
import { GetShowcasePayloadService } from '../src/application/get-showcase-payload/get-showcase-payload.service'
import { GetStudioCarryoverService } from '../src/application/get-studio-carryover/get-studio-carryover.service'
import { GrantEntitlementService } from '../src/application/grant-entitlement/grant-entitlement.service'
import { GrantManualEntitlementService } from '../src/application/grant-manual-entitlement/grant-manual-entitlement.service'
import { IssueCertificateService } from '../src/application/issue-certificate/issue-certificate.service'
import { ListCatalogService } from '../src/application/list-catalog/list-catalog.service'
import { ListMembersService } from '../src/application/list-members/list-members.service'
import { ListMyCoursesService } from '../src/application/list-my-courses/list-my-courses.service'
import { ManageEntitlementService } from '../src/application/manage-entitlement/manage-entitlement.service'
import { MarkLessonCompleteService } from '../src/application/mark-lesson-complete/mark-lesson-complete.service'
import { GetProfileAllowanceService } from '../src/application/profile-allowance/get-profile-allowance.service'
import { GetPublicProfileService } from '../src/application/profiles/get-public-profile.service'
import { RevokeEntitlementService } from '../src/application/revoke-entitlement/revoke-entitlement.service'
import { BuyRoomItemService } from '../src/application/room/buy-room-item.service'
import { GetRoomService } from '../src/application/room/get-room.service'
import { SaveRoomService } from '../src/application/room/save-room.service'
import { SaveCourseRatingService } from '../src/application/save-course-rating/save-course-rating.service'
import { SaveVideoPositionService } from '../src/application/save-video-position/save-video-position.service'
import { StudioSubmissionsAdminService } from '../src/application/studio-submissions-admin/studio-submissions-admin.service'
import { SubmitQuizAttemptService } from '../src/application/submit-quiz-attempt/submit-quiz-attempt.service'
import { SubmitStudioProjectService } from '../src/application/submit-studio-project/submit-studio-project.service'
import {
  RevokeCertificateService,
  ValidateCertificateService,
} from '../src/application/validate-certificate/validate-certificate.service'
import type { CourseAudience, CourseStatus } from '../src/domain/course/course'
import { EntitlementAggregate } from '../src/domain/entitlement/entitlement.aggregate'
import type { ResolvedOffer } from '../src/domain/ports/catalog-gateway.port'
import type { HubGateway } from '../src/domain/ports/hub-gateway.port'
import type { Env } from '../src/infrastructure/config/env'
import { createServer } from '../src/interfaces/http/server'
import {
  FakeCatalogGateway,
  InMemoryAvatarRepository,
  InMemoryCertificateRepository,
  InMemoryCourseRatingRepository,
  InMemoryCourseRepository,
  InMemoryEntitlementRepository,
  InMemoryGamificationRepository,
  InMemoryProcessedWebhookRepository,
  InMemoryProgressRepository,
  InMemoryQuizAttemptRepository,
  InMemoryRoomRepository,
  InMemoryStudioSubmissionRepository,
  InMemoryVideoPositionRepository,
  silentLogger,
} from './fakes/in-memory'

export const WEBHOOK_SECRET = 'test-gateway-secret-0123456789ab'

export function buildApp(
  opts: {
    now?: Date
    internalToken?: string
    requireAdmin?: boolean
    /** Probe do /readyz (default: pronto). */
    readiness?: () => Promise<{ ready: boolean; checks: Record<string, string> }>
  } = {},
) {
  const clockRef = { now: opts.now ?? new Date('2026-06-02T12:00:00.000Z') }
  const clock = () => clockRef.now

  const entitlements = new InMemoryEntitlementRepository()
  const courses = new InMemoryCourseRepository()
  // O fake de progresso enxerga as aulas p/ espelhar o join das contagens `*Published`.
  const progress = new InMemoryProgressRepository(courses)
  const positions = new InMemoryVideoPositionRepository()
  const quizAttempts = new InMemoryQuizAttemptRepository()
  const studioSubmissions = new InMemoryStudioSubmissionRepository(courses)
  courses.onEvaluativeBlockContentChanged = (blockId) => {
    quizAttempts.deleteByBlockId(blockId)
    studioSubmissions.deleteByBlockId(blockId)
  }
  const ratings = new InMemoryCourseRatingRepository()
  const certificates = new InMemoryCertificateRepository()
  const avatar = new InMemoryAvatarRepository()
  const room = new InMemoryRoomRepository()
  // gamification recebe avatar/room p/ a compra ATÔMICA (spendCoins concede a posse junto).
  const gamification = new InMemoryGamificationRepository({ entitlements, courses, avatar, room })
  const processed = new InMemoryProcessedWebhookRepository()
  const catalog = new FakeCatalogGateway()

  const checkAccess = new CheckAccessService(courses, entitlements, clock)
  const awardGamification = new AwardGamificationService(gamification, clock, silentLogger)
  const grant = new GrantEntitlementService({
    catalog,
    entitlements,
    graceDays: 3,
    newId: () => randomUUID(),
    logger: silentLogger,
  })
  const revoke = new RevokeEntitlementService({ entitlements, clock, logger: silentLogger })

  // Fake do hub: registra as notificações de mudança de acesso (grant) p/ asserção.
  const hubCalls: { userId: string; event: string }[] = []
  const hub: HubGateway = {
    async notifyAccessChanged(userId, event) {
      hubCalls.push({ userId, event })
    },
  }

  const env = {
    NODE_ENV: 'test',
    MAX_REQUEST_BODY_BYTES: 64 * 1024,
    MAX_STUDIO_BODY_BYTES: 2 * 1024 * 1024,
  } as unknown as Env

  const app = createServer({
    env,
    logger: silentLogger,
    readiness: opts.readiness ?? (async () => ({ ready: true, checks: { db: 'ok' } })),
    members: {
      listMyCourses: new ListMyCoursesService(entitlements, courses, progress, positions, clock),
      listCatalog: new ListCatalogService(courses, entitlements, clock),
      accessCheck: new AccessCheckService(entitlements, clock),
      getMyCourse: new GetMyCourseService(checkAccess, courses, progress, positions, ratings),
      getLesson: new GetLessonService(
        checkAccess,
        courses,
        progress,
        positions,
        quizAttempts,
        studioSubmissions,
        clock,
      ),
      resolveAttachment: new GetAttachmentDownloadService(checkAccess, courses, progress),
      resolveEbook: new GetEbookDownloadService(checkAccess, courses, progress),
      markComplete: new MarkLessonCompleteService(
        checkAccess,
        courses,
        progress,
        quizAttempts,
        studioSubmissions,
        awardGamification,
        clock,
      ),
      getProgress: new GetCourseProgressService(checkAccess, courses, progress),
      savePosition: new SaveVideoPositionService(checkAccess, courses, progress, positions, clock),
      getCourseRating: new GetCourseRatingService(checkAccess, ratings),
      saveCourseRating: new SaveCourseRatingService(checkAccess, ratings, clock),
      submitQuiz: new SubmitQuizAttemptService(
        checkAccess,
        courses,
        progress,
        quizAttempts,
        awardGamification,
        () => randomUUID(),
        clock,
      ),
      submitStudio: new SubmitStudioProjectService(
        checkAccess,
        courses,
        progress,
        studioSubmissions,
        awardGamification,
        () => randomUUID(),
        clock,
      ),
      getStudioCarryover: new GetStudioCarryoverService(
        checkAccess,
        courses,
        progress,
        studioSubmissions,
      ),
      getOwnStudioSubmission: new GetOwnStudioSubmissionService(
        checkAccess,
        courses,
        progress,
        studioSubmissions,
      ),
      getShowcasePayload: new GetShowcasePayloadService(
        checkAccess,
        courses,
        progress,
        studioSubmissions,
      ),
      getCertificate: new GetCertificateService(checkAccess, courses, progress, certificates),
      issueCertificate: new IssueCertificateService(
        checkAccess,
        courses,
        progress,
        certificates,
        awardGamification,
        clock,
      ),
      getGamification: new GetGamificationService(gamification, clock),
      getMissions: new GetMissionsService(gamification, clock),
      claimMission: new ClaimMissionService(gamification, clock),
      buyStreakFreeze: new BuyStreakFreezeService(gamification, () => randomUUID(), clock),
      setVacation: new SetVacationService(gamification, clock),
      getLeague: new GetLeagueService(gamification, clock),
      childrenStats: new GetChildrenStatsService(
        gamification,
        courses,
        progress,
        studioSubmissions,
        clock,
      ),
      getAvatar: new GetAvatarService(avatar, gamification),
      buyAvatarPart: new BuyAvatarPartService(avatar, gamification, clock),
      equipAvatar: new EquipAvatarService(avatar, clock),
      setAvatarPhoto: new SetAvatarPhotoService(avatar, clock),
      getPublicProfile: new GetPublicProfileService(gamification, avatar, room, clock),
      getRoom: new GetRoomService(room, gamification),
      saveRoom: new SaveRoomService(room, clock),
      buyRoomItem: new BuyRoomItemService(room, gamification, clock),
      internalToken: opts.internalToken,
    },
    webhooks: {
      grant,
      revoke,
      processed,
      hub,
      webhookSecret: WEBHOOK_SECRET,
      toleranceSeconds: 300,
      now: clock,
      logger: silentLogger,
    },
    admin: {
      requireAdminEnabled: opts.requireAdmin ?? false,
      internalToken: opts.internalToken,
      listMembers: new ListMembersService(entitlements, clock),
      getMemberDetail: new GetMemberDetailService(entitlements, courses, progress),
      grantManual: new GrantManualEntitlementService({
        catalog,
        courses,
        entitlements,
        newId: () => randomUUID(),
        clock,
        logger: silentLogger,
      }),
      manageEntitlement: new ManageEntitlementService(entitlements, clock),
      revokeCertificate: new RevokeCertificateService(certificates, clock),
      hub,
    },
    content: {
      requireAdminEnabled: opts.requireAdmin ?? false,
      internalToken: opts.internalToken,
      // O fake InMemoryCourseRepository implementa CourseRepository E ContentAdminRepository.
      courses: new CourseAdminService(courses, courses),
      modules: new ModuleAdminService(courses, courses),
      lessons: new LessonAdminService(courses, courses),
      blocks: new BlockAdminService(courses),
      attachments: new AttachmentAdminService(courses),
      studioSubmissions: new StudioSubmissionsAdminService(studioSubmissions),
    },
    internal: {
      accessCheck: new AccessCheckService(entitlements, clock),
      profileAllowance: new GetProfileAllowanceService(entitlements, clock, {
        defaultMaxProfiles: 1,
      }),
      showcasePayload: new GetShowcasePayloadService(
        checkAccess,
        courses,
        progress,
        studioSubmissions,
      ),
      validateCertificate: new ValidateCertificateService(certificates),
      internalToken: opts.internalToken,
    },
  })

  return {
    app,
    entitlements,
    courses,
    progress,
    positions,
    quizAttempts,
    studioSubmissions,
    ratings,
    certificates,
    gamification,
    avatar,
    room,
    processed,
    catalog,
    clockRef,
    hubCalls,
  }
}

/** Curso de exemplo: 1 módulo, 2 aulas (a 1ª composta com 4 blocos + 1 anexo). */
export function seedSampleCourse(
  courses: InMemoryCourseRepository,
  slug = 'curso-demo',
  status: CourseStatus = 'published',
  audience: CourseAudience = 'adult',
  // Conveniência de teste: trava sequencial DESLIGADA por padrão (navegação livre,
  // como o comportamento legado). Em produção o default da coluna é LIGADO; os
  // testes da trava passam `true` explicitamente.
  sequentialLock = false,
) {
  const now = new Date('2026-06-01T00:00:00.000Z')
  const courseId = randomUUID()
  const moduleId = randomUUID()
  const lesson1 = randomUUID()
  const lesson2 = randomUUID()
  const ebookBlockId = randomUUID()
  courses.courses.push({
    id: courseId,
    slug,
    title: 'Curso Demo',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    status,
    audience,
    sequentialLock,
    metadata: null,
    createdAt: now,
    updatedAt: now,
  })
  courses.modules.push({ id: moduleId, courseId, title: 'Módulo 1', summary: null, sortOrder: 0 })
  courses.lessons.push({
    id: lesson1,
    moduleId,
    courseId,
    slug: 'aula-1',
    title: 'Aula composta',
    sortOrder: 0,
    estimatedMinutes: 5,
    isPublished: true,
  })
  courses.lessons.push({
    id: lesson2,
    moduleId,
    courseId,
    slug: 'aula-2',
    title: 'Aula 2',
    sortOrder: 1,
    estimatedMinutes: 7,
    isPublished: true,
  })
  courses.blocks.push(
    {
      id: randomUUID(),
      lessonId: lesson1,
      kind: 'rich_text',
      sortOrder: 0,
      content: { kind: 'rich_text', markdown: '# Olá' },
    },
    {
      id: randomUUID(),
      lessonId: lesson1,
      kind: 'video',
      sortOrder: 1,
      content: { kind: 'video', provider: 'youtube', src: 'https://y/1' },
    },
    {
      id: randomUUID(),
      lessonId: lesson1,
      kind: 'embed',
      sortOrder: 2,
      content: { kind: 'embed', embedType: 'three_js', html: '<canvas></canvas>' },
    },
    {
      id: ebookBlockId,
      lessonId: lesson1,
      kind: 'ebook',
      sortOrder: 3,
      content: { kind: 'ebook', url: 'r2priv:admin/attachments/ebook-demo.pdf', title: 'Guia' },
    },
  )
  courses.attachments.push({
    id: randomUUID(),
    lessonId: lesson1,
    label: 'Slides (PDF)',
    url: 'https://x/a.pdf',
    fileType: 'application/pdf',
    sizeBytes: null,
    sortOrder: 0,
  })
  return { courseId, slug, moduleId, lessonIds: [lesson1, lesson2] as const, ebookBlockId }
}

/**
 * Concede uma matrícula diretamente (sem passar pelo webhook). Vitalícia por
 * padrão; passe `expiresAt`/`subscriptionId` para semear uma assinatura.
 */
export function grantLifetime(
  entitlements: InMemoryEntitlementRepository,
  opts: {
    userId: string
    courseRef: string
    now?: Date
    expiresAt?: Date | null
    subscriptionId?: string
    key?: string
  },
): EntitlementAggregate {
  const now = opts.now ?? new Date('2026-06-01T00:00:00.000Z')
  const subscriptionId = opts.subscriptionId ?? null
  const e = EntitlementAggregate.grant({
    id: randomUUID(),
    userId: opts.userId,
    productId: randomUUID(),
    productKind: 'course',
    accessType: 'course',
    courseRef: opts.courseRef,
    offerId: randomUUID(),
    snapshot: {
      offerId: 'o',
      offerSlug: 'o',
      productId: 'p',
      sku: 's',
      name: 'Curso Demo',
      kind: 'course',
      accessType: 'course',
      courseRef: opts.courseRef,
      fulfillment: { accessType: 'course', courseRef: opts.courseRef },
      resolvedAt: now.toISOString(),
    },
    sourceKind: subscriptionId ? 'subscription' : 'manual',
    sourceId: subscriptionId ?? 'seed',
    subscriptionId,
    grantedAt: now,
    expiresAt: opts.expiresAt ?? null,
    idempotencyKey: opts.key ?? `manual:${opts.userId}:${opts.courseRef}`,
  })
  entitlements.seed(e)
  return e
}

/**
 * Concede uma CHAVE-MESTRA (`accessType:'all_courses'`) diretamente — cobre todos
 * os cursos publicados, atuais e futuros. Vitalícia por padrão.
 */
export function grantAllCourses(
  entitlements: InMemoryEntitlementRepository,
  opts: { userId: string; now?: Date; expiresAt?: Date | null; subscriptionId?: string },
): EntitlementAggregate {
  const now = opts.now ?? new Date('2026-06-01T00:00:00.000Z')
  const subscriptionId = opts.subscriptionId ?? null
  const e = EntitlementAggregate.grant({
    id: randomUUID(),
    userId: opts.userId,
    productId: randomUUID(),
    productKind: 'course',
    accessType: 'all_courses',
    courseRef: null,
    offerId: randomUUID(),
    snapshot: {
      offerId: 'o',
      offerSlug: 'o',
      productId: 'p',
      sku: 's',
      name: 'Acesso Total',
      kind: 'course',
      accessType: 'all_courses',
      courseRef: null,
      fulfillment: { accessType: 'all_courses' },
      resolvedAt: now.toISOString(),
    },
    sourceKind: subscriptionId ? 'subscription' : 'manual',
    sourceId: subscriptionId ?? 'seed',
    subscriptionId,
    grantedAt: now,
    expiresAt: opts.expiresAt ?? null,
    idempotencyKey: `manual:${opts.userId}:all-courses-${randomUUID()}`,
  })
  entitlements.seed(e)
  return e
}

/**
 * Concede uma CHAVE-MESTRA KIDS (`accessType:'all_kids_courses'`) — cobre todos os
 * cursos `kids` publicados, atuais e futuros (e SÓ os kids). Vitalícia por padrão.
 */
export function grantAllKidsCourses(
  entitlements: InMemoryEntitlementRepository,
  opts: { userId: string; now?: Date; expiresAt?: Date | null; subscriptionId?: string },
): EntitlementAggregate {
  const now = opts.now ?? new Date('2026-06-01T00:00:00.000Z')
  const subscriptionId = opts.subscriptionId ?? null
  const e = EntitlementAggregate.grant({
    id: randomUUID(),
    userId: opts.userId,
    productId: randomUUID(),
    productKind: 'course',
    accessType: 'all_kids_courses',
    courseRef: null,
    offerId: randomUUID(),
    snapshot: {
      offerId: 'o',
      offerSlug: 'o',
      productId: 'p',
      sku: 's',
      name: 'Todos os cursos kids',
      kind: 'course',
      accessType: 'all_kids_courses',
      courseRef: null,
      fulfillment: { accessType: 'all_kids_courses' },
      resolvedAt: now.toISOString(),
    },
    sourceKind: subscriptionId ? 'subscription' : 'manual',
    sourceId: subscriptionId ?? 'seed',
    subscriptionId,
    grantedAt: now,
    expiresAt: opts.expiresAt ?? null,
    idempotencyKey: `manual:${opts.userId}:all-kids-courses-${randomUUID()}`,
  })
  entitlements.seed(e)
  return e
}

/**
 * Concede um acesso de COMUNIDADE (`accessType:'community'`) — o `courseRef` guarda
 * a CHAVE da comunidade (casa com `communities[]` do espaço no hub). Vitalício por padrão.
 */
export function grantCommunity(
  entitlements: InMemoryEntitlementRepository,
  opts: { userId: string; communityKey: string; now?: Date; expiresAt?: Date | null },
): EntitlementAggregate {
  const now = opts.now ?? new Date('2026-06-01T00:00:00.000Z')
  const e = EntitlementAggregate.grant({
    id: randomUUID(),
    userId: opts.userId,
    productId: randomUUID(),
    productKind: 'community',
    accessType: 'community',
    courseRef: opts.communityKey,
    offerId: randomUUID(),
    snapshot: {
      offerId: 'o',
      offerSlug: 'o',
      productId: 'p',
      sku: 's',
      name: 'Comunidade',
      kind: 'community',
      accessType: 'community',
      courseRef: opts.communityKey,
      fulfillment: { accessType: 'community', courseRef: opts.communityKey },
      resolvedAt: now.toISOString(),
    },
    sourceKind: 'manual',
    sourceId: 'seed',
    subscriptionId: null,
    grantedAt: now,
    expiresAt: opts.expiresAt ?? null,
    idempotencyKey: `manual:${opts.userId}:community-${randomUUID()}`,
  })
  entitlements.seed(e)
  return e
}

/** Oferta resolvida (catálogo) cujo item entrega a chave-mestra (`all_courses`). */
export function offerWithAllCourses(offerSlug: string): ResolvedOffer {
  return {
    offerId: randomUUID(),
    offerSlug,
    items: [
      {
        productId: randomUUID(),
        sku: 'acesso-total',
        name: 'Acesso Total',
        kind: 'course',
        isPrimary: true,
        fulfillment: { accessType: 'all_courses' },
      },
    ],
  }
}

/** Oferta resolvida (catálogo) que concede acesso ao curso `courseRef`. */
export function offerWithCourse(offerSlug: string, courseRef: string): ResolvedOffer {
  return {
    offerId: randomUUID(),
    offerSlug,
    items: [
      {
        productId: randomUUID(),
        sku: 'curso-demo',
        name: 'Curso Demo',
        kind: 'course',
        isPrimary: true,
        fulfillment: { accessType: 'course', courseRef },
      },
    ],
  }
}

/** Headers assinados (HMAC resign do gateway) para um webhook de entrada.
 *  Mensagem canônica: "POST.<path>.<corpo>" (método+path = anti replay cross-endpoint). */
export function signedWebhookHeaders(
  path: string,
  rawBody: string,
  deliveryId?: string,
): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000)
  const sig = signHmac(
    WEBHOOK_SECRET,
    canonicalHmacMessage({ method: 'POST', path, body: rawBody }),
    ts,
  )
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-signature': `t=${ts},v1=${sig}`,
  }
  if (deliveryId) headers['x-delivery-id'] = deliveryId
  return headers
}
