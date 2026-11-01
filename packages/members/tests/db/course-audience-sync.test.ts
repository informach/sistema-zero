import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { CourseTransferPendingError } from '@sistemazero/core/course/publication'
import { defaultLessonSection, type LessonDraftDocument } from '@sistemazero/core/learning'
import { chaveDeVoz } from '@sistemazero/core/learning/scene'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Elysia } from 'elysia'
import { CoursePromotionProcessor } from '../../src/application/course-publication/course-promotion.processor'
import {
  CoursePromotionService,
  CoursePromotionSourceService,
} from '../../src/application/course-publication/course-promotion.service'
import { CoursePublicationService } from '../../src/application/course-publication/course-publication.service'
import { CoursePublicationWorker } from '../../src/application/course-publication/course-publication.worker'
import { hash, type MediaProof, sourceHash } from '../../src/domain/course-publication/course-sync'
import { readPublicationSource } from '../../src/domain/course-publication/jobs'
import type {
  CoursePublicationMediaPort,
  CoursePublicationTransferPort,
} from '../../src/domain/ports/course-publication.port'
import {
  createCoursePromotionPeerClient,
  createCoursePromotionSourceClient,
} from '../../src/infrastructure/course-publication/promotion-peer.client'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import { DrizzleCoursePublicationRepository } from '../../src/infrastructure/persistence/drizzle/course-publication.repository'
import {
  executeCourseSync as executeWithDependencies,
  type SyncRequest,
} from '../../src/infrastructure/persistence/drizzle/course-sync'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLessonDraftRepository } from '../../src/infrastructure/persistence/drizzle/lesson-draft.repository'
import { DrizzleProgressRepository } from '../../src/infrastructure/persistence/drizzle/progress.repository'
import {
  coursePublicationJobs,
  coursePublicationTasks,
  courses,
  lessonBlocks,
  lessonCompletions,
  lessonProgress,
  lessons,
  modules,
  zappyKnowledgeChunks,
  zappyKnowledgeSources,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleZappyKnowledgeRepository } from '../../src/infrastructure/persistence/drizzle/zappy-knowledge.repository'
import { parsePublicationSource } from '../../src/interfaces/http/course-publication-source.dtos'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'
import {
  coursePromotionPeerRoutes,
  coursePromotionSourceRoutes,
} from '../../src/interfaces/http/routes/course-promotion-peer.routes'
import { coursePublicationRoutes } from '../../src/interfaces/http/routes/course-publication.routes'
import { silentLogger } from '../fakes/in-memory'

const executeCourseSync = (
  db: Parameters<typeof executeWithDependencies>[0],
  request: SyncRequest,
) => executeWithDependencies(db, request, { parseBlock: parsePublishedLessonBlock })

const url = process.env.COURSE_SYNC_TEST_DATABASE_URL
if (
  url &&
  (!['localhost', '127.0.0.1'].includes(new URL(url).hostname) ||
    new URL(url).pathname !== '/sistemazero_course_sync_test')
)
  throw new Error('O teste exige Postgres local descartável sistemazero_course_sync_test')
const conn = url ? createDbConnection(url) : null

async function rejected(operation: Promise<unknown>): Promise<unknown> {
  try {
    await operation
    return null
  } catch (error) {
    return error
  }
}

