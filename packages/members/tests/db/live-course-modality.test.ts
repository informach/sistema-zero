import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { LiveCohort, LiveEnrollment, LiveProgram, LiveSession } from '@sistemazero/core/live'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { eq, sql as query } from 'drizzle-orm'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { GetStudioUnlocksService } from '../../src/application/studio-unlocks/get-studio-unlocks.service'
import { CourseModalityLockedError } from '../../src/domain/course/course.errors'
import { studioUnlockRevision } from '../../src/domain/gamification/studio-unlock-revision'
import type { AwardXpEventInput } from '../../src/domain/ports/gamification-repository.port'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import { DrizzleLessonDraftRepository } from '../../src/infrastructure/persistence/drizzle/lesson-draft.repository'
import { DrizzleLiveLessonAccessRepository } from '../../src/infrastructure/persistence/drizzle/live-lesson-access.repository'
import {
  courses,
  entitlements,
  gamificationProfiles,
  kidsJourneyEarned,
  lessonBlocks,
  lessons,
  liveAccessGrants,
  liveCohorts,
  liveEnrollments,
  livePrograms,
  liveSessions,
  modules,
  roomInventory,
  userBadges,
  xpEvents,
  zappyKnowledgeSources,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleStudioUnlockRepository } from '../../src/infrastructure/persistence/drizzle/studio-unlock.repository'
import { eligibleStudioGrants } from '../../src/infrastructure/persistence/drizzle/studio-unlock-eligibility'
import { DrizzleZappyKnowledgeRepository } from '../../src/infrastructure/persistence/drizzle/zappy-knowledge.repository'
import { parsePublishedLessonBlock } from '../../src/interfaces/http/lesson-draft.dtos'
import { silentLogger } from '../fakes/in-memory'
import { publishKidsSeedForTest } from './kids-journey-seed-fixture'

/**
 * Cursos AO VIVO (14/10/2026) no PostgreSQL REAL, com as migrations de verdade (inclusive a
 * `0113`, provada aqui num banco descartável): a coluna `modality` e os dois CHECKs, os marcos
 * novos do ledger, as consultas que tiram o curso ao vivo das listagens, da Jornada, da
 * base do Zappy e a leitura das vagas das oficinas. A conclusão da oficina concede somente
 * os blocos configurados, com o mesmo ledger congelado; não concede produto nem Jornada.
 *
 * Mesmo banco descartável dos outros arquivos que migram do zero (`LEARNING_QA_DATABASE_URL`,
 * `sz_aulas_qa_*`), com a mesma limpeza no começo.
 */
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
const MIGRATIONS = resolve(
  import.meta.dir,
  '../../src/infrastructure/persistence/drizzle/migrations',
)

/** O banco descartável é lento com a máquina ocupada (migrations, outros pacotes). */
const SLOW = 30_000
const NOW = new Date('2026-11-07T17:00:00.000Z')
const HOUR = 3_600_000
const DAY = 24 * HOUR

