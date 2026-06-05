import { randomUUID } from 'node:crypto'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { CheckAccessService } from '../src/application/access/check-access.service'
import {
  AttachmentAdminService,
  BlockAdminService,
  CourseAdminService,
  LessonAdminService,
  ModuleAdminService,
} from '../src/application/content-admin/content-admin.service'
import { GetAttachmentDownloadService } from '../src/application/get-attachment-download/get-attachment-download.service'
import { GetCourseProgressService } from '../src/application/get-course-progress/get-course-progress.service'
import { GetCourseRatingService } from '../src/application/get-course-rating/get-course-rating.service'
import { GetEbookDownloadService } from '../src/application/get-ebook-download/get-ebook-download.service'
import { GetLessonService } from '../src/application/get-lesson/get-lesson.service'
import { GetMemberDetailService } from '../src/application/get-member-detail/get-member-detail.service'
import { GetMyCourseService } from '../src/application/get-my-course/get-my-course.service'
import { GrantEntitlementService } from '../src/application/grant-entitlement/grant-entitlement.service'
import { GrantManualEntitlementService } from '../src/application/grant-manual-entitlement/grant-manual-entitlement.service'
import { ListCatalogService } from '../src/application/list-catalog/list-catalog.service'
import { ListMembersService } from '../src/application/list-members/list-members.service'
import { ListMyCoursesService } from '../src/application/list-my-courses/list-my-courses.service'
import { ManageEntitlementService } from '../src/application/manage-entitlement/manage-entitlement.service'
import { MarkLessonCompleteService } from '../src/application/mark-lesson-complete/mark-lesson-complete.service'
import { RevokeEntitlementService } from '../src/application/revoke-entitlement/revoke-entitlement.service'
import { SaveCourseRatingService } from '../src/application/save-course-rating/save-course-rating.service'
import { SaveVideoPositionService } from '../src/application/save-video-position/save-video-position.service'
import { SubmitQuizAttemptService } from '../src/application/submit-quiz-attempt/submit-quiz-attempt.service'
import type { CourseStatus } from '../src/domain/course/course'
import { EntitlementAggregate } from '../src/domain/entitlement/entitlement.aggregate'
import type { ResolvedOffer } from '../src/domain/ports/catalog-gateway.port'
import type { Env } from '../src/infrastructure/config/env'
import { createServer } from '../src/interfaces/http/server'
import {
  FakeCatalogGateway,
  InMemoryCourseRatingRepository,
  InMemoryCourseRepository,
  InMemoryEntitlementRepository,
  InMemoryProcessedWebhookRepository,
  InMemoryProgressRepository,
  InMemoryQuizAttemptRepository,
  InMemoryVideoPositionRepository,
  silentLogger,
} from './fakes/in-memory'

export const WEBHOOK_SECRET = 'test-gateway-secret-0123456789ab'

export function buildApp(
  opts: { now?: Date; internalToken?: string; requireAdmin?: boolean } = {},
) {
  const clockRef = { now: opts.now ?? new Date('2026-06-02T12:00:00.000Z') }
  const clock = () => clockRef.now

  const entitlements = new InMemoryEntitlementRepository()
  const courses = new InMemoryCourseRepository()
  const progress = new InMemoryProgressRepository()
  const positions = new InMemoryVideoPositionRepository()
  const quizAttempts = new InMemoryQuizAttemptRepository()
  const ratings = new InMemoryCourseRatingRepository()
  const processed = new InMemoryProcessedWebhookRepository()
  const catalog = new FakeCatalogGateway()

  const checkAccess = new CheckAccessService(courses, entitlements, clock)
  const grant = new GrantEntitlementService({
    catalog,
    entitlements,
    graceDays: 3,
    newId: () => randomUUID(),
    logger: silentLogger,
  })
  const revoke = new RevokeEntitlementService({ entitlements, clock, logger: silentLogger })

  const env = { NODE_ENV: 'test', MAX_REQUEST_BODY_BYTES: 64 * 1024 } as unknown as Env

  const app = createServer({
    env,
    logger: silentLogger,
    members: {
      listMyCourses: new ListMyCoursesService(entitlements, courses, progress, positions, clock),
      listCatalog: new ListCatalogService(courses, entitlements, clock),
      getMyCourse: new GetMyCourseService(checkAccess, courses, progress, positions, ratings),
      getLesson: new GetLessonService(
        checkAccess,
        courses,
        progress,
        positions,
        quizAttempts,
        clock,
      ),
      resolveAttachment: new GetAttachmentDownloadService(checkAccess, courses),
      resolveEbook: new GetEbookDownloadService(checkAccess, courses),
      markComplete: new MarkLessonCompleteService(
        checkAccess,
        courses,
        progress,
        quizAttempts,
        clock,
      ),
      getProgress: new GetCourseProgressService(checkAccess, courses, progress),
      savePosition: new SaveVideoPositionService(checkAccess, courses, positions, clock),
      getCourseRating: new GetCourseRatingService(checkAccess, ratings),
      saveCourseRating: new SaveCourseRatingService(checkAccess, ratings, clock),
      submitQuiz: new SubmitQuizAttemptService(
        checkAccess,
        courses,
        quizAttempts,
        () => randomUUID(),
        clock,
      ),
      internalToken: opts.internalToken,
    },
    webhooks: {
      grant,
      revoke,
      processed,
      webhookSecret: WEBHOOK_SECRET,
      toleranceSeconds: 300,
      now: clock,
      logger: silentLogger,
    },
    admin: {
      requireAdminEnabled: opts.requireAdmin ?? false,
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
    },
    content: {
      requireAdminEnabled: opts.requireAdmin ?? false,
      // O fake InMemoryCourseRepository implementa CourseRepository E ContentAdminRepository.
      courses: new CourseAdminService(courses, courses),
      modules: new ModuleAdminService(courses, courses),
      lessons: new LessonAdminService(courses, courses),
      blocks: new BlockAdminService(courses),
      attachments: new AttachmentAdminService(courses),
    },
  })

  return {
    app,
    entitlements,
    courses,
    progress,
    positions,
    quizAttempts,
    ratings,
    processed,
    catalog,
    clockRef,
  }
}

/** Curso de exemplo: 1 módulo, 2 aulas (a 1ª composta com 4 blocos + 1 anexo). */
export function seedSampleCourse(
  courses: InMemoryCourseRepository,
  slug = 'curso-demo',
  status: CourseStatus = 'published',
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
