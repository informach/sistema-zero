import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { studioProjectContinuityReference } from '@sistemazero/core/studio/project-continuity'
import { eq } from 'drizzle-orm'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { documentFixture } from '../../../studio/src/state/fixtures/projectDocuments'
import { BlockAdminService } from '../../src/application/content-admin/content-admin.service'
import { OpenLessonStudioService } from '../../src/application/studio/open-lesson-studio.service'
import type { LiveWorkspaceRecord } from '../../src/domain/ports/live-workspace-repository.port'
import { createStudioAuthoringPolicy } from '../../src/domain/studio/authoring-policy'
import { studioLessonBaseline } from '../../src/domain/studio/lesson-baseline'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLessonDraftRepository } from '../../src/infrastructure/persistence/drizzle/lesson-draft.repository'
import { DrizzleLiveWorkspaceRepository } from '../../src/infrastructure/persistence/drizzle/live-workspace.repository'
import {
  accountDeletionFences,
  courses,
  lessonBlocks,
  lessonDrafts,
  lessons,
  liveCohorts,
  liveSessions,
  liveWorkspaces,
  modules,
  studioCourseChains,
  studioLessonBaselines,
  studioLessonBindings,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleStudioLessonBindingRepository } from '../../src/infrastructure/persistence/drizzle/studio-lesson-binding.repository'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'
import { authoringFixture } from '../fakes/studio-authoring-policy'

const raw = process.env.STUDIO_TEST_DATABASE_URL
if (raw !== undefined && !raw.trim())
  throw new Error('STUDIO_TEST_DATABASE_URL is explicitly empty')
// Bun 1.3.11/Windows rejects.toThrow can stall postgres.js after sequential transactions.
// Await I/O first, then assert the settled rejection (minimal reproduction in L6 evidence).
async function expectChainConflict(operation: Promise<unknown>) {
  const result = await operation.then(
    () => ({ error: null }),
    (error: unknown) => ({ error }),
  )
  expect(result.error).toBeInstanceOf(Error)
  expect(String(result.error)).toContain('outro nome')
}
const target = raw ? new URL(raw) : null
if (
  target &&
  (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    !/^\/studio_test_[a-z0-9_]+$/.test(target.pathname))
)
  throw new Error('Studio tests require an explicit disposable local studio_test_* database')