describe.skipIf(!conn)('sincronização transacional de curso no Postgres', () => {
  beforeAll(async () => {
    if (!conn) throw new Error('Banco local ausente')
    await migrate(conn.db, {
      migrationsFolder: new URL(
        '../../src/infrastructure/persistence/drizzle/migrations',
        import.meta.url,
      ).pathname.replace(/^\/([A-Z]:)/, '$1'),
      migrationsTable: 'members_migrations',
    })
    // This URL is guarded above and belongs only to the disposable course publication tests.
    await conn.db.delete(coursePublicationJobs)
  }, 120_000)
  afterAll(async () => {
    await conn?.close()
  })

  async function fixture(secondInvalid = false) {
    if (!conn) throw new Error('Banco local ausente')
    const db = conn.db,
      now = new Date(),
      source = randomUUID(),
      target = randomUUID(),
      sm = randomUUID(),
      tm = randomUUID(),
      sl = randomUUID(),
      tl = randomUUID()
    const request: SyncRequest = {
      actorId: randomUUID(),
      environment: 'local',
      sourceSlug: source,
      targetSlug: target,
      mode: 'plan',
    }
    for (const [id, audience] of [
      [source, 'kids'],
      [target, 'adult'],
    ] as const)
      await db.insert(courses).values({
        id,
        slug: id,
        title: 'Minha busca',
        audience,
        status: id === source ? 'published' : 'draft',
        createdAt: now,
        updatedAt: now,
      })
    for (const [id, courseId] of [
      [sm, source],
      [tm, target],
    ] as const)
      await db
        .insert(modules)
        .values({ id, courseId, title: 'Módulo', sortOrder: 0, createdAt: now, updatedAt: now })
    for (const [id, courseId, moduleId] of [
      [sl, source, sm],
      [tl, target, tm],
    ] as const)
      await db.insert(lessons).values({
        id,
        courseId,
        moduleId,
        slug: 'aula-1',
        title: 'Aula',
        sortOrder: 0,
        isPublished: id === sl,
        createdAt: now,
        updatedAt: now,
      })
    const drafts = new DrizzleLessonDraftRepository(db, parsePublishedLessonBlock)
    const block = randomUUID()
    const document: LessonDraftDocument = {
      title: 'Aula completa',
      slug: 'aula-1',
      estimatedMinutes: 12,
      blocks: [{ id: block, content: { kind: 'dialogue', text: 'Observe o jogo.' } }],
      sections: [defaultLessonSection(randomUUID(), 'Observe', [block])],
      attachments: [],
      plannedVideos: [],
    }
    const initial = await drafts.read(sl)
    const saved = await drafts.replace(
      sl,
      request.actorId,
      initial.revision,
      randomUUID(),
      document,
    )
    await drafts.publish(sl, request.actorId, saved.revision, randomUUID(), [])
    const knowledge = new DrizzleZappyKnowledgeRepository(db)
    const authority = await knowledge.sourceAuthorityForRef(`block:${block}`)
    if (!authority) throw new Error('Fonte de teste ausente')
    await knowledge.upsert({
      ...authority,
      sourceRef: `block:${block}`,
      sourceType: 'rich-text',
      contentHash: hash('Observe o jogo.'),
      status: 'ready',
      chunks: [{ content: 'Observe o jogo.', normalizedText: 'observe o jogo' }],
      now,
    })
    if (secondInvalid) {
      const id = randomUUID(),
        blockId = randomUUID()
      await db.insert(lessons).values({
        id,
        courseId: source,
        moduleId: sm,
        slug: 'aula-2',
        title: 'Inválida',
        sortOrder: 1,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      })
      // Simulate a previously published legacy row now rejected by the real publication gate.
      await db.insert(lessonBlocks).values({
        id: blockId,
        lessonId: id,
        kind: 'dialogue',
        sortOrder: 0,
        content: { kind: 'dialogue', text: '' },
        contentRevision: randomUUID().replaceAll('-', ''),
      })
    }
    return { db, request, source, target, sl, tl, drafts }
  }
  async function prepared(request: SyncRequest) {
    if (!conn) throw new Error('Banco local ausente')
    const first = await executeCourseSync(conn.db, request)
    if (!first.snapshot) throw new Error('Plano ausente')
    const media: MediaProof = {
      environment: 'local',
      sourceHash: sourceHash(first.snapshot),
      checkedAt: new Date().toISOString(),
      readyVideoIds: [],
      voices: {},
      generated: 0,
      reused: 0,
    }
    const result = await executeCourseSync(conn.db, { ...request, media })
    if (!result.plan) throw new Error('Plano ausente')
    return { ...request, mode: 'apply' as const, media, expectedPlanHash: result.plan.planHash }
  }
  async function publicationFixture() {
    const f = await fixture()
    const initial = await executeCourseSync(f.db, f.request)
    if (!initial.snapshot || !initial.plan) throw new Error('Prévia ausente')
    const snapshot = initial.snapshot,
      plan = initial.plan
    const repo = new DrizzleCoursePublicationRepository(f.db, {
      parseBlock: parsePublishedLessonBlock,
    })
    const seed = {
      id: randomUUID(),
      requestKey: randomUUID(),
      actorId: f.request.actorId,
      operation: 'copy-adult' as const,
      snapshot,
      snapshotHash: hash(snapshot),
      planHash: plan.planHash,
      preview: {
        source: {
          id: f.source,
          title: snapshot.source.course.title,
          slug: f.request.sourceSlug,
          environment: 'local' as const,
        },
        target: {
          id: f.target,
          title: plan.course.title,
          slug: f.request.targetSlug,
          environment: 'local' as const,
          audience: 'adult' as const,
          exists: true,
        },
        modules: plan.modules.length,
        lessons: plan.lessons.length,
        retiredModules: plan.retirements.modules.length,
        retiredLessons: plan.retirements.lessons.length,
      },
    }
    await repo.create(seed)
    return { ...f, repo, seed }
  }
  test('worker promove em duas fases, espera o provedor sem falhar e publica mídia e tutor juntos', async () => {
    const f = await publicationFixture()
    await f.db.update(courses).set({ audience: 'kids' }).where(eq(courses.id, f.target))
    await f.db
      .update(courses)
      .set({
        coverImageUrl: 'https://stage.test/capa.png',
        metadata: { banner: 'https://stage.test/banner.png' },
      })
      .where(eq(courses.id, f.source))
    const source = await f.repo.sourceForPromotion(f.source)
    const promotion = new CoursePromotionService(f.repo)
    const job = await promotion.prepare({
      source,
      sourceHash: hash({ environment: 'staging', source }),
      actorId: f.request.actorId,
      requestKey: randomUUID(),
      targetSlug: f.request.targetSlug,
    })
    await f.repo.approve(job.id, job.version, job.planHash)
    const block = source.lessons[0]!.published.blocks[0]!
    const text = String(block.content.text)
    const media: CoursePublicationMediaPort = {
      plan: async () => ({
        profileHash: 'a'.repeat(64),
        voices: { [block.id]: [`voice:${hash(text)}`] },
        tasks: [
          { id: `voice:${hash(text)}`, input: { kind: 'voice', speechText: text } },
          {
            id: `knowledge:${hash(text)}`,
            input: {
              kind: 'knowledge',
              sourceRef: `block:${block.id}`,
              sourceType: 'rich-text',
              extraction: { kind: 'text', content: text },
            },
          },
        ],
      }),
      execute: async (task) =>
        task.kind === 'voice'
          ? {
              kind: 'voice',
              key: chaveDeVoz(task.speechText),
              url: 'https://prod.test/voice.mp3',
              generated: false,
            }
          : task.kind === 'knowledge'
            ? {
                kind: 'knowledge',
                sourceRef: task.sourceRef,
                sourceType: task.sourceType,
                content: text,
              }
            : { kind: 'video', videoId: task.videoId },
    }
    let waiting = true,
      verifications = 0
    const transfer: CoursePublicationTransferPort = {
      context: async () => ({
        version: 1,
        profileHash: 'b'.repeat(64),
        origin: {
          publicBaseUrl: 'https://stage.test',
          publicBucket: 'stage',
          privateBucket: 'stage-private',
        },
      }),
      execute: async (task) => {
        if (task.kind !== 'r2-copy') throw new Error('fixture')
        if (waiting && task.key === 'capa.png') throw new CourseTransferPendingError('transcode')
        return {
          kind: 'r2-copy',
          visibility: task.visibility,
          sourceKey: task.key,
          sourceEtag: 'v1',
          bytes: 42,
          destinationKey: `copy/${task.key}`,
          destinationEtag: 'copy-v1',
          url: `https://prod.test/copy/${task.key}`,
        }
      },
      verify: async () => {
        verifications++
      },
    }
    const origin = {
      read: async () => ({ source, sourceHash: hash({ environment: 'staging', source }) }),
    }
    const failures: unknown[] = []
    const worker = () =>
      new CoursePublicationWorker(
        f.repo,
        media,
        (_id, error) => failures.push(error),
        new CoursePromotionProcessor(f.repo, media, transfer, origin),
      )
    await worker().runOnce()
    expect(failures).toHaveLength(0)
    expect((await f.repo.view(job.id))?.status).toBe('preparing')
    expect((await f.repo.view(job.id))?.tasks).toEqual({ completed: 1, total: 2 })
    expect(await f.repo.claim()).toBeNull()
    expect((await f.db.select().from(courses).where(eq(courses.id, f.target)))[0]!.status).toBe(
      'draft',
    )
    waiting = false
    await f.db
      .update(coursePublicationTasks)
      .set({ updatedAt: new Date(0) })
      .where(eq(coursePublicationTasks.jobId, job.id))
    await f.db
      .update(coursePublicationJobs)
      .set({ availableAt: new Date(0) })
      .where(eq(coursePublicationJobs.id, job.id))
    await worker().runOnce()
    expect(failures).toEqual([])
    expect((await f.repo.view(job.id))?.status).toBe('completed')
    const target = (await f.db.select().from(courses).where(eq(courses.id, f.target)))[0]!
    expect(target.status).toBe('published')
    expect(target.coverImageUrl).toBe('https://prod.test/copy/capa.png')
    expect(verifications).toBe(2)
    expect(
      (await f.db.select().from(courses).where(eq(courses.id, f.source)))[0]!.coverImageUrl,
    ).toBe('https://stage.test/capa.png')
    expect(
      await f.db
        .select()
        .from(zappyKnowledgeSources)
        .where(eq(zappyKnowledgeSources.courseId, f.target)),
    ).toHaveLength(1)
  }, 30_000)
  test('tarefas e mudança de fase são atômicas no Postgres', async () => {
    const f = await publicationFixture()
    await f.repo.approve(f.seed.id, 0, f.seed.planHash)
    const claim = (await f.repo.claim())!
    await f.repo.initializeTasks(claim, [{ id: 'plan', kind: 'media-plan', input: {} }])
    const root = await f.repo.planTask(claim)
    expect(
      await rejected(
        f.repo.initializeTasks(
          claim,
          [{ id: 'voice:test', kind: 'voice', input: { kind: 'voice' } }],
          { taskId: randomUUID(), result: { phase: 'media' } },
        ),
      ),
    ).toBeInstanceOf(Error)
    expect(
      await f.db
        .select()
        .from(coursePublicationTasks)
        .where(eq(coursePublicationTasks.jobId, f.seed.id)),
    ).toHaveLength(1)
    expect((await f.repo.planTask(claim)).result).toBeNull()
    await f.repo.initializeTasks(claim, [], { taskId: root.id, result: { phase: 'media' } })
    expect((await f.repo.planTask(claim)).result).toEqual({ phase: 'media' })
    await f.repo.cancel(f.seed.id, (await f.repo.view(f.seed.id))!.version)
  }, 30_000)
  test('a porta entre ambientes só exporta captura aprovada e recusa origem alterada ou cancelada', async () => {
    const f = await publicationFixture()
    await f.db.update(courses).set({ audience: 'kids' }).where(eq(courses.id, f.target))
    const errors = () =>
      new Elysia().onError({ as: 'global' }, ({ code, error, set }) => {
        const result = buildErrorResponse({ code, error, logger: silentLogger })
        set.status = result.status
        return result.body
      })
    const token = 'production-peer-test-only-token-123456789'
    const exportToken = 'staging-export-test-only-token-1234567890'
    const production = errors().use(
      coursePromotionPeerRoutes({
        service: new CoursePromotionService(f.repo),
        token,
        enabled: true,
      }),
    )
    const peer = createCoursePromotionPeerClient(
      { url: 'http://production.local', token },
      (input, init) => production.handle(new Request(input, init)),
    )
    const staging = errors().use(
      coursePromotionSourceRoutes({
        service: new CoursePromotionSourceService(f.repo, peer),
        token: exportToken,
      }),
    )
    const sourceClient = createCoursePromotionSourceClient(
      {
        url: 'http://staging.local',
        token: exportToken,
        decodeSource: (value) => readPublicationSource(parsePublicationSource(value)),
      },
      (input, init) => staging.handle(new Request(input, init)),
    )
    const source = await f.repo.sourceForPromotion(f.source)
    expect(await peer.available()).toBe(true)
    const prepared = await peer.prepare({
      source,
      sourceHash: hash({ environment: 'staging', source }),
      actorId: f.request.actorId,
      requestKey: randomUUID(),
      targetSlug: f.request.targetSlug,
    })
    expect(prepared.preview.source.environment).toBe('staging')
    expect(prepared.preview.target.environment).toBe('production')
    expect(prepared.operation).toBe('promote-kids')
    expect(
      await rejected(sourceClient.read(prepared.id, new AbortController().signal)),
    ).toMatchObject({ code: 'COURSE_PUBLICATION_CONFLICT' })
    expect(
      (
        await production.handle(
          new Request(`http://local/members/internal/course-promotions/bindings/${prepared.id}`, {
            headers: { 'x-course-source-token': exportToken },
          }),
        )
      ).status,
    ).toBe(401)
    const approved = await peer.command(prepared.id, 'approve', prepared.version, prepared.planHash)
    try {
      const capture = await sourceClient.read(prepared.id, new AbortController().signal)
      expect(hash(capture.source)).toBe(hash(source))
      await f.db.update(courses).set({ title: 'Edição posterior' }).where(eq(courses.id, f.source))
      expect(
        await rejected(sourceClient.read(prepared.id, new AbortController().signal)),
      ).toMatchObject({ code: 'COURSE_PUBLICATION_CONFLICT' })
    } finally {
      await peer.command(prepared.id, 'cancel', approved.version, approved.planHash)
    }
    expect(
      await rejected(sourceClient.read(prepared.id, new AbortController().signal)),
    ).toMatchObject({ code: 'COURSE_PUBLICATION_CONFLICT' })
  }, 30_000)
  test('a captura privada confere a grade e o adiamento respeita prazo persistido do banco', async () => {
    const f = await publicationFixture()
    const source = await f.repo.sourceForPromotion(f.source)
    const raw = JSON.parse(JSON.stringify(source))
    expect(hash(readPublicationSource(parsePublicationSource(raw)))).toBe(hash(source))
    raw.modules[0].courseId = randomUUID()
    expect(() => parsePublicationSource(raw)).toThrow('grade')
    await f.repo.approve(f.seed.id, 0, f.seed.planHash)
    const first = (await f.repo.claim())!
    await f.repo.release(first, 60)
    expect(await f.repo.claim()).toBeNull()
    await f.db
      .update(coursePublicationJobs)
      .set({ availableAt: new Date(0) })
      .where(eq(coursePublicationJobs.id, f.seed.id))
    const next = (await f.repo.claim())!
    expect(next.id).toBe(f.seed.id)
    await f.db
      .update(coursePublicationJobs)
      .set({ deadlineAt: new Date(0) })
      .where(eq(coursePublicationJobs.id, f.seed.id))
    expect(await rejected(f.repo.renew(next))).toMatchObject({
      code: 'COURSE_PUBLICATION_LEASE_LOST',
    })
    expect(await f.repo.claim()).toBeNull()
    expect((await f.repo.view(f.seed.id))?.status).toBe('failed')
    expect((await f.repo.view(f.seed.id))?.error).toContain('duas horas')
  }, 30_000)
  test('promove uma origem externa com o mesmo ID e slug, sem tocar na origem física e exigindo material do tutor', async () => {
    const f = await fixture()
    const original = await executeCourseSync(f.db, f.request)
    await f.db.update(courses).set({ audience: 'kids' }).where(eq(courses.id, f.target))
    const source = structuredClone(original.snapshot!.source)
    // Different databases can legitimately have identical seeded IDs and slugs.
    source.course.id = f.target
    source.course.slug = f.request.targetSlug
    source.modules.forEach((module) => {
      module.courseId = f.target
    })
    source.lessons.forEach((lesson) => {
      lesson.row.courseId = f.target
    })
    const dependencies = {
      parseBlock: parsePublishedLessonBlock,
      promotionSource: { environment: 'staging' as const, content: source },
    }
    const request: SyncRequest = {
      ...f.request,
      environment: 'production',
      sourceSlug: f.request.targetSlug,
    }
    const initial = await executeWithDependencies(f.db, request, dependencies)
    const media: MediaProof = {
      environment: 'production',
      sourceHash: sourceHash(initial.snapshot!),
      checkedAt: new Date().toISOString(),
      readyVideoIds: [],
      voices: {},
      generated: 0,
      reused: 0,
      promotion: {
        origin: {
          publicBaseUrl: 'https://stage.test',
          publicBucket: 'testes',
          privateBucket: 'testes-privado',
        },
        replacements: {},
        videos: {},
      },
    }
    const plan = await executeWithDependencies(f.db, { ...request, media }, dependencies)
    expect(
      await rejected(
        executeWithDependencies(
          f.db,
          { ...request, mode: 'apply', media, expectedPlanHash: plan.plan!.planHash },
          dependencies,
        ),
      ),
    ).toBeInstanceOf(Error)
    const [unmodified] = await f.db.select().from(courses).where(eq(courses.id, f.target))
    expect(unmodified!.status).toBe('draft')
    const block = source.lessons[0]!.published.blocks[0]!
    media.knowledge = {
      sourceHash: media.sourceHash,
      sources: [
        {
          sourceRef: `block:${block.id}`,
          sourceType: 'rich-text',
          content: String(block.content.text),
        },
      ],
    }
    const fresh = await executeWithDependencies(f.db, { ...request, media }, dependencies)
    const [sourceBefore] = await f.db.select().from(courses).where(eq(courses.id, f.source))
    expect(
      await executeWithDependencies(
        f.db,
        { ...request, mode: 'apply', media, expectedPlanHash: fresh.plan!.planHash },
        dependencies,
      ),
    ).toMatchObject({
      verified: true,
      coursePublished: true,
      targetCourseId: f.target,
      knowledge: { copied: 1 },
    })
    const [sourceAfter] = await f.db.select().from(courses).where(eq(courses.id, f.source))
    expect(hash(sourceAfter)).toBe(hash(sourceBefore))
    const verified = await executeWithDependencies(
      f.db,
      { ...request, mode: 'verify', media },
      dependencies,
    )
    expect(verified.plan!.changed).toBe(false)
    expect(verified.snapshot!.target.lessons[0]!.row.id).toBe(f.tl)
  }, 30_000)
  test('rotas reais conferem identidade, prévia, versão e cancelamento no Postgres', async () => {
    const f = await publicationFixture()
    const app = new Elysia()
      .onError({ as: 'global' }, ({ code, error, set }) => {
        const response = buildErrorResponse({ code, error, logger: silentLogger })
        set.status = response.status
        return response.body
      })
      .use(
        coursePublicationRoutes({
          service: new CoursePublicationService(f.repo, 'local'),
          internalToken: 'publication-internal-test',
          requireAdminEnabled: true,
        }),
      )
    const request = (
      path: string,
      body?: unknown,
      role = 'admin',
      token = 'publication-internal-test',
    ) =>
      app.handle(
        new Request(`http://local/members/admin/course-publications${path}`, {
          method: body === undefined ? 'GET' : 'POST',
          headers: {
            'content-type': 'application/json',
            'x-internal-token': token,
            'x-auth-user-id': f.request.actorId,
            'x-auth-user-role': role,
            'x-auth-user-status': 'active',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      )
    expect((await request('/capabilities', undefined, 'staff')).status).toBe(200)
    const input = {
      sourceCourseId: f.source,
      targetSlug: f.request.targetSlug,
      requestKey: randomUUID(),
    }
    expect((await request('/preview', input, 'staff')).status).toBe(403)
    expect((await request('/preview', input, 'admin', 'wrong')).status).toBe(401)
    expect((await request('/preview', { ...input, actorId: randomUUID() })).status).toBe(400)
    const response = await request('/preview', input)
    expect(response.status).toBe(201)
    const view = (await response.json()) as {
      id: string
      version: number
      planHash: string
      status: string
    }
    expect(view.status).toBe('preview')
    expect(JSON.stringify(view)).not.toContain('snapshot')
    expect(JSON.stringify(view)).not.toContain('leaseToken')
    expect(
      (await request(`/${view.id}/approve`, { version: view.version, planHash: '0'.repeat(64) }))
        .status,
    ).toBe(409)
    expect(
      (await request(`/${view.id}/approve`, { version: view.version, planHash: view.planHash }))
        .status,
    ).toBe(200)
    const approved = (await f.repo.view(view.id))!
    expect(
      (
        await request(`/${view.id}/cancel`, {
          version: approved.version,
          planHash: approved.planHash,
        })
      ).status,
    ).toBe(200)
    expect((await f.repo.view(view.id))?.status).toBe('cancelled')
  }, 30_000)
  test('worker prepara, falha sem alterar o destino e retoma com publicação e índice atômicos', async () => {
    const f = await publicationFixture()
    const block = f.seed.snapshot.source.lessons[0]!.published.blocks[0]!
    const voiceKey = `voice:${'a'.repeat(64)}`
    const knowledgeKey = `knowledge:${'b'.repeat(64)}`
    const text = String(block.content.text)
    let unavailable = true,
      voiceCalls = 0
    const media: CoursePublicationMediaPort = {
      plan: async () => ({
        profileHash: 'c'.repeat(64),
        tasks: [
          { id: voiceKey, input: { kind: 'voice', speechText: text } },
          {
            id: knowledgeKey,
            input: {
              kind: 'knowledge',
              sourceRef: `block:${block.id}`,
              sourceType: 'rich-text',
              extraction: { kind: 'text', content: text },
            },
          },
        ],
        voices: { [block.id]: [voiceKey] },
      }),
      execute: async (task) => {
        if (task.kind === 'voice') {
          voiceCalls++
          return {
            kind: 'voice',
            key: chaveDeVoz(task.speechText),
            url: 'https://assets.example/voz.mp3',
            generated: false,
          }
        }
        if (unavailable) throw new Error('Serviço indisponível, dado privado')
        if (task.kind !== 'knowledge') throw new Error('Tarefa inesperada')
        return {
          kind: 'knowledge',
          sourceRef: task.sourceRef,
          sourceType: task.sourceType,
          content: text,
        }
      },
    }
    await f.repo.approve(f.seed.id, 0, f.seed.planHash)
    const worker = new CoursePublicationWorker(f.repo, media)
    await worker.runOnce()
    const failed = (await f.repo.view(f.seed.id))!
    expect(failed.status).toBe('failed')
    expect(failed.error).not.toContain('dado privado')
    const [before] = await f.db.select().from(courses).where(eq(courses.id, f.target))
    expect(before!.status).toBe('draft')
    unavailable = false
    await f.repo.resume(f.seed.id, failed.version, failed.planHash)
    await new CoursePublicationWorker(f.repo, media).runOnce()
    expect((await f.repo.view(f.seed.id))?.status).toBe('completed')
    const [after] = await f.db.select().from(courses).where(eq(courses.id, f.target))
    expect(after!.status).toBe('published')
    expect(
      await f.db
        .select()
        .from(zappyKnowledgeSources)
        .where(eq(zappyKnowledgeSources.courseId, f.target)),
    ).toHaveLength(1)
    expect(voiceCalls).toBeGreaterThan(0)
    expect(await rejected(f.repo.resume(f.seed.id, failed.version, failed.planHash))).toMatchObject(
      { code: 'COURSE_PUBLICATION_CONFLICT' },
    )
  }, 30_000)
  test('o trabalho durável é idempotente e só um processo consegue assumir a execução', async () => {
    const f = await publicationFixture()
    expect(await f.repo.create(f.seed)).toBe(f.seed.id)
    await f.repo.approve(f.seed.id, 0, f.seed.planHash)
    const other = createDbConnection(url!, { max: 1 })
    try {
      const second = new DrizzleCoursePublicationRepository(other.db, {
        parseBlock: parsePublishedLessonBlock,
      })
      const claims = await Promise.all([f.repo.claim(), second.claim()])
      expect(claims.filter(Boolean)).toHaveLength(1)
      const claim = claims.find((c) => c !== null)!
      expect((await f.repo.view(f.seed.id))?.status).toBe('preparing')
      const captured = await f.repo.capture(f.seed.id)
      expect(captured?.snapshot.source.course.createdAt).toBeInstanceOf(Date)
      await f.repo.initializeTasks(claim, [
        { id: 'media-plan', kind: 'media-plan', input: {} },
        { id: 'voice-1', kind: 'voice', input: { speech: 'Observe o jogo.' } },
      ])
      const planTask = await f.repo.nextTask(claim)
      expect(planTask?.kind).toBe('media-plan')
      await f.repo.finishTask(claim, planTask!.id, { taskKeys: ['voice-1'] })
      const task = await f.repo.nextTask(claim)
      expect(task?.kind).toBe('voice')
      const media = (await prepared(f.request)).media
      expect(await rejected(f.repo.publishMirror(claim, media))).toMatchObject({
        message: expect.stringContaining('ainda não terminou'),
      })
      await f.repo.finishTask(claim, task!.id, { voiceUrl: 'https://assets.example/audio.mp3' })
      await f.repo.publishMirror(claim, media)
      const view = await f.repo.view(f.seed.id)
      expect(view).toMatchObject({ status: 'completed', tasks: { completed: 1, total: 1 } })
      expect(Object.keys(view!)).not.toContain('snapshot')
      expect(Object.keys(view!)).not.toContain('leaseToken')
      expect(await rejected(f.repo.finishTask(claim, task!.id, {}))).toMatchObject({
        code: 'COURSE_PUBLICATION_LEASE_LOST',
      })
    } finally {
      await other.close()
    }
  }, 30_000)
  test('cancelamento e lease vencido impedem o processo antigo de gravar', async () => {
    const f = await publicationFixture()
    await f.repo.approve(f.seed.id, 0, f.seed.planHash)
    const old = await f.repo.claim()
    expect(old).not.toBeNull()
    await f.db
      .update(coursePublicationJobs)
      .set({ leaseUntil: new Date(0) })
      .where(eq(coursePublicationJobs.id, f.seed.id))
    expect(await rejected(f.repo.renew(old!))).toMatchObject({
      code: 'COURSE_PUBLICATION_LEASE_LOST',
    })
    const next = await f.repo.claim()
    expect(next?.token).not.toBe(old?.token)
    const view = await f.repo.view(f.seed.id)
    await f.repo.cancel(f.seed.id, view!.version)
    expect(await rejected(f.repo.initializeTasks(next!, []))).toMatchObject({
      code: 'COURSE_PUBLICATION_LEASE_LOST',
    })
    expect((await f.repo.view(f.seed.id))?.status).toBe('cancelled')
    expect((await f.db.select().from(courses).where(eq(courses.id, f.target)))[0]?.status).toBe(
      'draft',
    )
  }, 30_000)
  test('publica, mantém o progresso e os IDs e a repetição não escreve', async () => {
    const f = await fixture(),
      userId = randomUUID()
    await f.db.insert(lessonProgress).values({
      userId,
      lessonId: f.tl,
      courseId: f.target,
      id: randomUUID(),
      positionSeconds: 9,
      updatedAt: new Date(),
    })
    const applied = await executeCourseSync(f.db, await prepared(f.request))
    expect(applied).toMatchObject({
      applied: true,
      verified: true,
      sourceUnchanged: true,
      coursePublished: true,
      lessons: 1,
      knowledge: { copied: 1, unavailable: 0 },
    })
    const [lesson] = await f.db.select().from(lessons).where(eq(lessons.id, f.tl))
    expect(lesson?.isPublished).toBe(true)
    expect(lesson?.title).toBe('Aula completa')
    const [progress] = await f.db
      .select()
      .from(lessonProgress)
      .where(eq(lessonProgress.lessonId, f.tl))
    expect(progress?.positionSeconds).toBe(9)
    const second = await prepared(f.request)
    const [before] = await f.db.select().from(courses).where(eq(courses.id, f.target))
    expect(await executeCourseSync(f.db, second)).toMatchObject({ applied: false, verified: true })
    const [after] = await f.db.select().from(courses).where(eq(courses.id, f.target))
    expect(hash(before)).toBe(hash(after))
  }, 30_000)
  test('cria o curso adulto ausente e não duplica numa nova execução', async () => {
    const f = await fixture()
    await f.db.delete(courses).where(eq(courses.id, f.target))
    const request = await prepared(f.request)
    const before = await f.db.select().from(courses).where(eq(courses.slug, f.request.targetSlug))
    expect(before).toHaveLength(0)
    expect(await executeCourseSync(f.db, request)).toMatchObject({
      applied: true,
      verified: true,
      coursePublished: true,
    })
    const after = await f.db.select().from(courses).where(eq(courses.slug, f.request.targetSlug))
    expect(after).toHaveLength(1)
    expect(after[0]!.audience).toBe('adult')
    expect(await executeCourseSync(f.db, await prepared(f.request))).toMatchObject({
      applied: false,
    })
    expect(
      await f.db.select().from(courses).where(eq(courses.slug, f.request.targetSlug)),
    ).toHaveLength(1)
  }, 30_000)
  test('substitui a grade antiga sem apagar o histórico e pode restaurar a mesma aula', async () => {
    const f = await fixture()
    const oldModule = randomUUID(),
      oldLesson = randomUUID(),
      oldBlock = randomUUID()
    const now = new Date()
    await f.db.insert(modules).values({
      id: oldModule,
      courseId: f.target,
      title: 'Antigo',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })
    await f.db.insert(lessons).values({
      id: oldLesson,
      courseId: f.target,
      moduleId: oldModule,
      slug: 'aula-antiga',
      title: 'Antiga',
      sortOrder: 0,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    })
    await f.db.insert(lessonBlocks).values({
      id: oldBlock,
      lessonId: oldLesson,
      kind: 'dialogue',
      sortOrder: 0,
      content: { kind: 'dialogue', text: 'Conteúdo antigo.' },
      contentRevision: randomUUID().replaceAll('-', ''),
    })
    const progressId = randomUUID(),
      learner = randomUUID()
    await f.db.insert(lessonProgress).values({
      id: progressId,
      userId: learner,
      lessonId: oldLesson,
      courseId: f.target,
      positionSeconds: 21,
      updatedAt: now,
    })
    const progress = new DrizzleProgressRepository(f.db)
    await progress.markComplete(learner, oldLesson, f.target, now)
    await progress.markComplete(learner, f.tl, f.target, now)
    const request = await prepared(f.request)
    await executeCourseSync(f.db, request)
    const reader = new DrizzleCourseRepository(f.db)
    const admin = new DrizzleContentAdminRepository(f.db)
    expect((await reader.findOutline(f.target)).flatMap((m) => m.lessons).map((l) => l.id)).toEqual(
      [f.tl],
    )
    expect(await reader.countLessons(f.target)).toBe(1)
    expect(await progress.countCompletedPublished(learner, f.target)).toBe(1)
    expect(await progress.countCompleted(learner, f.target)).toBe(1)
    expect(
      (await progress.countCompletedByUsersAndCourseIds([learner], [f.target]))
        .get(learner)
        ?.get(f.target),
    ).toBe(1)
    expect(await progress.listCompletedLessonIds(learner, f.target)).toContain(oldLesson)
    expect(
      await f.db.select().from(lessonCompletions).where(eq(lessonCompletions.userId, learner)),
    ).toHaveLength(2)
    expect(await reader.findLessonWithContent(oldLesson)).toBeNull()
    expect(await admin.findLessonById(oldLesson)).toBeNull()
    expect(await admin.listModuleIds(f.target)).not.toContain(oldModule)
    await f.db.update(modules).set({ sortOrder: -1000000 }).where(eq(modules.id, oldModule))
    await admin.reorderModules(f.target, await admin.listModuleIds(f.target))
    expect((await f.db.select().from(modules).where(eq(modules.id, oldModule)))[0]?.sortOrder).toBe(
      -1000000,
    )
    expect(await rejected(f.drafts.read(oldLesson))).toBeInstanceOf(Error)
    const [retired] = await f.db.select().from(lessons).where(eq(lessons.id, oldLesson))
    expect(retired?.archivedAt).toBeInstanceOf(Date)
    expect(retired?.isPublished).toBe(false)
    const [block] = await f.db.select().from(lessonBlocks).where(eq(lessonBlocks.id, oldBlock))
    expect(block?.archivedAt).toBeInstanceOf(Date)
    expect(
      (await f.db.select().from(lessonProgress).where(eq(lessonProgress.id, progressId)))[0]
        ?.positionSeconds,
    ).toBe(21)
    expect(await executeCourseSync(f.db, await prepared(f.request))).toMatchObject({
      applied: false,
    })
    // A source lesson with the same slug revives the destination identity, never a duplicate.
    const sourceModule = (
      await f.db.select().from(modules).where(eq(modules.courseId, f.source))
    )[0]!
    const sourceLesson = randomUUID(),
      sourceBlock = randomUUID()
    await f.db.insert(lessons).values({
      id: sourceLesson,
      courseId: f.source,
      moduleId: sourceModule.id,
      slug: 'aula-antiga',
      title: 'Restaurada',
      sortOrder: 1,
      isPublished: false,
      createdAt: now,
      updatedAt: now,
    })
    const document: LessonDraftDocument = {
      title: 'Restaurada',
      slug: 'aula-antiga',
      estimatedMinutes: 10,
      blocks: [
        {
          id: sourceBlock,
          content: {
            kind: 'materials',
            items: [{ id: 'material', kind: 'text', markdown: 'Nova versão.' }],
          },
        },
      ],
      sections: [defaultLessonSection(randomUUID(), 'Comece', [sourceBlock])],
      attachments: [],
      plannedVideos: [],
    }
    const initial = await f.drafts.read(sourceLesson)
    const saved = await f.drafts.replace(
      sourceLesson,
      f.request.actorId,
      initial.revision,
      randomUUID(),
      document,
    )
    await f.drafts.publish(sourceLesson, f.request.actorId, saved.revision, randomUUID(), [])
    await executeCourseSync(f.db, await prepared(f.request))
    expect((await reader.findLesson(oldLesson))?.title).toBe('Restaurada')
    expect(await progress.countCompletedPublished(learner, f.target)).toBe(2)
    expect(
      (await f.db.select().from(lessons).where(eq(lessons.id, oldLesson)))[0]?.archivedAt,
    ).toBeNull()
    expect(
      (await f.db.select().from(lessonProgress).where(eq(lessonProgress.id, progressId)))[0]
        ?.positionSeconds,
    ).toBe(21)
    expect(await executeCourseSync(f.db, await prepared(f.request))).toMatchObject({
      applied: false,
    })
  }, 30_000)
  test('uma falha posterior desfaz também o arquivamento da grade antiga', async () => {
    const f = await fixture(true),
      now = new Date(),
      old = randomUUID()
    const [module] = await f.db.select().from(modules).where(eq(modules.courseId, f.target))
    await f.db.insert(lessons).values({
      id: old,
      moduleId: module!.id,
      courseId: f.target,
      slug: 'aula-removida',
      title: 'Antiga',
      sortOrder: 1,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    })
    const before = await executeCourseSync(f.db, f.request)
    expect(await rejected(executeCourseSync(f.db, await prepared(f.request)))).toBeInstanceOf(Error)
    expect(hash(await executeCourseSync(f.db, f.request))).toBe(hash(before))
    expect((await f.db.select().from(lessons).where(eq(lessons.id, old)))[0]?.archivedAt).toBeNull()
  }, 30_000)
  test('uma falha de publicação também desfaz a criação de um curso ausente', async () => {
    const f = await fixture(true)
    await f.db.delete(courses).where(eq(courses.id, f.target))
    const error = await rejected(executeCourseSync(f.db, await prepared(f.request)))
    expect(error).toBeInstanceOf(Error)
    expect(
      await f.db.select().from(courses).where(eq(courses.slug, f.request.targetSlug)),
    ).toHaveLength(0)
  }, 30_000)
  test('recusa publicar sem o material do Zappy, inclusive quando não há índice algum', async () => {
    const f = await fixture()
    await f.db.delete(zappyKnowledgeSources).where(eq(zappyKnowledgeSources.courseId, f.source))
    const before = await executeCourseSync(f.db, f.request)
    const error = await rejected(executeCourseSync(f.db, await prepared(f.request)))
    expect(error).toMatchObject({ message: expect.stringContaining('conteúdo do Zappy') })
    expect(hash(await executeCourseSync(f.db, f.request))).toBe(hash(before))
  }, 30_000)
  test('instala material preparado sem depender de índice prévio nem alterar o índice da origem', async () => {
    const f = await fixture()
    const first = await executeCourseSync(f.db, f.request)
    const sourceBlock = first.snapshot!.source.lessons[0]!.published.blocks[0]!
    await f.db.delete(zappyKnowledgeSources).where(eq(zappyKnowledgeSources.courseId, f.source))
    const request = await prepared(f.request)
    request.media.knowledge = {
      sourceHash: request.media.sourceHash,
      sources: [
        {
          sourceRef: `block:${sourceBlock.id}`,
          sourceType: 'rich-text',
          content: String(sourceBlock.content.text),
        },
      ],
    }
    const plan = await executeCourseSync(f.db, { ...f.request, media: request.media })
    request.expectedPlanHash = plan.plan!.planHash
    expect(await executeCourseSync(f.db, request)).toMatchObject({
      verified: true,
      knowledge: { copied: 1 },
    })
    expect(
      await f.db
        .select()
        .from(zappyKnowledgeSources)
        .where(eq(zappyKnowledgeSources.courseId, f.source)),
    ).toHaveLength(0)
    const [indexed] = await f.db
      .select()
      .from(zappyKnowledgeSources)
      .where(eq(zappyKnowledgeSources.courseId, f.target))
    const chunks = await f.db
      .select()
      .from(zappyKnowledgeChunks)
      .where(eq(zappyKnowledgeChunks.sourceId, indexed!.id))
    expect(chunks[0]?.content).toBe(String(sourceBlock.content.text))
  }, 30_000)
  test('repara o índice ausente sem republicar o curso e as aulas', async () => {
    const f = await fixture()
    await executeCourseSync(f.db, await prepared(f.request))
    const [before] = await f.db.select().from(courses).where(eq(courses.id, f.target))
    await f.db.delete(zappyKnowledgeSources).where(eq(zappyKnowledgeSources.courseId, f.target))
    expect(await executeCourseSync(f.db, await prepared(f.request))).toMatchObject({
      applied: true,
      contentChanged: false,
      knowledge: { copied: 1, unavailable: 0 },
    })
    const [after] = await f.db.select().from(courses).where(eq(courses.id, f.target))
    expect(hash(after)).toBe(hash(before))
  }, 30_000)
  test('a conferência final é somente leitura e recusa um Zappy sem material', async () => {
    const f = await fixture()
    await executeCourseSync(f.db, await prepared(f.request))
    const request = { ...(await prepared(f.request)), mode: 'verify' as const }
    expect((await executeCourseSync(f.db, request)).knowledge).toMatchObject({ unchanged: true })
    await f.db.delete(zappyKnowledgeSources).where(eq(zappyKnowledgeSources.courseId, f.target))
    expect(await rejected(executeCourseSync(f.db, request))).toMatchObject({
      message: expect.stringContaining('material do Zappy'),
    })
    expect(
      await f.db
        .select()
        .from(zappyKnowledgeSources)
        .where(eq(zappyKnowledgeSources.courseId, f.target)),
    ).toHaveLength(0)
  }, 30_000)
  test('confere os trechos reais do Zappy, mesmo quando o cabeçalho continua pronto', async () => {
    const f = await fixture()
    await executeCourseSync(f.db, await prepared(f.request))
    const [target] = await f.db
      .select()
      .from(zappyKnowledgeSources)
      .where(eq(zappyKnowledgeSources.courseId, f.target))
    await f.db.delete(zappyKnowledgeChunks).where(eq(zappyKnowledgeChunks.sourceId, target!.id))
    expect(
      await rejected(executeCourseSync(f.db, { ...(await prepared(f.request)), mode: 'verify' })),
    ).toBeInstanceOf(Error)
    expect(await executeCourseSync(f.db, await prepared(f.request))).toMatchObject({
      contentChanged: false,
      knowledge: { copied: 1 },
    })
    const [repaired] = await f.db
      .select()
      .from(zappyKnowledgeSources)
      .where(eq(zappyKnowledgeSources.courseId, f.target))
    expect(
      await f.db
        .select()
        .from(zappyKnowledgeChunks)
        .where(eq(zappyKnowledgeChunks.sourceId, repaired!.id)),
    ).toHaveLength(1)
    const [source] = await f.db
      .select()
      .from(zappyKnowledgeSources)
      .where(eq(zappyKnowledgeSources.courseId, f.source))
    await f.db.delete(zappyKnowledgeChunks).where(eq(zappyKnowledgeChunks.sourceId, source!.id))
    expect(await rejected(executeCourseSync(f.db, await prepared(f.request)))).toMatchObject({
      message: expect.stringContaining('trechos do Zappy'),
    })
  }, 30_000)
  test('um erro real na segunda publicação desfaz a primeira e as criações', async () => {
    const f = await fixture(true)
    const request = await prepared(f.request)
    const before = await executeCourseSync(f.db, f.request)
    let failure: unknown
    try {
      await executeCourseSync(f.db, request)
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(Error)
    const after = await executeCourseSync(f.db, f.request)
    expect(hash(after)).toBe(hash(before))
  }, 30_000)
  test('edição posterior ao plano e mídia vencida recusam antes de escrever', async () => {
    const f = await fixture(),
      request = await prepared(f.request)
    await f.db.update(courses).set({ title: 'Edição concorrente' }).where(eq(courses.id, f.target))
    expect(await rejected(executeCourseSync(f.db, request))).toMatchObject({
      message: expect.stringContaining('plano mudou'),
    })
    const fresh = await prepared(f.request)
    fresh.media.checkedAt = '2000-01-01T00:00:00Z'
    const edited = await executeCourseSync(f.db, { ...f.request, media: fresh.media })
    if (!edited.plan) throw new Error('Plano ausente')
    fresh.expectedPlanHash = edited.plan.planHash
    expect(await rejected(executeCourseSync(f.db, fresh))).toMatchObject({
      message: expect.stringContaining('30 minutos'),
    })
  }, 30_000)
})
