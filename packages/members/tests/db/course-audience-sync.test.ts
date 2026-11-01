import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection, type LessonDraftDocument } from '@sistemazero/core/learning'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { hash, type MediaProof, sourceHash } from '../../scripts/course-audience-sync/plan'
import { executeCourseSync, type SyncRequest } from '../../scripts/course-audience-sync/run'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLessonDraftRepository } from '../../src/infrastructure/persistence/drizzle/lesson-draft.repository'
import { DrizzleProgressRepository } from '../../src/infrastructure/persistence/drizzle/progress.repository'
import {
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
