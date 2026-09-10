import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import {
  defaultLessonSection,
  evaluateLearning,
  type InteractiveBlock,
  type LearningManifest,
} from '@sistemazero/core/learning'
import { eq } from 'drizzle-orm'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { LearningImportService } from '../../src/application/learning/learning-import.service'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLearningRepository } from '../../src/infrastructure/persistence/drizzle/learning.repository'
import { DrizzleLessonDraftRepository } from '../../src/infrastructure/persistence/drizzle/lesson-draft.repository'
import {
  courses,
  learningAttempts,
  lessonBlockProgress,
  lessonBlocks,
  lessonCompletions,
  lessonProgress,
  lessonSectionProgress,
  lessonStructures,
  lessons,
  modules,
  quizAttempts,
  studioSubmissions,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { DrizzleVideoPositionRepository } from '../../src/infrastructure/persistence/drizzle/video-position.repository'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'
import { lessonDraftCases } from './lesson-draft-cases'

// An explicitly named EMPTY disposable database is required. Never connects to DATABASE_URL.
const url = process.env.LEARNING_QA_DATABASE_URL
if (url && !/^\/sz_aulas_qa_[a-z0-9_]+$/.test(new URL(url).pathname))
  throw new Error('LEARNING_QA_DATABASE_URL must name a disposable sz_aulas_qa_* database.')
const connection = url ? createDbConnection(url) : null
const get = () => {
  if (!connection) throw new Error('Missing disposable database')
  return connection
}
const courseId = randomUUID(),
  moduleId = randomUUID(),
  lessonId = randomUUID()
const videoId = randomUUID(),
  quizId = randomUUID(),
  studioId = randomUUID(),
  attemptId = randomUUID()
const owner = { userId: randomUUID(), accountId: randomUUID() }
const now = new Date('2026-09-08T12:00:00Z')
const project = { id: 'student-work', code: 'my original game' }
const activity: InteractiveBlock = {
  kind: 'interactive',
  title: 'Ordem das ações',
  instructions: 'Prepare a cena antes de desenhar.',
  hints: ['O desenho usa a preparação.'],
  required: true,
  activity: {
    type: 'sequence',
    mode: 'order',
    items: [
      { id: 'draw', label: 'Desenhar' },
      { id: 'prepare', label: 'Preparar' },
    ],
    solution: ['prepare', 'draw'],
    targets: [],
  },
}

describe.skipIf(!url)(
  'learning upgrade and real persistence in an empty disposable database',
  () => {
    lessonDraftCases(() => get().db)
    beforeAll(async () => {
      const { db, sql } = get()
      const [state] = await sql`select to_regnamespace('members') as existing`
      if (state?.existing)
        throw new Error('Disposable database must be empty; refusing to replace existing tables.')
      const folder = resolve(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      )
      const migrations = readMigrationFiles({ migrationsFolder: folder })
      // Establish the exact pre-change schema at 0077; historical enum upgrades commit independently.
      for (const migration of migrations.slice(0, 78))
        for (const statement of migration.sql) if (statement.trim()) await sql.unsafe(statement)
      await db.insert(courses).values({
        id: courseId,
        slug: 'learning-qa',
        title: 'Curso existente',
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
        slug: 'aula-qa',
        title: 'Aula existente',
        sortOrder: 0,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      })
      const legacyBlocks = [
        {
          id: videoId,
          lessonId,
          kind: 'video',
          sortOrder: 0,
          content: { kind: 'video', provider: 'file', src: '/original.mp4' },
        },
        {
          id: quizId,
          lessonId,
          kind: 'quiz',
          sortOrder: 1,
          content: {
            kind: 'quiz',
            questions: [
              {
                id: 'q',
                prompt: 'Qual vem primeiro?',
                choices: [
                  { id: 'a', label: 'Preparar' },
                  { id: 'b', label: 'Desenhar' },
                ],
                correctChoiceIds: ['a'],
              },
            ],
            passingScore: 100,
          },
        },
        {
          id: studioId,
          lessonId,
          kind: 'studio',
          sortOrder: 2,
          content: { kind: 'studio', initialProject: {}, chain: 'projeto-continuo' },
        },
      ]
      for (const block of legacyBlocks)
        await sql`insert into members.lesson_blocks (id,lesson_id,kind,sort_order,content) values (${block.id},${block.lessonId},${block.kind},${block.sortOrder},${JSON.stringify(block.content)}::jsonb)`
      await db.insert(quizAttempts).values({
        id: attemptId,
        userId: owner.userId,
        lessonId,
        blockId: quizId,
        courseId,
        score: 100,
        passed: true,
        answers: { q: ['a'] },
        createdAt: now,
      })
      await db.insert(studioSubmissions).values({
        id: randomUUID(),
        ...owner,
        blockId: studioId,
        lessonId,
        courseId,
        project,
        submittedAt: now,
      })
      await db
        .insert(lessonCompletions)
        .values({ id: randomUUID(), userId: owner.userId, courseId, lessonId, completedAt: now })
      await db.insert(lessonProgress).values({
        id: randomUUID(),
        userId: owner.userId,
        courseId,
        lessonId,
        positionSeconds: 87,
        updatedAt: now,
      })
      await sql`insert into members.practice_sessions (id,user_id,account_id,course_id,course_slug,lesson_id,block_id,title,quiz,created_at) values (${randomUUID()},${owner.userId},${owner.accountId},${courseId},'learning-qa',${lessonId},${quizId},'Legacy practice','{}',${now.toISOString()})`
      await sql`create schema if not exists drizzle`
      await sql`create table drizzle.members_migrations (id serial primary key, hash text not null, created_at bigint)`
      const baseline = migrations[77]
      if (!baseline) throw new Error('Missing migration 0077')
      await sql`insert into drizzle.members_migrations (hash,created_at) values (${baseline.hash},${baseline.folderMillis})`
      // Production migration runner applies 0078 onward, with its actual transaction behavior.
      await migrate(db, {
        migrationsFolder: folder,
        migrationsSchema: 'drizzle',
        migrationsTable: 'members_migrations',
      })
    }, 60000)
    afterAll(async () => {
      await connection?.close()
    })

    test('upgrade removes only practice, keeps block identities, submissions, quiz history and completion', async () => {
      const { db, sql } = get()
      const [table] = await sql`select to_regclass('members.practice_sessions') as practice`
      expect(table?.practice).toBeNull()
      const [structure] = await db
        .select()
        .from(lessonStructures)
        .where(eq(lessonStructures.lessonId, lessonId))
      expect(structure?.sections[0]?.blockIds).toEqual([videoId, quizId, studioId])
      expect(structure?.sections[0]?.id).toBe(lessonId)
      expect(
        (await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)))[0]?.passed,
      ).toBe(true)
      expect(
        (
          await db.select().from(studioSubmissions).where(eq(studioSubmissions.blockId, studioId))
        )[0]?.project,
      ).toEqual(project)
      expect(
        await db.select().from(lessonCompletions).where(eq(lessonCompletions.lessonId, lessonId)),
      ).toHaveLength(1)
      expect(
        (await db.select().from(lessonProgress).where(eq(lessonProgress.lessonId, lessonId)))[0]
          ?.positionSeconds,
      ).toBe(87)
    })

    test('resume and member activity include block progress and section navigation without replacing legacy video positions', async () => {
      const { db } = get()
      const content = new DrizzleContentAdminRepository(db)
      const repo = new DrizzleLearningRepository(db)
      const positions = new DrizzleVideoPositionRepository(db)
      const learner = { userId: randomUUID(), accountId: randomUUID() }
      const first = await content.createLesson(moduleId, courseId, {
        slug: 'resume-first',
        title: 'Primeira',
        estimatedMinutes: null,
        isPublished: true,
      })
      const second = await content.createLesson(moduleId, courseId, {
        slug: 'resume-second',
        title: 'Segunda',
        estimatedMinutes: null,
        isPublished: true,
      })
      const video = await content.createBlock(second.id, 'video', {
        kind: 'video',
        provider: 'vimeo',
        src: 'https://vimeo.com/123456789',
      })
      const oldTime = new Date('2026-09-01T12:00:00Z')
      const recentTime = new Date('2026-09-08T13:00:00Z')
      await positions.upsert(learner.userId, first.id, courseId, 87, oldTime)
      await repo.saveProgress({
        ...learner,
        lessonId: second.id,
        progress: {
          blockId: video.id,
          revision: video.contentRevision!,
          positionSeconds: 24,
          answers: {},
          hintsUsed: 0,
          attemptsCount: 0,
          result: null,
          updatedAt: recentTime.toISOString(),
        },
      })
      expect(await positions.lastAccessedLessonId(learner.userId, courseId)).toBe(second.id)
      expect(
        (await positions.lastAccessedByCourseIds(learner.userId, [courseId])).get(courseId),
      ).toBe(second.id)
      expect((await positions.lastAccessByCourse(learner.userId)).get(courseId)).toEqual(recentTime)
      expect(
        (await positions.lastAccessByUsers([learner.userId])).get(learner.userId)?.get(courseId),
      ).toEqual(recentTime)
      expect(
        (await positions.listRecentAccessed(learner.userId, 5)).map((r) => r.lessonId),
      ).toEqual([second.id, first.id])
      expect(await positions.lastAccessedLessonId(randomUUID(), courseId)).toBeNull()
      expect(await positions.findPosition(learner.userId, first.id)).toBe(87)
      await repo.saveNavigation(learner, first.id, first.id)
      expect(await positions.lastAccessedLessonId(learner.userId, courseId)).toBe(first.id)
      expect(
        (await positions.listRecentAccessed(learner.userId, 5)).map((r) => r.lessonId),
      ).toEqual([first.id, second.id])
    })

    test('block CRUD maintains section coverage; concurrent section edits have one winner', async () => {
      const { db } = get()
      const content = new DrizzleContentAdminRepository(db)
      const repo = new DrizzleLearningRepository(db)
      const added = await content.createBlock(lessonId, 'rich_text', {
        kind: 'rich_text',
        markdown: 'Novo texto',
      })
      const structure = await repo.getStructure(lessonId)
      if (!structure) throw new Error('Missing structure')
      expect(structure.sections.flatMap((s) => s.blockIds)).toContain(added.id)
      const outcomes = await Promise.all([
        repo.saveStructure(lessonId, structure.revision, structure.sections),
        repo.saveStructure(lessonId, structure.revision, structure.sections),
      ])
      expect(outcomes.filter(Boolean)).toHaveLength(1)
      await content.deleteBlock(added.id)
      expect(
        (await repo.getStructure(lessonId))?.sections.flatMap((s) => s.blockIds),
      ).not.toContain(added.id)
    })

    test('attempts are idempotent and isolated, new revisions reset passes while preserving history', async () => {
      const { db } = get()
      const content = new DrizzleContentAdminRepository(db)
      const repo = new DrizzleLearningRepository(db)
      const block = await content.createBlock(lessonId, 'interactive', activity)
      if (!block.contentRevision) throw new Error('Missing revision')
      const answers = { order: ['prepare', 'draw'] }
      const attempt = {
        id: randomUUID(),
        blockId: block.id,
        revision: block.contentRevision,
        answers,
        hintsUsed: 1,
        result: evaluateLearning(activity, answers),
        createdAt: now.toISOString(),
      }
      await Promise.all([
        repo.recordAttempt(owner, lessonId, attempt),
        repo.recordAttempt(owner, lessonId, attempt),
      ])
      expect((await repo.getProgress(owner, lessonId)).blocks[0]).toMatchObject({
        attemptsCount: 1,
        result: { passed: true },
      })
      expect(
        (await repo.getProgress({ ...owner, accountId: randomUUID() }, lessonId)).blocks,
      ).toHaveLength(0)
      const updated = await content.updateBlock(block.id, 'interactive', {
        ...activity,
        instructions: 'Uma nova explicação.',
      })
      if (!updated?.contentRevision) throw new Error('Missing new revision')
      await repo.saveProgress({
        ...owner,
        lessonId,
        progress: {
          blockId: block.id,
          revision: updated.contentRevision,
          answers: {},
          positionSeconds: null,
          hintsUsed: 0,
          attemptsCount: 0,
          result: null,
          updatedAt: now.toISOString(),
        },
      })
      expect((await repo.getProgress(owner, lessonId)).blocks[0]).toMatchObject({
        result: null,
        hintsUsed: 0,
        attemptsCount: 0,
      })
      expect(await repo.listAttempts(owner, lessonId)).toHaveLength(1)
      await expect(repo.recordAttempt(owner, lessonId, attempt)).rejects.toThrow()
    })

    test('import previews are read-only and reimport preserves IDs and original student work', async () => {
      const { db } = get()
      const reader = new DrizzleCourseRepository(db)
      const service = new LearningImportService(
        new DrizzleLessonDraftRepository(db, parsePublishedLessonBlock),
        reader,
      )
      const document: LearningManifest = {
        version: 1,
        courseSlug: 'learning-qa',
        lessonSlug: 'aula-qa',
        title: 'Nova organização',
        blocks: [
          { key: 'jogo', existing: { kind: 'studio', index: 0 } },
          { key: 'descoberta', content: activity },
        ],
        sections: [
          {
            key: 'investigar',
            title: 'Investigar',
            objective: 'Comparar a ordem de preparação e desenho',
            intent: 'exploration',
            blockKeys: ['descoberta', 'jogo'],
            workspaceKey: 'jogo',
            externalTool: null,
            pendingMedia: ['Gravar demonstração curta'],
          },
        ],
      }
      const preview = await service.preview(lessonId, document)
      const publishedBefore = await reader.findLessonWithContent(lessonId)
      const first = await service.apply(
        lessonId,
        document,
        preview.fingerprint,
        owner.userId,
        randomUUID(),
      )
      expect(await reader.findLessonWithContent(lessonId)).toEqual(publishedBefore)
      const next = await service.preview(lessonId, document)
      const second = await service.apply(
        lessonId,
        document,
        next.fingerprint,
        owner.userId,
        randomUUID(),
      )
      expect(second.blocks.map((b) => b.id)).toEqual(first.blocks.map((b) => b.id))
      expect(second.blocks.every((b) => b.action === 'preserve')).toBe(true)
      expect(
        (
          await db.select().from(studioSubmissions).where(eq(studioSubmissions.blockId, studioId))
        )[0]?.project,
      ).toEqual(project)
      expect(
        await db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)),
      ).toHaveLength(1)
      const pending = await new DrizzleLessonDraftRepository(
        db,
        parsePublishedLessonBlock,
      ).validate(lessonId, second.revision, [])
      expect(pending.some((issue) => issue.message.includes('Vimeo'))).toBe(true)
    })

    test('section milestones reject stale publication and block evidence, serialize retries and preserve completion', async () => {
      const { db } = get()
      const repo = new DrizzleLearningRepository(db)
      const structure = await repo.getStructure(lessonId)
      if (!structure?.sections[0]) throw new Error('Missing structure')
      const [block] = await db.select().from(lessonBlocks).where(eq(lessonBlocks.id, videoId))
      if (!block) throw new Error('Missing block')
      const evidence = [{ id: block.id, revision: block.contentRevision }]
      const record = {
        sectionId: structure.sections[0].id,
        revision: '12345678901234567890123456789012',
        completedAt: now.toISOString(),
        projectPassed: true,
      }
      await expect(
        repo.saveSectionProgress(owner, lessonId, randomUUID(), [record], evidence),
      ).rejects.toThrow()
      await expect(
        repo.saveSectionProgress(
          owner,
          lessonId,
          structure.revision,
          [record],
          [{ id: block.id, revision: 'stale' }],
        ),
      ).rejects.toThrow()
      expect(await repo.getSectionProgress(owner, lessonId)).toHaveLength(0)
      await Promise.all([
        repo.saveSectionProgress(owner, lessonId, structure.revision, [record], evidence),
        repo.saveSectionProgress(owner, lessonId, structure.revision, [record], evidence),
      ])
      await repo.saveSectionProgress(
        owner,
        lessonId,
        structure.revision,
        [{ ...record, revision: 'changed', completedAt: null, projectPassed: false }],
        evidence,
      )
      expect(await repo.getSectionProgress(owner, lessonId)).toEqual([record])
      expect(
        await repo.getSectionProgress({ ...owner, userId: randomUUID() }, lessonId),
      ).toHaveLength(0)
      // Include explicit criteria in the source so clone coverage verifies portable references too.
      await db
        .update(lessonStructures)
        .set({
          sections: structure.sections.map((section, i) =>
            i === 0
              ? {
                  ...section,
                  completion: { version: 1 as const, blockIds: section.blockIds.slice(0, 1) },
                }
              : section,
          ),
        })
        .where(eq(lessonStructures.lessonId, lessonId))
    })

    test('clone remaps every section and workspace reference without copying student progress', async () => {
      const { db } = get()
      const clone = await new DrizzleContentAdminRepository(db).cloneCourseTree(courseId, {
        expectedSourceVersion: 0,
        expectedSourceAudience: 'kids',
        audience: 'adult',
        slug: 'learning-qa-clone',
        title: 'Clone',
        dropStudioUnlockBlocks: true,
      })
      if (!clone) throw new Error('Missing clone')
      const [clonedLesson] = await db.select().from(lessons).where(eq(lessons.courseId, clone.id))
      if (!clonedLesson) throw new Error('Missing cloned lesson')
      const [structure] = await db
        .select()
        .from(lessonStructures)
        .where(eq(lessonStructures.lessonId, clonedLesson.id))
      const blocks = await db
        .select()
        .from(lessonBlocks)
        .where(eq(lessonBlocks.lessonId, clonedLesson.id))
      expect(
        structure?.sections.every(
          (s) =>
            s.blockIds.every((id) => blocks.some((b) => b.id === id)) &&
            (s.completion?.blockIds.every((id) => blocks.some((b) => b.id === id)) ?? true) &&
            (!s.workspaceBlockId || blocks.some((b) => b.id === s.workspaceBlockId)),
        ),
      ).toBe(true)
      expect(structure?.sections[0]?.workspaceBlockId).not.toBe(studioId)
      expect(structure?.sections[0]?.completion?.blockIds).toHaveLength(1)
      expect(
        await db
          .select()
          .from(lessonSectionProgress)
          .where(eq(lessonSectionProgress.lessonId, clonedLesson.id)),
      ).toHaveLength(0)
      expect(
        await db
          .select()
          .from(lessonBlockProgress)
          .where(eq(lessonBlockProgress.lessonId, clonedLesson.id)),
      ).toHaveLength(0)
    })

    test('weekly topics use only visited current content owned by the profile, in the right week and audience', async () => {
      const { db } = get()
      const repo = new DrizzleLearningRepository(db)
      const reportOwner = { userId: randomUUID(), accountId: randomUUID() }
      const reportCourse = randomUUID(),
        reportModule = randomUUID(),
        reportLesson = randomUUID()
      const visitedBlock = randomUUID(),
        untouchedBlock = randomUUID(),
        revision = randomUUID().replaceAll('-', '')
      await db.insert(courses).values({
        id: reportCourse,
        slug: 'weekly-learning',
        title: 'Descobertas',
        audience: 'kids',
        status: 'published',
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(modules).values({
        id: reportModule,
        courseId: reportCourse,
        title: 'Unidade',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(lessons).values({
        id: reportLesson,
        courseId: reportCourse,
        moduleId: reportModule,
        title: 'O salto',
        slug: 'salto',
        sortOrder: 0,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(lessonBlocks).values([
        {
          id: visitedBlock,
          lessonId: reportLesson,
          kind: 'interactive',
          content: activity,
          contentRevision: revision,
          sortOrder: 0,
        },
        {
          id: untouchedBlock,
          lessonId: reportLesson,
          kind: 'interactive',
          content: activity,
          sortOrder: 1,
        },
      ])
      await repo.saveStructure(reportLesson, null, [
        {
          id: randomUUID(),
          title: 'Gravidade',
          objective: 'Comparar dois saltos',
          intent: 'exploration',
          workspaceBlockId: null,
          externalTool: null,
          pendingMedia: [],
          blockIds: [visitedBlock],
        },
        {
          id: randomUUID(),
          title: 'Ainda não explorado',
          objective: 'Tema futuro',
          intent: 'exploration',
          workspaceBlockId: null,
          externalTool: null,
          pendingMedia: [],
          blockIds: [untouchedBlock],
        },
      ])
      await repo.saveProgress({
        ...reportOwner,
        lessonId: reportLesson,
        progress: {
          blockId: visitedBlock,
          revision,
          answers: {},
          hintsUsed: 0,
          positionSeconds: null,
          attemptsCount: 0,
          result: null,
          updatedAt: now.toISOString(),
        },
      })
      const since = new Date('2026-09-07T03:00:00Z'),
        until = new Date('2026-09-09T03:00:00Z')
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'kids', since, until),
      ).toEqual([
        { lessonId: reportLesson, lessonTitle: 'O salto', topics: ['Comparar dois saltos'] },
      ])
      expect(await repo.listActiveAccounts('kids', since, until)).toContain(reportOwner.accountId)
      expect(await repo.listProfileIdsByAccount(reportOwner.accountId, 'kids')).toEqual([
        reportOwner.userId,
      ])
      expect(await repo.listProfileIdsByAccount(reportOwner.accountId, 'adult')).toEqual([])
      expect(await repo.listProfileIdsByAccount(randomUUID(), 'kids')).toEqual([])
      expect(
        await repo.weeklyTopics(randomUUID(), reportOwner.userId, 'kids', since, until),
      ).toEqual([])
      expect(
        await repo.weeklyTopics(reportOwner.accountId, randomUUID(), 'kids', since, until),
      ).toEqual([])
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'adult', since, until),
      ).toEqual([])
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'kids', until, until),
      ).toEqual([])
      await db
        .update(lessonBlocks)
        .set({ contentRevision: randomUUID().replaceAll('-', '') })
        .where(eq(lessonBlocks.id, visitedBlock))
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'kids', since, until),
      ).toEqual([])
      await db
        .update(lessonBlocks)
        .set({ contentRevision: revision })
        .where(eq(lessonBlocks.id, visitedBlock))
      await db.update(courses).set({ status: 'draft' }).where(eq(courses.id, reportCourse))
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'kids', since, until),
      ).toEqual([])
      expect(await repo.listActiveAccounts('kids', since, until)).not.toContain(
        reportOwner.accountId,
      )
      await db.update(courses).set({ status: 'published' }).where(eq(courses.id, reportCourse))
      await db.update(lessons).set({ isPublished: false }).where(eq(lessons.id, reportLesson))
      expect(
        await repo.weeklyTopics(reportOwner.accountId, reportOwner.userId, 'kids', since, until),
      ).toEqual([])
    })

    test('account purge covers learning data and prevents later recreation', async () => {
      const { db } = get()
      await new DrizzleUserDataPurgeRepository(db).purgeForUser({
        ...owner,
        userIds: [owner.userId],
        cleanup: { id: randomUUID(), prefixes: [], notBefore: now, createdAt: now },
      })
      expect(
        await db.select().from(learningAttempts).where(eq(learningAttempts.userId, owner.userId)),
      ).toHaveLength(0)
      expect(
        await db
          .select()
          .from(lessonBlockProgress)
          .where(eq(lessonBlockProgress.userId, owner.userId)),
      ).toHaveLength(0)
      expect(
        await db
          .select()
          .from(lessonSectionProgress)
          .where(eq(lessonSectionProgress.userId, owner.userId)),
      ).toHaveLength(0)
      const structure = await new DrizzleLearningRepository(db).getStructure(lessonId)
      if (!structure?.sections[0]) throw new Error('Missing structure')
      await expect(
        new DrizzleLearningRepository(db).saveSectionProgress(
          owner,
          lessonId,
          structure.revision,
          [
            {
              sectionId: structure.sections[0].id,
              revision: 'deleted',
              completedAt: now.toISOString(),
              projectPassed: false,
            },
          ],
          [],
        ),
      ).rejects.toThrow('excluída')
      await expect(
        new DrizzleLearningRepository(db).saveNavigation(
          owner,
          lessonId,
          defaultLessonSection(lessonId, 'Aula', []).id,
        ),
      ).rejects.toThrow('excluída')
    })
  },
)
