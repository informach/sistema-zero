import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { eq } from 'drizzle-orm'
import { LiveService } from '../../src/application/live/live.service'
import { LiveWorkspaceService } from '../../src/application/live/live-workspace.service'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import { OwnRecordingProvider } from '../../src/infrastructure/live/own-recording.provider'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLiveRepository } from '../../src/infrastructure/persistence/drizzle/live.repository'
import { DrizzleLiveCourseRepository } from '../../src/infrastructure/persistence/drizzle/live-course.repository'
import { DrizzleLiveWorkspaceRepository } from '../../src/infrastructure/persistence/drizzle/live-workspace.repository'
import {
  liveRecordingJobs,
  liveWorkspaces,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { ensureCourseTables } from './live-course-rows'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_live_course_test')
if (!databaseUrl)
  console.warn('[tests/db] Postgres indisponível: cursos ao vivo não verificados em banco real.')

const studioSeed = (name: string) => createBlankProjectSnapshot(randomUUID(), name)

describe.skipIf(!databaseUrl)('cursos ao vivo no PostgreSQL real', () => {
  let connection: DbConnection
  const created = { courses: [] as string[], lessons: [] as string[] }
  beforeAll(async () => {
    connection = createDbConnection(databaseUrl as string)
    await ensureCourseTables(connection)
  })
  afterAll(async () => {
    if (connection) {
      if (created.lessons.length) {
        await connection.sql`delete from members.lesson_blocks where lesson_id = any(${created.lessons}::uuid[])`
        await connection.sql`delete from members.lesson_structures where lesson_id = any(${created.lessons}::uuid[])`
        await connection.sql`delete from members.lessons where id = any(${created.lessons}::uuid[])`
      }
      if (created.courses.length) {
        await connection.sql`delete from members.modules where course_id = any(${created.courses}::uuid[])`
        await connection.sql`delete from members.courses where id = any(${created.courses}::uuid[])`
      }
      await connection.close()
    }
  })

  /** A course with modules (created out of order) and lessons; `live` marks the modality. */
  async function course(input: {
    modality: 'live' | 'recorded'
    audience?: 'adult' | 'kids'
    status?: 'draft' | 'published' | 'archived'
    title?: string
  }) {
    const id = randomUUID()
    created.courses.push(id)
    await connection.sql`
      insert into members.courses
        (id, version, slug, title, status, audience, level, track, journey_role, sequential_lock,
         video_before_activity, metadata, created_at, updated_at)
      values
        (${id}, 0, ${`curso-${id}`}, ${input.title ?? 'Oficina SQL'}, ${input.status ?? 'published'},
         ${input.audience ?? 'kids'}, 'iniciante', '2d', 'reward', false, false,
         ${JSON.stringify({ modality: input.modality })}::jsonb, now(), now())`
    // When the `modality` column exists (course side, migration 0113) it is the authority.
    const [column] = await connection.sql`
      select 1 from information_schema.columns
      where table_schema = 'members' and table_name = 'courses' and column_name = 'modality'`
    if (column)
      await connection.sql.unsafe('update members.courses set modality = $1 where id = $2', [
        input.modality,
        id,
      ])
    const later = randomUUID(),
      first = randomUUID()
    for (const [moduleId, order] of [
      [later, 1],
      [first, 0],
    ] as const)
      await connection.sql`
        insert into members.modules (id, course_id, title, sort_order, created_at, updated_at)
        values (${moduleId}, ${id}, 'Módulo', ${order}, now(), now())`
    const lesson = async (moduleId: string, order: number, published = true) => {
      const lessonId = randomUUID()
      created.lessons.push(lessonId)
      await connection.sql`
        insert into members.lessons
          (id, module_id, course_id, slug, title, sort_order, is_published, created_at, updated_at)
        values (${lessonId}, ${moduleId}, ${id}, ${`aula-${lessonId}`}, ${`Aula ${order}`}, ${order},
          ${published}, now(), now())`
      return lessonId
    }
    // Course order: first module (sort 0) lessons 0, 1; then the later module (sort 1).
    const l2 = await lesson(later, 0)
    const l0 = await lesson(first, 0)
    const l1 = await lesson(first, 1)
    const draft = await lesson(first, 2, false)
    return { id, slug: `curso-${id}`, lessons: [l0, l1, l2], draft }
  }

  /** The published parts of a lesson (`lesson_structures`), as the authoring publishes them. */
  async function structure(lessonId: string, sections: string[]) {
    const parts = sections.map((id) => ({
      id,
      title: 'Parte',
      objective: '',
      intent: 'application',
      blockIds: [],
      workspaceBlockId: null,
      externalTool: null,
      pendingMedia: [],
    }))
    await connection.sql`
      insert into members.lesson_structures (lesson_id, revision, sections)
      values (${lessonId}, ${randomUUID()}, ${JSON.stringify(parts)}::jsonb)`
  }

  async function block(
    lessonId: string,
    content: Record<string, unknown>,
    { archived = false, sortOrder = 0 }: { archived?: boolean; sortOrder?: number } = {},
  ) {
    const id = randomUUID()
    await connection.sql`
      insert into members.lesson_blocks (id, lesson_id, kind, sort_order, content, archived_at)
      values (${id}, ${lessonId}, ${String(content.kind)}, ${sortOrder}, ${JSON.stringify(content)}::jsonb,
        ${archived ? new Date().toISOString() : null}::timestamptz)`
    return id
  }

  test('o adaptador lê só cursos ao vivo, as aulas publicadas em ordem, partes e blocos Estúdio', async () => {
    const repository = new DrizzleLiveCourseRepository(connection.db)
    const live = await course({ modality: 'live', title: 'Oficina A' })
    const recorded = await course({ modality: 'recorded' })
    const adult = await course({ modality: 'live', audience: 'adult' })
    const archived = await course({ modality: 'live', status: 'archived' })
    const found = (await repository.findCourse(live.id))!
    expect(found).toMatchObject({ modality: 'live', status: 'published', audience: 'kids' })
    expect(found.lessons.map((lesson) => lesson.id)).toEqual(live.lessons)
    expect((await repository.findCourse(recorded.id))?.modality).toBe('recorded')
    expect(await repository.findCourse(randomUUID())).toBeNull()
    const ids = [live.id, recorded.id, adult.id, archived.id]
    expect((await repository.listLiveCourses({ ids })).map((item) => item.id).sort()).toEqual(
      [live.id, adult.id].sort(),
    )
    expect(
      (await repository.listLiveCourses({ ids, audience: 'adult' })).map((item) => item.id),
    ).toEqual([adult.id])
    expect(await repository.listLiveCourses({ ids: [] })).toEqual([])
    // Parts: the published structure, or the single default part (the lesson id).
    const sections: string[] = [randomUUID(), randomUUID()]
    await structure(live.lessons[0]!, sections)
    expect(await repository.lessonSections(live.lessons[0]!)).toEqual({
      lessonId: live.lessons[0]!,
      courseId: live.id,
      published: true,
      sectionIds: sections,
    })
    expect((await repository.lessonSections(live.lessons[1]!))?.sectionIds).toEqual([
      live.lessons[1]!,
    ])
    expect((await repository.lessonSections(live.draft))?.published).toBe(false)
    expect(await repository.lessonSections(randomUUID())).toBeNull()
    // Studio blocks: seed, trimmed chain and curation; nothing else counts.
    const seed = studioSeed('Semente')
    const studio = await block(live.lessons[0]!, {
      kind: 'studio',
      initialProject: seed,
      chain: '  meu-jogo ',
      level: 'iniciante',
      allowBlocks: ['move_steps'],
      allowedModes: ['blocks', 'code'],
      allowLevelReveal: false,
    })
    expect(await repository.studioBlock(live.lessons[0]!, studio)).toEqual({
      blockId: studio,
      lessonId: live.lessons[0]!,
      courseId: live.id,
      chain: 'meu-jogo',
      initialProject: seed,
      studio: {
        level: 'iniciante',
        allowBlocks: ['move_steps'],
        allowedModes: ['blocks', 'code'],
        allowLevelReveal: false,
      },
    })
    const plain = await block(live.lessons[1]!, {
      kind: 'studio',
      initialProject: seed,
      pythonLevel: 2,
    })
    expect(await repository.studioBlock(live.lessons[1]!, plain)).toMatchObject({
      chain: null,
      studio: { pythonLevel: 2 },
    })
    const text = await block(
      live.lessons[0]!,
      { kind: 'rich_text', markdown: 'Oi' },
      { sortOrder: 1 },
    )
    const hidden = await block(
      live.lessons[0]!,
      { kind: 'studio', initialProject: seed },
      { archived: true, sortOrder: 2 },
    )
    const draft = await block(live.draft, { kind: 'studio', initialProject: seed })
    for (const [lessonId, blockId] of [
      [live.lessons[1]!, studio],
      [live.lessons[0]!, text],
      [live.lessons[0]!, hidden],
      [live.draft, draft],
    ] as const)
      expect(await repository.studioBlock(lessonId, blockId)).toBeNull()
  })

  test('turma, catálogo por plataforma, partes, relato e projeto por bloco com UMA conexão', async () => {
    const live = await course({ modality: 'live', title: 'Oficina B' })
    const adult = await course({ modality: 'live', audience: 'adult' })
    const sections: string[] = [randomUUID(), randomUUID(), randomUUID()]
    await structure(live.lessons[0]!, sections)
    const blockId = await block(live.lessons[0]!, {
      kind: 'studio',
      initialProject: studioSeed('Fase 1'),
      chain: 'jogo',
      level: 'iniciante',
    })
    const teacher: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Ana',
      staff: true,
    }
    const child: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Bia',
      staff: false,
    }
    // Every write that opened a second pool connection while holding a lock would wait forever.
    const single = createDbConnection(databaseUrl as string, { max: 1 })
    const bounded = <T>(work: Promise<T>) =>
      Promise.race([
        work,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('pool esgotado: segunda conexão')), 10_000),
        ),
      ])
    try {
      const clock = () => new Date('2026-11-07T17:00:00Z')
      const service = new LiveService(
        new DrizzleLiveRepository(single.db),
        clock,
        { assertOwnership: async () => ({ name: 'Bia' }) },
        { mediaReady: true, courses: new DrizzleLiveCourseRepository(single.db) },
      )
      const workspaces = new LiveWorkspaceService(
        new DrizzleLiveWorkspaceRepository(single.db),
        service,
        clock,
      )
      const schedule = (count: number) =>
        Array.from({ length: count }, (_, index) => ({
          startsAt: new Date(
            Date.parse('2026-11-07T17:00:00Z') + index * 7 * 86_400_000,
          ).toISOString(),
          endsAt: new Date(
            Date.parse('2026-11-07T18:00:00Z') + index * 7 * 86_400_000,
          ).toISOString(),
        }))
      const input = {
        title: 'Turma SQL',
        timeZone: 'America/Sao_Paulo',
        capacity: 2,
        accessDays: 30,
        teacherIds: [teacher.id],
      }
      await bounded(
        (async () => {
          const { cohort, sessions } = await service.createCohort(teacher, live.id, {
            ...input,
            schedule: schedule(3),
          })
          expect(sessions.map((session) => session.lessonId)).toEqual(live.lessons)
          const [stored] = await single.sql`
            select course_id, program_id from members.live_cohorts where id = ${cohort.id}`
          expect(stored).toEqual({ course_id: live.id, program_id: null })
          await service.createCohort(teacher, adult.id, { ...input, schedule: schedule(3) })
          // The shared test database keeps cohorts of earlier runs: walk every page.
          const pages = []
          let cursor: string | undefined
          do {
            const page = await service.catalog({ ...teacher, admin: true }, 'admin', {
              audience: 'kids',
              limit: 50,
              cursor,
            })
            pages.push(page)
            cursor = page.nextCursor ?? undefined
          } while (cursor)
          const listed = pages.flatMap((page) => page.cohorts)
          expect(pages[0]!.courses?.map((item) => item.id)).toContain(live.id)
          expect(pages[0]!.courses?.map((item) => item.id)).not.toContain(adult.id)
          expect(listed.some((item) => item.courseId === adult.id)).toBe(false)
          expect(listed.some((item) => item.id === cohort.id)).toBe(true)
          await service.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
          const nextSlug = `renomeado-${live.id}`
          await single.sql`update members.courses set slug = ${nextSlug} where id = ${live.id}::uuid`
          expect((await service.room(teacher, sessions[0]!.id)).lesson?.courseSlug).toBe(nextSlug)
          expect(
            (await new DrizzleLiveRepository(single.db).findCohort(cohort.id))?.cohort.course?.slug,
          ).toBe(nextSlug)

          await service.enroll(teacher, cohort.id, {
            accountId: child.accountId,
            learnerId: child.id,
            learnerName: 'Bia',
          })
          const session = sessions[0]!
          const deviceId = randomUUID()
          const started = await service.control(teacher, session.id, undefined, { kind: 'start' })
          expect(started.occurrence?.sections).toEqual({
            openedIds: [sections[0]!],
            currentId: sections[0]!,
          })
          await service.join(child, session.id, { deviceId, takeover: false })
          await service.control(teacher, session.id, undefined, {
            kind: 'admit',
            learnerId: child.id,
          })
          await service.control(teacher, session.id, undefined, {
            kind: 'open-section',
            sectionId: sections[1]!,
          })
          const reported = await service.heartbeat(child, session.id, deviceId, {
            stepId: null,
            saveState: 'saved',
            sectionId: sections[1]!,
            completedSectionIds: [sections[0]!],
          })
          expect(reported.occurrence?.sections?.currentId).toBe(sections[1])
          const opened = await workspaces.openForBlock(child, session.id, blockId)
          expect(opened.project).toMatchObject({ id: opened.id, name: 'Fase 1' })
          expect(opened.studio).toEqual({ level: 'iniciante' })
          const claimed = await workspaces.claim(child, opened.id, deviceId, false)
          await workspaces.commit(child, opened.id, {
            deviceId,
            writerEpoch: claimed.writerEpoch,
            expectedRevision: 0,
            mutationId: randomUUID(),
            project: { ...claimed.project, name: 'Fase 1 pronta' },
          })
          const [row] = await single.sql`
            select project_key, lesson_ids, session_id from members.live_workspaces
            where id = ${opened.id}`
          expect(row).toEqual({
            project_key: `course:${live.id}:chain:jogo`,
            lesson_ids: [live.lessons[0]],
            session_id: session.id,
          })
        })(),
      )
    } finally {
      await single.close()
    }
  }, 30_000)

  test('criar turma trava o curso e confere a modalidade de novo sob a trava', async () => {
    const live = await course({ modality: 'live', title: 'Oficina corrida' })
    const port = new DrizzleLiveCourseRepository(connection.db)
    const teacher: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Ana',
      staff: true,
    }
    // The course turns "recorded" between the read and the cohort insert (the course side
    // changes the modality under the same row lock when there is no cohort yet).
    const racing = {
      ...port,
      lessonSections: port.lessonSections.bind(port),
      studioBlock: port.studioBlock.bind(port),
      listLiveCourses: port.listLiveCourses.bind(port),
      findCourse: async (id: string) => {
        const found = await port.findCourse(id)
        await connection.sql`update members.courses set metadata = ${JSON.stringify({ modality: 'recorded' })}::jsonb where id = ${id}`
        const [column] = await connection.sql`
          select 1 from information_schema.columns
          where table_schema = 'members' and table_name = 'courses' and column_name = 'modality'`
        if (column)
          await connection.sql.unsafe(
            "update members.courses set modality = 'recorded' where id = $1",
            [id],
          )
        return found
      },
    }
    const service = new LiveService(
      new DrizzleLiveRepository(connection.db),
      () => new Date('2026-11-07T17:00:00Z'),
      { assertOwnership: async () => ({ name: 'Bia' }) },
      { mediaReady: true, courses: racing },
    )
    const error = await service
      .createCohort(teacher, live.id, {
        title: 'Turma',
        timeZone: 'America/Sao_Paulo',
        capacity: 2,
        accessDays: 30,
        teacherIds: [teacher.id],
        schedule: [0, 1, 2].map((week) => ({
          startsAt: new Date(
            Date.parse('2026-11-07T17:00:00Z') + week * 7 * 86_400_000,
          ).toISOString(),
          endsAt: new Date(
            Date.parse('2026-11-07T18:00:00Z') + week * 7 * 86_400_000,
          ).toISOString(),
        })),
      })
      .then(
        () => null,
        (cause: Error) => cause,
      )
    expect(error?.message).toContain('não é mais ao vivo')
    const [left] =
      await connection.sql`select count(*)::int as n from members.live_cohorts where course_id = ${live.id}`
    expect(left?.n).toBe(0)
  })

  test('a criança numa turma NOVA do mesmo curso leva o projeto (nunca durante uma ajuda)', async () => {
    const live = await course({ modality: 'live', title: 'Oficina C' })
    const blockId = await block(live.lessons[0]!, {
      kind: 'studio',
      initialProject: studioSeed('Meu jogo'),
      chain: 'jogo',
    })
    const teacher: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Ana',
      staff: true,
    }
    const child: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Bia',
      staff: false,
    }
    let now = new Date('2026-11-07T17:00:00Z')
    const service = new LiveService(
      new DrizzleLiveRepository(connection.db),
      () => now,
      { assertOwnership: async () => ({ name: 'Bia' }) },
      { mediaReady: true, courses: new DrizzleLiveCourseRepository(connection.db) },
    )
    const workspaces = new LiveWorkspaceService(
      new DrizzleLiveWorkspaceRepository(connection.db),
      service,
      () => now,
    )
    const cohortAt = async (start: string) => {
      const base = Date.parse(start)
      const { cohort, sessions } = await service.createCohort(teacher, live.id, {
        title: 'Turma',
        timeZone: 'America/Sao_Paulo',
        capacity: 2,
        accessDays: 1,
        teacherIds: [teacher.id],
        schedule: [0, 1, 2].map((week) => ({
          startsAt: new Date(base + week * 7 * 86_400_000).toISOString(),
          endsAt: new Date(base + week * 7 * 86_400_000 + 3_600_000).toISOString(),
        })),
      })
      await service.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
      await service.enroll(teacher, cohort.id, {
        accountId: child.accountId,
        learnerId: child.id,
        learnerName: 'Bia',
      })
      return sessions[0]!
    }
    const first = await cohortAt('2026-11-07T17:00:00Z')
    const opened = await workspaces.openForBlock(child, first.id, blockId)
    now = new Date('2027-02-06T17:00:00Z')
    const second = await cohortAt('2027-02-06T17:00:00Z')
    const moved = await workspaces.openForBlock(child, second.id, blockId)
    expect(moved.id).toBe(opened.id)
    expect(moved.sessionId).toBe(second.id)
    expect(moved.readOnly).toBeUndefined()
    // During a teacher's help the project stays where it is.
    const third = await cohortAt('2027-02-06T17:00:00Z')
    await connection.db
      .update(liveWorkspaces)
      .set({
        assistance: {
          id: randomUUID(),
          teacherId: teacher.id,
          teacherName: 'Ana',
          status: 'requested',
          requestedAt: now.toISOString(),
          checkpointRevision: null,
        },
      })
      .where(eq(liveWorkspaces.id, opened.id))
    const repository = new DrizzleLiveWorkspaceRepository(connection.db)
    expect(
      (await repository.linkLesson(opened.id, { lessonId: live.lessons[0]!, sessionId: third.id }))
        .sessionId,
    ).toBe(second.id)
  })

  test('linha do tempo do gravador guardada vira capítulos ao publicar', async () => {
    const live = await course({ modality: 'live', title: 'Oficina D' })
    const sections: string[] = [randomUUID(), randomUUID()]
    await structure(live.lessons[0]!, sections)
    const teacher: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Ana',
      staff: true,
    }
    let now = new Date('2026-11-07T17:00:00Z')
    const repository = new DrizzleLiveRepository(connection.db)
    let provider: OwnRecordingProvider | undefined
    const service = new LiveService(
      repository,
      () => now,
      { assertOwnership: async () => ({ name: 'Bia' }) },
      {
        mediaReady: true,
        courses: new DrizzleLiveCourseRepository(connection.db),
        recordingTimeline: async (id) => (await provider?.timeline(id)) ?? null,
      },
    )
    const { sessions } = await service.createCohort(teacher, live.id, {
      title: 'Turma',
      timeZone: 'America/Sao_Paulo',
      capacity: 2,
      accessDays: 30,
      teacherIds: [teacher.id],
      schedule: [0, 1, 2].map((week) => ({
        startsAt: new Date(
          Date.parse('2026-11-07T17:00:00Z') + week * 7 * 86_400_000,
        ).toISOString(),
        endsAt: new Date(Date.parse('2026-11-07T18:00:00Z') + week * 7 * 86_400_000).toISOString(),
      })),
    })
    const session = sessions[0]!
    await service.control(teacher, session.id, undefined, { kind: 'start' })
    now = new Date('2026-11-07T17:20:00Z')
    await service.control(teacher, session.id, undefined, {
      kind: 'open-section',
      sectionId: sections[1]!,
    })
    await service.control(teacher, session.id, undefined, { kind: 'end' })
    const jobId = randomUUID()
    await connection.db.insert(liveRecordingJobs).values({
      occurrenceId: session.occurrenceId,
      jobId,
      generation: 1,
      desiredState: 'stopped',
      confirmedState: 'review',
      leaseEndsAt: new Date(),
    })
    // The recorder answers with its stored manifest once, then disappears.
    let answering = true
    const segments = [
      {
        sequence: 0,
        key: 'a',
        startsAt: '2026-11-07T17:00:00.000Z',
        endsAt: '2026-11-07T17:00:30.000Z',
        durationMs: 30_000,
      },
      {
        sequence: 1,
        key: 'b',
        startsAt: '2026-11-07T17:19:50.000Z',
        endsAt: '2026-11-07T17:20:20.000Z',
        durationMs: 30_000,
      },
    ]
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch: () =>
        answering
          ? Response.json({ jobId, generation: 1, state: 'review', captureStopped: true, segments })
          : new Response('fora', { status: 503 }),
    })
    try {
      provider = new OwnRecordingProvider(connection.db, repository, service, {
        url: `http://127.0.0.1:${server.port}`,
        token: 'private-recorder-test-token-at-least-32-characters',
      })
      const timeline = await provider.timeline(session.occurrenceId)
      expect(timeline?.map((item) => item.durationMs)).toEqual([30_000, 30_000])
      answering = false
      // Stored: the chapters do not depend on the recorder still being there.
      expect(await provider.timeline(session.occurrenceId)).toEqual(timeline)
      const [job] = await connection.db
        .select({ segments: liveRecordingJobs.segments })
        .from(liveRecordingJobs)
        .where(eq(liveRecordingJobs.occurrenceId, session.occurrenceId))
      expect(job?.segments).toHaveLength(2)
      expect(JSON.stringify(job?.segments)).not.toContain('"key"')
      const recording = await service.setRecordingState(session.occurrenceId, {
        state: 'review',
        storageKey: `live/recordings/${session.occurrenceId}/${jobId}/1/replay.mp4`,
      })
      const published = await service.publishRecording(teacher, session.id, recording.version, true)
      expect(published.occurrence?.recording.chapters).toEqual([
        { sectionId: sections[0]!, seconds: 0 },
        { sectionId: sections[1]!, seconds: 40 },
      ])
      const [row] = await connection.sql`
        select document->'recording'->'chapters' as chapters from members.live_occurrences
        where id = ${session.occurrenceId}`
      expect(row?.chapters).toHaveLength(2)
    } finally {
      server.stop(true)
    }
  })
})