describe.skipIf(!target)('Studio lesson bindings — real migrations and PostgreSQL', () => {
  let connection: DbConnection
  beforeAll(async () => {
    target!.pathname += `_${process.pid}_${Date.now()}`
    const adminTarget = new URL(target!)
    adminTarget.pathname = '/postgres'
    const admin = postgres(adminTarget.toString(), { max: 1, onnotice: () => {} })
    try {
      await admin.unsafe(`CREATE DATABASE "${target!.pathname.slice(1)}"`)
    } catch (error) {
      if ((error as { code?: string }).code !== '42P04') throw error
    } finally {
      await admin.end()
    }
    connection = createDbConnection(target!.toString())
    const options = {
      migrationsFolder: fileURLToPath(
        new URL('../../src/infrastructure/persistence/drizzle/migrations/', import.meta.url),
      ),
      migrationsTable: 'members_migrations',
    }
    // Historical migrations added and used enum values across deploys. Bootstrap those
    // committed statements as the existing DB suites do, then exercise the actual migrator
    // for the new additive migration against that pre-existing schema.
    await connection.sql`create schema if not exists drizzle`
    await connection.sql`create table drizzle.members_migrations (id serial primary key, hash text not null, created_at bigint)`
    const history = readMigrationFiles(options)
    const studioMigrationStart = history.findIndex((migration) =>
      migration.sql.some((statement) =>
        statement.includes('CREATE TABLE "members"."studio_lesson_baselines"'),
      ),
    )
    if (studioMigrationStart < 0) throw new Error('Studio migration boundary not found')
    for (const migration of history.slice(0, studioMigrationStart)) {
      for (const statement of migration.sql)
        if (statement.trim()) await connection.sql.unsafe(statement)
      await connection.sql`insert into drizzle.members_migrations (hash, created_at) values (${migration.hash}, ${migration.folderMillis})`
    }
    await migrate(connection.db, options)
    await migrate(connection.db, options)
  }, 60_000)
  afterAll(async () => {
    await connection?.close()
  })

  test('runtime reads only an existing draft metadata snapshot and never creates a rejected draft', async () => {
    const { lessonId, blockId } = await fixture()
    const { project, policy } = await authoringFixture('python', 'pro')
    const repository = new DrizzleLessonDraftRepository(
      connection.db,
      parsePublishedLessonBlock,
      policy,
    )
    expect(await repository.readStudioRuntimeContext(lessonId, blockId)).toBeNull()
    expect(
      await connection.db.select().from(lessonDrafts).where(eq(lessonDrafts.lessonId, lessonId)),
    ).toEqual([])
    const initial = await repository.read(lessonId)
    const changed = await repository.change(lessonId, randomUUID(), {
      expectedRevision: initial.revision,
      operationId: randomUUID(),
      change: {
        type: 'block',
        block: {
          id: blockId,
          content: {
            kind: 'studio',
            initialProject: project,
            pythonLevel: 2,
            allowedModes: ['code'],
          },
        },
      },
    })
    const context = await repository.readStudioRuntimeContext(lessonId, blockId)
    expect(context).toEqual({
      revision: changed.revision,
      block: {
        kind: 'studio',
        environment: studioProjectContinuityReference(project),
        curation: { pythonLevel: 2, allowedModes: ['code'] },
      },
    })
    expect(JSON.stringify(context).length).toBeLessThan(1500)
    expect(await repository.readStudioRuntimeContext(lessonId, null)).toEqual({
      revision: changed.revision,
      block: null,
    })
    expect(await repository.readStudioRuntimeContext(lessonId, randomUUID())).toEqual({
      revision: changed.revision,
      block: null,
    })
    const [stored] = await connection.db
      .select()
      .from(lessonDrafts)
      .where(eq(lessonDrafts.lessonId, lessonId))
    expect(stored?.document).toEqual(changed.document)
  })

  for (const language of ['javascript', 'python'] as const)
    for (const kind of ['classic', 'pro'] as const)
      test(`publication keeps draft and published snapshots atomic for ${language}/${kind}`, async () => {
        const { lessonId, blockId, content } = await fixture()
        const { project, policy, configuration } = await authoringFixture(language, kind)
        const repository = new DrizzleLessonDraftRepository(
          connection.db,
          parsePublishedLessonBlock,
          policy,
        )
        const authorId = randomUUID()
        const initial = await repository.read(lessonId)
        const changed = await repository.change(lessonId, authorId, {
          expectedRevision: initial.revision,
          operationId: randomUUID(),
          change: {
            type: 'block',
            block: { id: blockId, content: { kind: 'studio', initialProject: project } },
          },
        })
        // Simulate a fresh server policy withdrawing the runtime between save and publish.
        configuration.releases[0]!.status = 'revoked'
        const revoked = new DrizzleLessonDraftRepository(
          connection.db,
          parsePublishedLessonBlock,
          await createStudioAuthoringPolicy(configuration),
        )
        await expect(
          revoked.publish(lessonId, authorId, changed.revision, randomUUID(), []),
        ).rejects.toThrow('ativo')
        expect(
          (await repository.read(lessonId)).document.blocks[0]!.content.initialProject,
        ).toEqual(project)
        const publishedBefore = await connection.db
          .select()
          .from(lessonBlocks)
          .where(eq(lessonBlocks.id, blockId))
        expect(publishedBefore[0]!.content).toEqual(content)
        const published = await repository.publish(
          lessonId,
          authorId,
          changed.revision,
          randomUUID(),
          [],
        )
        expect(published.revision).not.toBe(changed.revision)
        const publishedAfter = await connection.db
          .select()
          .from(lessonBlocks)
          .where(eq(lessonBlocks.id, blockId))
        expect(publishedAfter[0]!.content).toEqual({ kind: 'studio', initialProject: project })
      })

  async function fixture() {
    const now = new Date()
    const courseId = randomUUID(),
      moduleId = randomUUID(),
      lessonId = randomUUID(),
      blockId = randomUUID()
    await connection.db.insert(courses).values({
      id: courseId,
      slug: `studio-${courseId}`,
      title: 'Studio',
      status: 'published',
      audience: 'kids',
      createdAt: now,
      updatedAt: now,
    })
    await connection.db
      .insert(modules)
      .values({ id: moduleId, courseId, title: 'Mundo', createdAt: now, updatedAt: now })
    await connection.db.insert(lessons).values({
      id: lessonId,
      moduleId,
      courseId,
      slug: 'aula',
      title: 'Aula',
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    })
    const content = {
      kind: 'studio' as const,
      initialProject: { ...documentFixture('javascript', 'classic'), assets: [] },
      allowedModes: ['blocks'] as ('blocks' | 'bridge' | 'code')[],
    }
    await connection.db
      .insert(lessonBlocks)
      .values({ id: blockId, lessonId, kind: 'studio', content })
    const owner = { userId: randomUUID(), accountId: randomUUID() }
    const original = studioLessonBaseline({ blockId, lessonId, courseId, configuration: content })
    const next = studioLessonBaseline({
      blockId,
      lessonId,
      courseId,
      configuration: {
        ...content,
        initialProject: { ...documentFixture('python', 'pro'), assets: [] },
        allowedModes: ['code'],
      },
    })
    return { owner, original, next, content, courseId, moduleId, lessonId, blockId }
  }

  async function chainAuthoring() {
    const javascript = await authoringFixture('javascript', 'classic')
    const python = await authoringFixture('python', 'classic')
    const policy = await createStudioAuthoringPolicy({
      version: 1,
      catalog: {
        profiles: [
          ...javascript.configuration.catalog.profiles,
          ...python.configuration.catalog.profiles,
        ],
        releases: [
          ...javascript.configuration.catalog.releases,
          ...python.configuration.catalog.releases,
        ],
      },
      releases: [...javascript.configuration.releases, ...python.configuration.releases],
    })
    const repository = new DrizzleLessonDraftRepository(
      connection.db,
      parsePublishedLessonBlock,
      policy,
    )
    const authorId = randomUUID()
    async function save(lessonId: string, blockId: string, project: unknown, chain?: string) {
      const draft = await repository.read(lessonId)
      return repository.change(lessonId, authorId, {
        expectedRevision: draft.revision,
        operationId: randomUUID(),
        change: {
          type: 'block',
          block: {
            id: blockId,
            content: { kind: 'studio', initialProject: project, ...(chain ? { chain } : {}) },
          },
        },
      })
    }
    async function publish(draft: Awaited<ReturnType<typeof save>>) {
      return repository.publish(draft.lessonId, authorId, draft.revision, randomUUID(), [])
    }
    return {
      javascript: javascript.project,
      python: python.project,
      repository,
      policy,
      save,
      publish,
    }
  }

  test('concurrent lessons cannot publish incompatible environments under the same chain', async () => {
    const f = await fixture()
    const a = await chainAuthoring()
    const lessonId = randomUUID(),
      blockId = randomUUID()
    await connection.db.insert(lessons).values({
      id: lessonId,
      moduleId: f.moduleId,
      courseId: f.courseId,
      slug: 'aula-2',
      title: 'Aula 2',
      sortOrder: 1,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await connection.db
      .insert(lessonBlocks)
      .values({ id: blockId, lessonId, kind: 'studio', content: f.content })
    const drafts = [
      await a.save(f.lessonId, f.blockId, a.javascript, ' \u00a0jogo\uFEFF '),
      await a.save(lessonId, blockId, a.python, 'jogo'),
    ]
    const results = await Promise.allSettled(drafts.map(a.publish))
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    const loser = results.findIndex((result) => result.status === 'rejected')
    const rejected = results[loser] as PromiseRejectedResult
    expect(String(rejected.reason)).toContain('outro nome')
    expect((await a.repository.read(drafts[loser]!.lessonId)).document).toEqual(
      drafts[loser]!.document,
    )
    const loserBlockId = loser ? blockId : f.blockId
    const [unchanged] = await connection.db
      .select()
      .from(lessonBlocks)
      .where(eq(lessonBlocks.id, loserBlockId))
    expect(unchanged!.content).toEqual(f.content)
    const records = await connection.db
      .select()
      .from(studioCourseChains)
      .where(eq(studioCourseChains.courseId, f.courseId))
    expect(records).toHaveLength(1)
    expect(records[0]!.chain).toBe('jogo')
    expect(JSON.stringify(records[0]!.environment).length).toBeLessThan(350)
    // A new chain and another course are independent, even when their environments differ.
    await a.publish(
      await a.save(
        drafts[loser]!.lessonId,
        loserBlockId,
        loser ? a.python : a.javascript,
        'outro-jogo',
      ),
    )
    const other = await fixture()
    await a.publish(
      await a.save(other.lessonId, other.blockId, loser ? a.python : a.javascript, 'jogo'),
    )
  })

  test('compatible source edits work; reauthoring or removing the last block never retypes its chain', async () => {
    const f = await fixture()
    const a = await chainAuthoring()
    await a.publish(await a.save(f.lessonId, f.blockId, a.python, 'jogo'))
    const baseline = studioLessonBaseline({
      blockId: f.blockId,
      lessonId: f.lessonId,
      courseId: f.courseId,
      configuration: { initialProject: a.python, chain: 'jogo' },
    })
    const bindings = new DrizzleStudioLessonBindingRepository(connection.db)
    await bindings.bindRecorded(f.owner, baseline)
    const edited = structuredClone(a.python)
    if (edited.programmingLanguage !== 'python' || edited.kind !== 'classic')
      throw new Error('fixture')
    edited.files['main.py'] = 'print("novo texto")'
    await a.publish(await a.save(f.lessonId, f.blockId, edited, 'jogo'))
    const incompatible = await a.save(f.lessonId, f.blockId, a.javascript, 'jogo')
    await expectChainConflict(a.publish(incompatible))
    await a.publish(await a.save(f.lessonId, f.blockId, a.javascript, 'jogo-js'))
    expect((await bindings.find(f.owner, f.blockId))!.baseline.id).toBe(baseline.id)
    const service = new BlockAdminService(
      new DrizzleContentAdminRepository(connection.db),
      a.policy,
    )
    await service.remove(f.blockId)
    await expectChainConflict(
      service.create(f.lessonId, { kind: 'studio', initialProject: a.javascript, chain: 'jogo' }),
    )
    const created = await service.create(f.lessonId, {
      kind: 'studio',
      initialProject: a.python,
      chain: 'jogo',
    })
    await expectChainConflict(
      service.update(created.id, { kind: 'studio', initialProject: a.javascript, chain: 'jogo' }),
    )
    expect((await bindings.find(f.owner, f.blockId))!.baseline.id).toBe(baseline.id)
  })

  test('preexisting admissions and archived blocks constrain names without loading source', async () => {
    const f = await fixture()
    const a = await chainAuthoring()
    const baseline = studioLessonBaseline({
      blockId: f.blockId,
      lessonId: f.lessonId,
      courseId: f.courseId,
      configuration: { initialProject: a.javascript, chain: ' \uFEFFantigo\u00a0 ' },
    })
    await new DrizzleStudioLessonBindingRepository(connection.db).bindRecorded(f.owner, baseline)
    await expectChainConflict(a.publish(await a.save(f.lessonId, f.blockId, a.python, 'antigo')))
    const oldBlockId = randomUUID()
    await connection.db.insert(lessonBlocks).values({
      id: oldBlockId,
      lessonId: f.lessonId,
      kind: 'studio',
      sortOrder: 5,
      content: { kind: 'studio', initialProject: a.python, chain: 'arquivado' },
      archivedAt: new Date(),
    })
    await expectChainConflict(
      a.publish(await a.save(f.lessonId, f.blockId, a.javascript, 'arquivado')),
    )
    await a.publish(await a.save(f.lessonId, f.blockId, a.python, 'novo'))
    expect(
      (
        await connection.db
          .select()
          .from(studioCourseChains)
          .where(eq(studioCourseChains.courseId, f.courseId))
      )
        .map((row) => row.chain)
        .sort(),
    ).toEqual(['arquivado', 'novo'])
  })

  for (const parent of ['lesson', 'module'] as const)
    test(`deleting a legacy ${parent} preserves names before cascading source and baselines`, async () => {
      const f = await fixture()
      const a = await chainAuthoring()
      // Simulate pre-rollout content: no studio_course_chains entry exists yet.
      await connection.db
        .update(lessonBlocks)
        .set({ content: { kind: 'studio', initialProject: a.javascript, chain: 'jogo' } })
        .where(eq(lessonBlocks.id, f.blockId))
      const baseline = studioLessonBaseline({
        blockId: f.blockId,
        lessonId: f.lessonId,
        courseId: f.courseId,
        configuration: { initialProject: a.javascript, chain: 'nome-anterior' },
      })
      await new DrizzleStudioLessonBindingRepository(connection.db).bindRecorded(f.owner, baseline)
      const content = new DrizzleContentAdminRepository(connection.db)
      expect(
        await (parent === 'lesson'
          ? content.deleteLesson(f.lessonId)
          : content.deleteModule(f.moduleId)),
      ).toBeTrue()
      const nextModule = parent === 'lesson' ? f.moduleId : randomUUID()
      if (parent === 'module')
        await connection.db.insert(modules).values({
          id: nextModule,
          courseId: f.courseId,
          title: 'Outro',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      const nextLesson = randomUUID()
      await connection.db.insert(lessons).values({
        id: nextLesson,
        moduleId: nextModule,
        courseId: f.courseId,
        slug: 'nova',
        title: 'Nova',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const service = new BlockAdminService(content, a.policy)
      for (const chain of ['jogo', 'nome-anterior'])
        await expectChainConflict(
          service.create(nextLesson, { kind: 'studio', initialProject: a.python, chain }),
        )
      await service.create(nextLesson, {
        kind: 'studio',
        initialProject: a.javascript,
        chain: 'jogo',
      })
      expect(
        (
          await connection.db
            .select()
            .from(studioCourseChains)
            .where(eq(studioCourseChains.courseId, f.courseId))
        )
          .map((row) => row.chain)
          .sort(),
      ).toEqual(['jogo', 'nome-anterior'])
    })

  test('concurrent recorded opens have one durable baseline, shared across learners, and fence deletion', async () => {
    const { owner, original, next, blockId } = await fixture()
    const repository = new DrizzleStudioLessonBindingRepository(connection.db)
    const results = await Promise.all([
      repository.bindRecorded(owner, original),
      repository.bindRecorded(owner, next),
    ])
    expect(results[0]!.baseline.id).toBe(results[1]!.baseline.id)
    const first = results[0]!.baseline
    expect(
      (await repository.bindRecorded(owner, first.id === original.id ? next : original)).baseline,
    ).toEqual(first)
    const sibling = { ...owner, userId: randomUUID() }
    expect((await repository.bindRecorded(sibling, first)).baseline.id).toBe(first.id)
    expect(await repository.find({ ...owner, accountId: randomUUID() }, blockId)).toBeNull()
    const rows = await connection.db
      .select()
      .from(studioLessonBaselines)
      .where(eq(studioLessonBaselines.blockId, blockId))
    expect(rows).toHaveLength(1)
    await connection.db
      .insert(accountDeletionFences)
      .values({ accountId: owner.accountId, createdAt: new Date() })
    await expect(repository.bindRecorded(owner, original)).rejects.toThrow('exclusão')
  })

  test('account erasure removes all owned bindings but preserves shared authoring and another account', async () => {
    const { owner, original, blockId } = await fixture()
    const bindings = new DrizzleStudioLessonBindingRepository(connection.db)
    const sibling = { ...owner, userId: randomUUID() }
    const other = { userId: randomUUID(), accountId: randomUUID() }
    for (const learner of [owner, sibling, other]) await bindings.bindRecorded(learner, original)
    const purge = new DrizzleUserDataPurgeRepository(connection.db)
    const request = {
      userIds: [owner.userId],
      accountId: owner.accountId,
      cleanup: { id: randomUUID(), prefixes: [], notBefore: new Date(), createdAt: new Date() },
    }
    await purge.purgeForUser(request)
    await purge.purgeForUser(request)
    expect(await bindings.find(owner, blockId)).toBeNull()
    expect(await bindings.find(sibling, blockId)).toBeNull()
    expect((await bindings.find(other, blockId))?.baseline).toEqual(original)
    expect(await purge.isFenced(owner.accountId)).toBe(true)
    expect(await purge.isFenced(other.accountId)).toBe(false)
    await expect(bindings.bindRecorded(sibling, original)).rejects.toThrow('exclusão')
    expect(
      await connection.db.select().from(lessonBlocks).where(eq(lessonBlocks.id, blockId)),
    ).toHaveLength(1)
    expect(
      await connection.db
        .select()
        .from(studioLessonBaselines)
        .where(eq(studioLessonBaselines.id, original.id)),
    ).toHaveLength(1)
  })

  test('recorded service reauthorizes every open and returns original seed after publishing another environment', async () => {
    const { owner, original, next, lessonId, blockId } = await fixture()
    let authorized = true,
      checks = 0
    const access = {
      assert: async () => {
        checks++
        if (!authorized) throw new Error('access revoked')
      },
    }
    const repository = new DrizzleStudioLessonBindingRepository(connection.db)
    const service = new OpenLessonStudioService(
      access,
      new DrizzleCourseRepository(connection.db),
      repository,
    )
    const input = { ...owner, lessonId, blockId, privileged: false }
    expect((await service.execute(input)).id).toBe(original.id)
    expect(await repository.find(owner, blockId)).toBeNull()
    await service.execute({
      ...input,
      confirm: {
        baselineId: original.id,
        environment: studioProjectContinuityReference(original.configuration.initialProject),
      },
    })
    await connection.db
      .update(lessonBlocks)
      .set({ content: { kind: 'studio', ...next.configuration, level: undefined } })
      .where(eq(lessonBlocks.id, blockId))
    expect((await service.execute(input)).id).toBe(original.id)
    const another = await service.execute({ ...input, userId: randomUUID() })
    expect(another.configuration.initialProject.programmingLanguage).toBe('python')
    authorized = false
    await expect(service.execute(input)).rejects.toThrow('access revoked')
    expect(checks).toBe(5)
  })

  test('predecessor lookup uses each learner’s bound chain, including an originally absent chain', async () => {
    const { owner, original, content, courseId, moduleId, lessonId, blockId } = await fixture()
    const bindings = new DrizzleStudioLessonBindingRepository(connection.db)
    const coursesRepo = new DrizzleCourseRepository(connection.db)
    const originalChain = studioLessonBaseline({
      blockId,
      lessonId,
      courseId,
      configuration: { ...content, chain: 'game' },
    })
    await bindings.bindRecorded(owner, originalChain)
    const independentOwner = { userId: randomUUID(), accountId: randomUUID() }
    await bindings.bindRecorded(independentOwner, original)
    const nextLesson = randomUUID()
    await connection.db.insert(lessons).values({
      id: nextLesson,
      moduleId,
      courseId,
      slug: 'next',
      title: 'Next',
      sortOrder: 1,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await connection.db
      .update(lessonBlocks)
      .set({ content: { ...content, chain: 'changed' } })
      .where(eq(lessonBlocks.id, blockId))
    expect(
      await coursesRepo.findPrecedingChainBlock(courseId, nextLesson, 'game', 'studio', owner),
    ).toEqual({ lessonId, blockId })
    expect(
      await coursesRepo.findPrecedingChainBlock(courseId, nextLesson, 'changed', 'studio', owner),
    ).toBeNull()
    expect(
      await coursesRepo.findPrecedingChainBlock(
        courseId,
        nextLesson,
        'changed',
        'studio',
        independentOwner,
      ),
    ).toBeNull()
    expect(
      await coursesRepo.findPrecedingChainBlock(courseId, nextLesson, 'changed', 'studio', {
        userId: randomUUID(),
        accountId: owner.accountId,
      }),
    ).toEqual({ lessonId, blockId })
    expect(
      await coursesRepo.findPrecedingChainBlock(courseId, nextLesson, 'game', 'studio', {
        ...owner,
        accountId: randomUUID(),
      }),
    ).toBeNull()
  })

  test('live exact-block binding wins races, refuses incompatible new chain blocks, and preserves original curation', async () => {
    const { owner, original, next, lessonId, courseId } = await fixture()
    const cohortId = randomUUID(),
      sessionId = randomUUID()
    await connection.db.insert(liveCohorts).values({ id: cohortId, document: {} as never })
    await connection.db
      .insert(liveSessions)
      .values({ id: sessionId, cohortId, document: {} as never })
    const candidate = (): LiveWorkspaceRecord & { projectKey: string } => {
      const id = randomUUID()
      return {
        id,
        sessionId,
        learnerId: owner.userId,
        accountId: owner.accountId,
        revision: 0,
        writerEpoch: 0,
        writerId: owner.userId,
        writerDeviceId: null,
        leaseExpiresAt: null,
        project: { ...original.configuration.initialProject, id },
        assistance: null,
        updatedAt: new Date().toISOString(),
        projectKey: `${courseId}:chain:game`,
        lessonIds: [lessonId],
      }
    }
    const repository = new DrizzleLiveWorkspaceRepository(connection.db)
    const opened = await Promise.all([
      repository.openBound(candidate(), original, sessionId),
      repository.openBound(candidate(), original, sessionId),
    ])
    expect(opened[0]!.workspace.id).toBe(opened[1]!.workspace.id)
    const changed = candidate()
    changed.projectKey = `${courseId}:chain:changed`
    changed.project = { ...next.configuration.initialProject, id: changed.id }
    const resumed = await repository.openBound(changed, next, sessionId)
    expect(resumed.workspace.id).toBe(opened[0]!.workspace.id)
    expect(resumed.baseline).toEqual(original)
    const otherBlockId = randomUUID()
    await connection.db.insert(lessonBlocks).values({
      id: otherBlockId,
      lessonId,
      kind: 'studio',
      sortOrder: 1,
      content: { kind: 'studio', initialProject: next.configuration.initialProject },
    })
    const other = studioLessonBaseline({
      blockId: otherBlockId,
      lessonId,
      courseId,
      configuration: next.configuration,
    })
    await expect(repository.openBound(candidate(), other, sessionId)).rejects.toThrow(
      'ambientes diferentes',
    )
    expect(await repository.findBinding(owner, otherBlockId)).toBeNull()
    expect(
      (
        await connection.db
          .select()
          .from(liveWorkspaces)
          .where(eq(liveWorkspaces.learnerId, owner.userId))
      ).length,
    ).toBe(1)
    expect(
      (
        await connection.db
          .select()
          .from(studioLessonBindings)
          .where(eq(studioLessonBindings.userId, owner.userId))
      ).length,
    ).toBe(1)
  })
})
