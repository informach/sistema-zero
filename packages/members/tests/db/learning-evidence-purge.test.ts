import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { defaultLessonSection } from '@sistemazero/core/learning'
import { eq, sql as query } from 'drizzle-orm'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLearningRepository } from '../../src/infrastructure/persistence/drizzle/learning.repository'
import { lockLessonStructure } from '../../src/infrastructure/persistence/drizzle/lesson-structure'
import { DrizzleQuizAttemptRepository } from '../../src/infrastructure/persistence/drizzle/quiz-attempt.repository'
import {
  courses,
  lessonBlocks,
  lessonEvidence,
  lessonStructures,
  lessons,
  modules,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleStudioSubmissionRepository } from '../../src/infrastructure/persistence/drizzle/studio-submission.repository'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'

const url = process.env.LEARNING_QA_DATABASE_URL
if (
  url &&
  (!/^\/sz_aulas_qa_[a-z0-9_]+$/.test(new URL(url).pathname) ||
    new URL(url).hostname !== 'localhost')
)
  throw new Error('Only a disposable local database is allowed')
const connection = url ? createDbConnection(url) : null
const get = () => {
  if (!connection) throw new Error('Missing disposable database')
  return connection
}
const latch = () => {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

describe.skipIf(!url)('Evidências e exclusão da conta — PostgreSQL', () => {
  beforeAll(async () => {
    const { sql } = get()
    const [state] = await sql`select to_regnamespace('members') as present`
    if (state?.present) throw new Error('Database must be empty')
    for (const migration of readMigrationFiles({
      migrationsFolder: resolve(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
    }))
      for (const statement of migration.sql) if (statement.trim()) await sql.unsafe(statement)
  })
  afterAll(async () => {
    await connection?.close()
  })
  async function fixture() {
    const { db } = get(),
      now = new Date()
    const courseId = randomUUID(),
      moduleId = randomUUID(),
      lessonId = randomUUID(),
      blockId = randomUUID(),
      sectionId = randomUUID(),
      revision = randomUUID()
    const owner = { userId: randomUUID(), accountId: randomUUID() }
    await db.insert(courses).values({
      id: courseId,
      slug: courseId,
      title: 'Revisão',
      audience: 'kids',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(modules).values({
      id: moduleId,
      courseId,
      title: 'Unidade',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(lessons).values({
      id: lessonId,
      moduleId,
      courseId,
      slug: 'aula',
      title: 'Aula',
      sortOrder: 0,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(lessonBlocks).values({
      id: blockId,
      lessonId,
      kind: 'studio',
      content: { kind: 'studio', initialProject: {} },
      sortOrder: 0,
      contentRevision: 'a'.repeat(32),
    })
    await db.insert(lessonStructures).values({
      lessonId,
      revision,
      sections: [
        {
          ...defaultLessonSection(sectionId, 'Etapa', []),
          workspaceBlockId: blockId,
          completion: {
            version: 1,
            blockIds: [],
            projectChecks: [{ id: 'loop', label: 'Repetir', rule: { type: 'usesLoop' } }],
          },
        },
      ],
    })
    const purge = (userIds = [owner.userId, owner.accountId]) =>
      new DrizzleUserDataPurgeRepository(db).purgeForUser({
        userIds,
        accountId: owner.accountId,
        cleanup: { id: randomUUID(), prefixes: [], notBefore: now, createdAt: now },
      })
    return { courseId, lessonId, blockId, sectionId, revision, owner, now, purge }
  }
  async function waitForBlockedLocks(count: number) {
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      const [row] = await get()
        .sql`select count(*)::int as n from pg_locks where locktype = 'advisory' and not granted and database = (select oid from pg_database where datname = current_database())`
      if ((row?.n ?? 0) >= count) return
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error(`Did not observe ${count} blocked locks`)
  }
  test('checkpoint em andamento é removido mesmo se o perfil não estava na enumeração da exclusão', async () => {
    const f = await fixture(),
      { db } = get(),
      repo = new DrizzleLearningRepository(db)
    const ready = latch(),
      release = latch()
    const holder = db.transaction(async (tx) => {
      await lockLessonStructure(tx, f.lessonId)
      ready.release()
      await release.promise
    })
    await ready.promise
    const save = repo.saveSectionProgress(
      f.owner,
      f.lessonId,
      f.revision,
      [
        {
          sectionId: f.sectionId,
          revision: 'a'.repeat(32),
          completedAt: null,
          projectPassed: true,
        },
      ],
      [{ id: f.blockId, revision: 'a'.repeat(32) }],
      {
        id: randomUUID(),
        kind: 'section_project',
        sectionId: f.sectionId,
        blockId: f.blockId,
        revision: 'a'.repeat(32),
        createdAt: f.now.toISOString(),
        payload: { project: { text: 'Trabalho da criança' } },
      },
    )
    let purge: Promise<void> | undefined
    try {
      await waitForBlockedLocks(1)
      purge = f.purge([f.owner.accountId])
      await waitForBlockedLocks(2)
    } finally {
      release.release()
    }
    await Promise.all([holder, save, purge])
    expect(await repo.getSectionProgress(f.owner, f.lessonId)).toEqual([])
    expect(await repo.listEvidence(f.owner, f.lessonId)).toHaveLength(0)
  })
  test('quiz e entrega recusam gravações depois da cerca de exclusão', async () => {
    const f = await fixture(),
      { db } = get()
    const quizId = randomUUID()
    await db.insert(lessonBlocks).values({
      id: quizId,
      lessonId: f.lessonId,
      kind: 'quiz',
      sortOrder: 1,
      contentRevision: 'a'.repeat(32),
      content: {
        kind: 'quiz',
        passingScore: 100,
        questions: [
          {
            id: 'q',
            prompt: 'Qual?',
            choices: [
              { id: 'a', label: 'A' },
              { id: 'b', label: 'B' },
            ],
            correctChoiceIds: ['a'],
          },
        ],
      },
    })
    await f.purge()
    const quizError = await new DrizzleQuizAttemptRepository(db)
      .save(
        {
          id: randomUUID(),
          ...f.owner,
          lessonId: f.lessonId,
          courseId: f.courseId,
          blockId: quizId,
          answers: { q: ['a'] },
          score: 100,
          passed: true,
          createdAt: f.now,
        },
        { cooldownMs: 0, revision: 'a'.repeat(32) },
      )
      .then(
        () => null,
        (error: unknown) => error,
      )
    const studioError = await new DrizzleStudioSubmissionRepository(db)
      .upsert(
        {
          id: randomUUID(),
          ...f.owner,
          blockId: f.blockId,
          lessonId: f.lessonId,
          courseId: f.courseId,
          project: { text: 'Trabalho após exclusão' },
          submittedAt: f.now,
        },
        { revision: 'a'.repeat(32) },
      )
      .then(
        () => null,
        (error: unknown) => error,
      )
    expect(quizError).toBeInstanceOf(Error)
    expect(studioError).toBeInstanceOf(Error)
    expect(await new DrizzleLearningRepository(db).listEvidence(f.owner, f.lessonId)).toHaveLength(
      0,
    )
  })
  test.each([
    'quiz',
    'studio',
  ] as const)('purge waits for an in-flight %s and removes its evidence', async (kind) => {
    const f = await fixture(),
      { db } = get()
    const ready = latch(),
      release = latch()
    const holder = db.transaction(async (tx) => {
      await tx.execute(
        query`select pg_advisory_xact_lock(hashtextextended(${`${f.owner.userId}:${f.blockId}`}, 0))`,
      )
      ready.release()
      await release.promise
    })
    await ready.promise
    const save =
      kind === 'quiz'
        ? new DrizzleQuizAttemptRepository(db).save({
            id: randomUUID(),
            ...f.owner,
            lessonId: f.lessonId,
            courseId: f.courseId,
            blockId: f.blockId,
            answers: {},
            score: 100,
            passed: true,
            createdAt: f.now,
          })
        : new DrizzleStudioSubmissionRepository(db).upsert({
            id: randomUUID(),
            ...f.owner,
            lessonId: f.lessonId,
            courseId: f.courseId,
            blockId: f.blockId,
            project: {},
            submittedAt: f.now,
          })
    let purge: Promise<void> | undefined
    try {
      await waitForBlockedLocks(1)
      purge = f.purge()
      await waitForBlockedLocks(2)
    } finally {
      release.release()
    }
    await Promise.all([holder, save, purge])
    expect(await new DrizzleLearningRepository(db).listEvidence(f.owner, f.lessonId)).toEqual([])
  })
  test('history pages survive removed blocks, handle timestamp ties and fetch payloads only on demand', async () => {
    const f = await fixture(),
      { db } = get(),
      repo = new DrizzleLearningRepository(db)
    const ids = Array.from({ length: 145 }, () => randomUUID())
      .sort()
      .reverse()
    await db.insert(lessonEvidence).values(
      ids.map((id) => ({
        id,
        ...f.owner,
        lessonId: f.lessonId,
        blockId: f.blockId,
        kind: 'studio' as const,
        revision: 'original',
        createdAt: query`'2026-09-12T12:00:00.123456Z'::timestamptz`,
        payload: {
          project: { privateWork: 'saved project' },
          score: 100,
          definition: { title: 'Projeto original' },
        },
      })),
    )
    await db.delete(lessonBlocks).where(eq(lessonBlocks.id, f.blockId))
    const first = (await repo.listEvidence(f.owner, f.lessonId)).slice(0, 100)
    const next = await repo.listEvidence(f.owner, f.lessonId, first.at(-1)?.id)
    expect([...first, ...next].map((row) => row.id)).toEqual(ids)
    expect(first[0]?.payload).toMatchObject({ blockTitle: 'Projeto original', score: 100 })
    expect(JSON.stringify(first)).not.toContain('saved project')
    expect((await repo.getEvidence(f.owner, f.lessonId, ids.at(-1)!))?.payload).toMatchObject({
      project: { privateWork: 'saved project' },
    })
    expect(
      await repo.listEvidence(
        { userId: randomUUID(), accountId: randomUUID() },
        f.lessonId,
        first.at(-1)?.id,
      ),
    ).toEqual([])
  })
})