describe.skipIf(!url)('Cursos ao vivo — PostgreSQL', () => {
  beforeAll(async () => {
    const { sql } = get()
    // Ver `learning-evidence-purge.test.ts`: a pasta compartilha UM banco descartável, e cada
    // arquivo que migra do zero começa limpando o que o anterior deixou.
    await sql.unsafe('drop schema if exists members cascade')
    await sql.unsafe('drop schema if exists drizzle cascade')
    for (const migration of readMigrationFiles({ migrationsFolder: MIGRATIONS }))
      for (const statement of migration.sql) if (statement.trim()) await sql.unsafe(statement)
  }, 60_000)
  afterAll(async () => {
    await connection?.close()
  })

  async function insertCourse(over: Partial<typeof courses.$inferInsert> = {}) {
    const id = randomUUID()
    const moduleId = randomUUID()
    const lessonIds = [randomUUID(), randomUUID()]
    await get()
      .db.insert(courses)
      .values({
        id,
        slug: `curso-${id}`,
        title: 'Curso',
        status: 'published',
        audience: 'kids',
        createdAt: NOW,
        updatedAt: NOW,
        ...over,
      })
    await get()
      .db.insert(modules)
      .values({ id: moduleId, courseId: id, title: 'Mundo', createdAt: NOW, updatedAt: NOW })
    for (const [sortOrder, lessonId] of lessonIds.entries())
      await get()
        .db.insert(lessons)
        .values({
          id: lessonId,
          moduleId,
          courseId: id,
          slug: `fase-${sortOrder + 1}`,
          title: `Fase ${sortOrder + 1}`,
          sortOrder,
          isPublished: true,
          createdAt: NOW,
          updatedAt: NOW,
        })
    return { id, lessonIds: lessonIds as [string, string] }
  }

  test(
    'publicação e revisão recusam entregas de Estúdio em curso ao vivo',
    async () => {
      const course = await insertCourse({
        modality: 'live',
        sequentialLock: false,
        journeyRole: 'reward',
      })
      const repository = new DrizzleLessonDraftRepository(get().db, parsePublishedLessonBlock)
      const lessonId = course.lessonIds[0]
      const authorId = randomUUID()
      const draft = await repository.read(lessonId)
      const blockId = randomUUID()
      const changed = await repository.replace(lessonId, authorId, draft.revision, randomUUID(), {
        ...draft.document,
        blocks: [
          {
            id: blockId,
            content: {
              kind: 'studio',
              purpose: 'submission',
              initialProject: createBlankProjectSnapshot(randomUUID(), 'Projeto'),
            },
          },
        ],
        sections: draft.document.sections.map((s, i) =>
          i === 0 ? { ...s, blockIds: [blockId], workspaceBlockId: blockId } : s,
        ),
      })
      expect(
        (await repository.validate(lessonId, changed.revision, [])).some((issue) =>
          issue.message.includes('Estúdio ao vivo'),
        ),
      ).toBe(true)
      const rejected = await repository
        .publish(lessonId, authorId, changed.revision, randomUUID(), [])
        .then(
          () => null,
          (error: unknown) => error,
        )
      expect(rejected).toBeInstanceOf(Error)
      expect(String(rejected)).toContain('Estúdio ao vivo')
    },
    SLOW,
  )

  /** Uma turma do curso ao vivo com um encontro por aula e a vaga de uma criança. */
  async function insertCohort(input: {
    courseId: string
    lessonIds: string[]
    teacherId?: string
    status?: LiveCohort['status']
    accountId?: string
    learnerId?: string
    windows?: { from: number; to: number; revoked?: boolean }[]
    enrollment?: LiveEnrollment['status']
  }) {
    const { db } = get()
    const programId = randomUUID()
    const cohortId = randomUUID()
    const accountId = input.accountId ?? randomUUID()
    const learnerId = input.learnerId ?? randomUUID()
    await db.insert(livePrograms).values({
      id: programId,
      document: { id: programId } as unknown as LiveProgram,
    })
    await db.insert(liveCohorts).values({
      id: cohortId,
      programId,
      document: {
        id: cohortId,
        programId,
        courseId: input.courseId,
        status: input.status ?? 'open',
        teacherIds: [input.teacherId ?? randomUUID()],
      } as unknown as LiveCohort,
    })
    const enrollmentId = randomUUID()
    await db.insert(liveEnrollments).values({
      id: enrollmentId,
      cohortId,
      accountId,
      learnerId,
      status: input.enrollment ?? 'active',
      document: { id: enrollmentId } as unknown as LiveEnrollment,
    })
    for (const [order, lessonId] of input.lessonIds.entries()) {
      const sessionId = randomUUID()
      await db.insert(liveSessions).values({
        id: sessionId,
        cohortId,
        document: { id: sessionId, cohortId, order, lessonId } as unknown as LiveSession,
      })
      const window = input.windows?.[order] ?? { from: -HOUR, to: 30 * DAY }
      await db.insert(liveAccessGrants).values({
        id: randomUUID(),
        enrollmentId,
        sessionId,
        startsAt: new Date(NOW.getTime() + window.from),
        endsAt: new Date(NOW.getTime() + window.to),
        revokedAt: window.revoked ? NOW : null,
      })
    }
    return { cohortId, accountId, learnerId }
  }

  test(
    'a 0113: padrão gravado, os dois CHECKs, os marcos novos e roda de novo sem erro',
    async () => {
      const { sql } = get()
      const course = await insertCourse()
      const [row] = await sql`select modality from members.courses where id = ${course.id}`
      expect(row?.modality).toBe('recorded')
      for (const statement of [
        sql`update members.courses set modality = 'hibrido' where id = ${course.id}`,
        sql`insert into members.courses (id, slug, title, audience, level, career_slot, journey_role, modality, created_at, updated_at)
          values (${randomUUID()}, ${`ao-vivo-${randomUUID()}`}, 'Ao vivo', 'kids', 'iniciante', 2, 'positioned', 'live', now(), now())`,
      ]) {
        let refused = false
        try {
          await statement
        } catch {
          refused = true
        }
        expect(refused).toBe(true)
      }
      const values = (
        await sql`select unnest(enum_range(null::members.xp_source_type))::text as v`
      ).map((r) => r.v)
      expect(values).toEqual(expect.arrayContaining(['live_encounter', 'live_course_complete']))
      // Idempotente: o preDeploy pode reaplicar sem quebrar.
      const again = readMigrationFiles({ migrationsFolder: MIGRATIONS }).find((m) =>
        m.sql.some((s) => s.includes('courses_live_off_journey_check')),
      )
      expect(again).toBeDefined()
      for (const statement of again?.sql ?? []) if (statement.trim()) await sql.unsafe(statement)
    },
    SLOW,
  )

  test(
    'listagens do aluno e o curso-base só enxergam o gravado',
    async () => {
      const repo = new DrizzleCourseRepository(get().db)
      const recorded = await insertCourse()
      const live = await insertCourse({ modality: 'live' })
      const listed = (await repo.listPublishedCourses('kids')).map((c) => c.id)
      expect(listed).toContain(recorded.id)
      expect(listed).not.toContain(live.id)
      const bySlug = await repo.findAccessibleCoursesBySlugs([
        `curso-${recorded.id}`,
        `curso-${live.id}`,
      ])
      expect(bySlug.map((c) => c.id)).toEqual([recorded.id])
      expect((await repo.findCourseById(live.id))?.modality).toBe('live')
    },
    SLOW,
  )

  test(
    'trocar a modalidade só sem turma (conferido sob a trava do curso)',
    async () => {
      const content = new DrizzleContentAdminRepository(get().db)
      const repo = new DrizzleCourseRepository(get().db)
      const free = await insertCourse()
      const current = await repo.findCourseById(free.id)
      if (!current) throw new Error('curso ausente')
      expect(await content.updateCourse({ ...current, modality: 'live' })).toBe(true)
      const withCohort = await insertCourse({ modality: 'live' })
      await insertCohort({ courseId: withCohort.id, lessonIds: withCohort.lessonIds })
      const locked = await repo.findCourseById(withCohort.id)
      if (!locked) throw new Error('curso ausente')
      let error: unknown
      try {
        await content.updateCourse({ ...locked, modality: 'recorded' })
      } catch (caught) {
        error = caught
      }
      expect(error).toBeInstanceOf(CourseModalityLockedError)
      // O resto do curso segue editável com a turma.
      expect(await content.updateCourse({ ...locked, title: 'Novo título' })).toBe(true)
    },
    SLOW,
  )

  test(
    'a vaga abre só as aulas com grant ativo; professora atribuída; vaga ativa por vitrine',
    async () => {
      const access = new DrizzleLiveLessonAccessRepository(get().db)
      const course = await insertCourse({ modality: 'live' })
      const teacherId = randomUUID()
      const { accountId, learnerId } = await insertCohort({
        courseId: course.id,
        lessonIds: course.lessonIds,
        teacherId,
        windows: [
          { from: -HOUR, to: 30 * DAY },
          { from: DAY, to: 31 * DAY },
        ],
      })
      const open = await access.openLessons({ accountId, learnerId, courseId: course.id, now: NOW })
      expect(open).toEqual([
        { lessonId: course.lessonIds[0], endsAt: new Date(NOW.getTime() + 30 * DAY) },
      ])
      const later = await access.openLessons({
        accountId,
        learnerId,
        courseId: course.id,
        now: new Date(NOW.getTime() + 2 * DAY),
      })
      expect(later.map((l) => l.lessonId).sort()).toEqual([...course.lessonIds].sort())
      // Outra criança da mesma conta, outro curso: nada.
      expect(
        await access.openLessons({
          accountId,
          learnerId: randomUUID(),
          courseId: course.id,
          now: NOW,
        }),
      ).toEqual([])
      const other = await insertCourse({ modality: 'live' })
      expect(
        await access.openLessons({ accountId, learnerId, courseId: other.id, now: NOW }),
      ).toEqual([])

      expect(await access.isAssignedTeacher({ teacherId, courseId: course.id })).toBe(true)
      expect(await access.isAssignedTeacher({ teacherId, courseId: other.id })).toBe(false)

      expect(await access.hasActiveSeat({ accountId, learnerId, audience: 'kids', now: NOW })).toBe(
        true,
      )
      expect(
        await access.hasActiveSeat({ accountId, learnerId, audience: 'adult', now: NOW }),
      ).toBe(false)
      expect(
        await access.hasActiveSeat({
          accountId,
          learnerId,
          audience: 'kids',
          now: new Date(NOW.getTime() + 40 * DAY),
        }),
      ).toBe(false)
    },
    SLOW,
  )

  test(
    'grant revogado, vaga revogada e turma em rascunho não abrem; turma arquivada não é vaga',
    async () => {
      const access = new DrizzleLiveLessonAccessRepository(get().db)
      const course = await insertCourse({ modality: 'live' })
      const revoked = await insertCohort({
        courseId: course.id,
        lessonIds: [course.lessonIds[0]],
        windows: [{ from: -HOUR, to: DAY, revoked: true }],
      })
      const seatRevoked = await insertCohort({
        courseId: course.id,
        lessonIds: [course.lessonIds[0]],
        enrollment: 'revoked',
      })
      const draft = await insertCohort({
        courseId: course.id,
        lessonIds: [course.lessonIds[0]],
        status: 'draft',
      })
      const archived = await insertCohort({
        courseId: course.id,
        lessonIds: [course.lessonIds[0]],
        status: 'archived',
      })
      for (const seat of [revoked, seatRevoked, draft])
        expect(await access.openLessons({ ...seat, courseId: course.id, now: NOW })).toEqual([])
      expect(await access.hasActiveSeat({ ...archived, audience: 'kids', now: NOW })).toBe(false)
    },
    SLOW,
  )

  test(
    'o award descarta os marcos da Jornada do curso ao vivo e dá as conquistas próprias',
    async () => {
      const { db } = get()
      const repo = new DrizzleGamificationRepository(db)
      const live = await insertCourse({ modality: 'live' })
      const recorded = await insertCourse()
      const userId = randomUUID()
      // Recorded milestones consume the canonical policy even in a mixed live-course batch.
      const journey = await publishKidsSeedForTest(db)
      const accountId = randomUUID()
      await journey.initializeProfile({ userId, accountId })
      const award = (events: { sourceType: never; sourceId: string; amount: number }[]) =>
        repo.award({
          userId,
          accountId,
          audience: 'kids',
          events,
          today: '2026-11-07',
          now: NOW,
          privileged: false,
        })
      const ev = (sourceType: string, sourceId: string) => ({
        sourceType: sourceType as never,
        sourceId,
        amount: 0,
      })
      await award([
        ev('course_complete', live.id),
        ev('course_showcased', live.id),
        ev('course_complete', recorded.id),
        ev('live_course_complete', live.id),
        ev('live_encounter', randomUUID()),
      ])
      const rows = await db
        .select({ type: xpEvents.sourceType, sourceId: xpEvents.sourceId })
        .from(xpEvents)
        .where(eq(xpEvents.userId, userId))
      const types = rows.map((r) => `${r.type}:${r.sourceId === live.id ? 'live' : 'other'}`)
      expect(types).not.toContain('course_complete:live')
      expect(types).not.toContain('course_showcased:live')
      expect(types).toContain('course_complete:other')
      expect(types).toContain('live_course_complete:live')
      const badges = (await db.select().from(userBadges).where(eq(userBadges.userId, userId))).map(
        (b) => b.badgeSlug,
      )
      expect(badges).toEqual(
        expect.arrayContaining(['live-course-complete', 'live-first-encounter']),
      )
      const items = (
        await db.select().from(roomInventory).where(eq(roomInventory.userId, userId))
      ).map((i) => i.itemId)
      expect(items).toEqual(expect.arrayContaining(['trofeu-oficina-completa', 'estante-trofeus']))
    },
    SLOW,
  )

  test(
    'marco legado de curso ao vivo não libera bloco do Estúdio pelo currículo',
    async () => {
      const { db } = get()
      const live = await insertCourse({
        modality: 'live',
        metadata: { studioUnlockBlocks: ['bloco_ao_vivo'] },
      })
      const recorded = await insertCourse({ metadata: { studioUnlockBlocks: ['bloco_gravado'] } })
      const userId = randomUUID()
      for (const courseId of [live.id, recorded.id])
        await db.insert(xpEvents).values({
          id: randomUUID(),
          userId,
          audience: 'kids',
          sourceType: 'course_complete',
          sourceId: courseId,
          amount: 0,
          createdAt: NOW,
        })
      const grants = await eligibleStudioGrants(db, userId, 'kids')
      expect(grants).toEqual([{ courseId: recorded.id, blocks: ['bloco_gravado'] }])
    },
    SLOW,
  )

  for (const audience of ['kids', 'adult'] as const) {
    test(
      `LIVE ${audience}: freezes in award and replay before GET, without product or Kids journey`,
      async () => {
        const { db } = get()
        const course = await insertCourse({
          modality: 'live',
          audience,
          metadata: { studioUnlockBlocks: ['sz_py_pass'] },
        })
        const userId = randomUUID()
        const accountId = audience === 'adult' ? userId : randomUUID()
        const repo = new DrizzleGamificationRepository(db)
        const unlocks = new DrizzleStudioUnlockRepository(db)
        const service = new GetStudioUnlocksService(repo, unlocks, silentLogger)
        const input = {
          userId,
          accountId,
          audience,
          now: NOW,
          today: '2026-11-07',
          privileged: false,
          events: [
            { sourceType: 'live_course_complete', sourceId: course.id, amount: 0 },
          ] satisfies AwardXpEventInput[],
        }
        const before = await repo.getStudioUnlockRevision(userId, audience)
        await repo.award(input)
        expect(await unlocks.listGrants(userId, audience)).toEqual([
          { courseId: course.id, blocks: ['sz_py_pass'] },
        ])
        expect(await repo.getStudioUnlockRevision(userId, audience)).not.toBe(before)
        expect(await unlocks.listGrants(randomUUID(), audience)).toEqual([])
        expect(await unlocks.listGrants(userId, audience === 'kids' ? 'adult' : 'kids')).toEqual([])
        const blocks = ['sz_py_pass', 'sz_g2d_create_ship']
        await db
          .update(courses)
          .set({ metadata: { studioUnlockBlocks: blocks } })
          .where(eq(courses.id, course.id))
        await repo.award(input)
        expect(await unlocks.listGrants(userId, audience)).toEqual([
          { courseId: course.id, blocks },
        ])
        const events = await db.select().from(xpEvents).where(eq(xpEvents.userId, userId))
        expect(events).toHaveLength(1)
        expect(events[0]).toMatchObject({
          sourceType: 'live_course_complete',
          amount: 0,
          sourceLevel: null,
          sourceTrack: null,
          sourceCareerSlot: null,
        })
        expect(
          await db.select().from(kidsJourneyEarned).where(eq(kidsJourneyEarned.userId, userId)),
        ).toEqual([])
        expect(
          await db.select().from(entitlements).where(eq(entitlements.userId, accountId)),
        ).toEqual([])
        await db
          .update(courses)
          .set({ status: 'archived', metadata: { studioUnlockBlocks: [] } })
          .where(eq(courses.id, course.id))
        expect(await eligibleStudioGrants(db, userId, audience)).toEqual([])
        expect(await service.execute(userId, audience, accountId)).toEqual({ blocks })
        await db.delete(courses).where(eq(courses.id, course.id))
        expect(await service.execute(userId, audience, accountId)).toEqual({ blocks })
      },
      SLOW,
    )
  }

  test(
    'LIVE grants roll back with the completion event and profile in the same transaction',
    async () => {
      const { db } = get()
      const course = await insertCourse({
        modality: 'live',
        metadata: { studioUnlockBlocks: ['sz_py_pass'] },
      })
      const userId = randomUUID()
      const repo = new DrizzleGamificationRepository(db)
      const failure = new Error('Rollback after award')
      const result = await db
        .transaction(async (tx) => {
          await repo.awardInTransaction(tx, {
            userId,
            accountId: randomUUID(),
            audience: 'kids',
            now: NOW,
            today: '2026-11-07',
            privileged: false,
            events: [{ sourceType: 'live_course_complete', sourceId: course.id, amount: 0 }],
          })
          expect(
            await new DrizzleStudioUnlockRepository(tx).listGrants(userId, 'kids'),
          ).toHaveLength(1)
          throw failure
        })
        .then(
          () => null,
          (error: unknown) => error,
        )
      expect(result).toBe(failure)
      expect(await db.select().from(xpEvents).where(eq(xpEvents.userId, userId))).toEqual([])
      expect(await new DrizzleStudioUnlockRepository(db).listGrants(userId, 'kids')).toEqual([])
      expect(
        await db.select().from(gamificationProfiles).where(eq(gamificationProfiles.userId, userId)),
      ).toEqual([])
    },
    SLOW,
  )

  test(
    'LIVE eligibility pairs modality, audience, owner and publication; presence is not completion',
    async () => {
      const { db } = get()
      const live = await insertCourse({
        modality: 'live',
        metadata: { studioUnlockBlocks: ['sz_py_pass'] },
      })
      const recorded = await insertCourse({
        metadata: { studioUnlockBlocks: ['sz_g2d_create_ship'] },
      })
      const draft = await insertCourse({
        modality: 'live',
        status: 'draft',
        metadata: { studioUnlockBlocks: ['sz_py_pass'] },
      })
      const adult = await insertCourse({
        modality: 'live',
        audience: 'adult',
        metadata: { studioUnlockBlocks: ['sz_py_pass'] },
      })
      const userId = randomUUID()
      const events: AwardXpEventInput[] = [
        { sourceType: 'course_complete', sourceId: live.id, amount: 0 },
        { sourceType: 'course_showcased', sourceId: live.id, amount: 0 },
        { sourceType: 'live_encounter', sourceId: live.id, amount: 0 },
        { sourceType: 'live_course_complete', sourceId: recorded.id, amount: 0 },
        { sourceType: 'live_course_complete', sourceId: draft.id, amount: 0 },
        { sourceType: 'live_course_complete', sourceId: adult.id, amount: 0 },
      ]
      await db.insert(xpEvents).values(
        events.map((event) => ({
          ...event,
          id: randomUUID(),
          userId,
          audience: 'kids' as const,
          createdAt: NOW,
        })),
      )
      const repo = new DrizzleGamificationRepository(db)
      expect(await eligibleStudioGrants(db, userId, 'kids')).toEqual([])
      expect(await eligibleStudioGrants(db, userId, 'adult')).toEqual([])
      expect(await repo.getStudioUnlockRevision(userId, 'kids')).toBe(studioUnlockRevision([]))
      await db.insert(xpEvents).values({
        id: randomUUID(),
        userId,
        audience: 'kids',
        sourceType: 'live_course_complete',
        sourceId: live.id,
        amount: 0,
        createdAt: NOW,
      })
      expect(await eligibleStudioGrants(db, userId, 'kids')).toEqual([
        { courseId: live.id, blocks: ['sz_py_pass'] },
      ])
      expect(await eligibleStudioGrants(db, randomUUID(), 'kids')).toEqual([])
      expect(await repo.getStudioUnlockRevision(userId, 'kids')).not.toBe(studioUnlockRevision([]))
    },
    SLOW,
  )

  test(
    'a base do Zappy nunca fala de curso ao vivo (busca, reindexação e faxina)',
    async () => {
      const { db } = get()
      const zappy = new DrizzleZappyKnowledgeRepository(db)
      const live = await insertCourse({ modality: 'live' })
      const recorded = await insertCourse()
      const blockOf = async (course: { id: string; lessonIds: [string, string] }) => {
        const id = randomUUID()
        await db.insert(lessonBlocks).values({
          id,
          lessonId: course.lessonIds[0],
          kind: 'rich_text',
          sortOrder: 0,
          content: { kind: 'rich_text', markdown: 'Colisão entre o foguete e o asteroide.' },
        })
        const [row] = await db
          .select({ revision: lessonBlocks.contentRevision })
          .from(lessonBlocks)
          .where(eq(lessonBlocks.id, id))
        const saved = await zappy.upsert({
          courseId: course.id,
          lessonId: course.lessonIds[0],
          blockId: id,
          blockRevision: row?.revision ?? '',
          sourceType: 'rich-text',
          sourceRef: `block:${id}`,
          contentHash: 'a'.repeat(64),
          status: 'ready',
          chunks: [
            {
              content: 'Colisão entre o foguete e o asteroide.',
              normalizedText: 'colisao entre o foguete e o asteroide',
            },
          ],
          now: NOW,
        })
        expect(saved).not.toBeNull()
        return id
      }
      const liveBlock = await blockOf(live)
      const recordedBlock = await blockOf(recorded)
      // A sincronização do Admin descobre a modalidade pela autoridade da fonte.
      expect((await zappy.sourceAuthorityForRef(`block:${liveBlock}`))?.modality).toBe('live')
      expect((await zappy.sourceAuthorityForRef(`block:${recordedBlock}`))?.modality).toBe(
        'recorded',
      )
      const hits = await zappy.search(
        [live.lessonIds[0], recorded.lessonIds[0]],
        'colisao foguete',
        10,
      )
      expect(hits.map((h) => h.courseId)).toEqual([recorded.id])
      const indexed = (await zappy.listPublishedKidsBlocks()).map((b) => b.blockId)
      expect(indexed).toContain(recordedBlock)
      expect(indexed).not.toContain(liveBlock)
      await zappy.reconcilePublishedSources()
      const remaining = (
        await db
          .select({ ref: zappyKnowledgeSources.sourceRef })
          .from(zappyKnowledgeSources)
          .where(
            query`${zappyKnowledgeSources.sourceRef} in (${`block:${liveBlock}`}, ${`block:${recordedBlock}`})`,
          )
      ).map((r) => r.ref)
      expect(remaining).toEqual([`block:${recordedBlock}`])
    },
    SLOW,
  )
})
