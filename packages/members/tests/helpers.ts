import { randomUUID } from 'node:crypto'
import { signHmac } from '@sistemazero/core/security'
import { CheckAccessService } from '../src/application/access/check-access.service'
import { GetCourseProgressService } from '../src/application/get-course-progress/get-course-progress.service'
import { GetLessonService } from '../src/application/get-lesson/get-lesson.service'
import { GetMyCourseService } from '../src/application/get-my-course/get-my-course.service'
import { GrantEntitlementService } from '../src/application/grant-entitlement/grant-entitlement.service'
import { ListMyCoursesService } from '../src/application/list-my-courses/list-my-courses.service'
import { MarkLessonCompleteService } from '../src/application/mark-lesson-complete/mark-lesson-complete.service'
import { RevokeEntitlementService } from '../src/application/revoke-entitlement/revoke-entitlement.service'
import { EntitlementAggregate } from '../src/domain/entitlement/entitlement.aggregate'
import type { ResolvedOffer } from '../src/domain/ports/catalog-gateway.port'
import type { Env } from '../src/infrastructure/config/env'
import { createServer } from '../src/interfaces/http/server'
import {
  FakeCatalogGateway,
  InMemoryCourseRepository,
  InMemoryEntitlementRepository,
  InMemoryProcessedWebhookRepository,
  InMemoryProgressRepository,
  silentLogger,
} from './fakes/in-memory'

export const WEBHOOK_SECRET = 'test-gateway-secret-0123456789ab'

export function buildApp(opts: { now?: Date } = {}) {
  const clockRef = { now: opts.now ?? new Date('2026-06-02T12:00:00.000Z') }
  const clock = () => clockRef.now

  const entitlements = new InMemoryEntitlementRepository()
  const courses = new InMemoryCourseRepository()
  const progress = new InMemoryProgressRepository()
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
      listMyCourses: new ListMyCoursesService(entitlements, courses, progress, clock),
      getMyCourse: new GetMyCourseService(checkAccess, courses, progress),
      getLesson: new GetLessonService(checkAccess, courses, progress),
      markComplete: new MarkLessonCompleteService(checkAccess, courses, progress, clock),
      getProgress: new GetCourseProgressService(checkAccess, courses, progress),
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
  })

  return { app, entitlements, courses, progress, processed, catalog, clockRef }
}

/** Curso de exemplo: 1 módulo, 2 aulas (a 1ª composta com 3 blocos + 1 anexo). */
export function seedSampleCourse(courses: InMemoryCourseRepository, slug = 'curso-demo') {
  const now = new Date('2026-06-01T00:00:00.000Z')
  const courseId = randomUUID()
  const moduleId = randomUUID()
  const lesson1 = randomUUID()
  const lesson2 = randomUUID()
  courses.courses.push({
    id: courseId,
    slug,
    title: 'Curso Demo',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    status: 'published',
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
  })
  courses.lessons.push({
    id: lesson2,
    moduleId,
    courseId,
    slug: 'aula-2',
    title: 'Aula 2',
    sortOrder: 1,
    estimatedMinutes: 7,
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
  return { courseId, slug, moduleId, lessonIds: [lesson1, lesson2] as const }
}

/** Concede uma matrícula vitalícia diretamente (sem passar pelo webhook). */
export function grantLifetime(
  entitlements: InMemoryEntitlementRepository,
  opts: { userId: string; courseRef: string; now?: Date },
): EntitlementAggregate {
  const now = opts.now ?? new Date('2026-06-01T00:00:00.000Z')
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
    sourceKind: 'manual',
    sourceId: 'seed',
    grantedAt: now,
    expiresAt: null,
    idempotencyKey: `manual:${opts.userId}:${opts.courseRef}`,
  })
  entitlements.seed(e)
  return e
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

/** Headers assinados (HMAC de borda do gateway) para um webhook de entrada. */
export function signedWebhookHeaders(rawBody: string, deliveryId?: string): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000)
  const sig = signHmac(WEBHOOK_SECRET, rawBody, ts)
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-signature': `t=${ts},v1=${sig}`,
  }
  if (deliveryId) headers['x-delivery-id'] = deliveryId
  return headers
}
