import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection, type LessonDraftDocument } from '@sistemazero/core/learning'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { hash, type MediaProof, sourceHash } from '../../scripts/course-audience-sync/plan'
import { executeCourseSync, type SyncRequest } from '../../scripts/course-audience-sync/run'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLessonDraftRepository } from '../../src/infrastructure/persistence/drizzle/lesson-draft.repository'
import {
  courses,
  lessonBlocks,
  lessonProgress,
  lessons,
  modules,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleZappyKnowledgeRepository } from '../../src/infrastructure/persistence/drizzle/zappy-knowledge.repository'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'

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
