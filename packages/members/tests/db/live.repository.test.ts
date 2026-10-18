import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { LiveService } from '../../src/application/live/live.service'
import { LivePublicationService } from '../../src/application/live/live-publication.service'
import { LiveWorkspaceService } from '../../src/application/live/live-workspace.service'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLiveRepository } from '../../src/infrastructure/persistence/drizzle/live.repository'
import { DrizzleLiveBenefitsRepository } from '../../src/infrastructure/persistence/drizzle/live-benefits.repository'
import { purgeLiveAccount } from '../../src/infrastructure/persistence/drizzle/live-purge'
import { DrizzleLiveWorkspaceRepository } from '../../src/infrastructure/persistence/drizzle/live-workspace.repository'
import { accountDeletionFences } from '../../src/infrastructure/persistence/drizzle/schema'
import { InMemoryLiveCourses } from '../fakes/live-in-memory'
import { persistLiveCourse } from './live-course-rows'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_live_test')
if (!databaseUrl)
  console.warn('[tests/db] Postgres indisponível: oficinas não verificadas em banco real.')

describe.skipIf(!databaseUrl)('Oficinas no PostgreSQL real', () => {
  let connection: DbConnection
  beforeAll(async () => {
    connection = createDbConnection(databaseUrl as string)
    await connection.sql.begin(async (sql) => {
      await sql`select pg_advisory_xact_lock(1432014, 102)`
      const [existing] = await sql`select to_regclass('members.live_programs') as name`
      if (!existing?.name) {
        const migration = await Bun.file(
          new URL(
            '../../src/infrastructure/persistence/drizzle/migrations/0102_live_workshops.sql',
            import.meta.url,
          ),
        ).text()
        for (const statement of migration.split('--> statement-breakpoint'))
          if (statement.trim()) await sql.unsafe(statement)
      }
    })
  })
  afterAll(async () => {
    await connection?.close()
  })

  // The live course itself is read through the port; its SQL adapter has its own test file.
  const courses = new InMemoryLiveCourses((course, blocks) =>
    persistLiveCourse(connection, course, blocks),
  )
  async function setup(capacity = 1, courseStatus: 'draft' | 'published' = 'published') {
    const repository = new DrizzleLiveRepository(connection.db)
    const service = new LiveService(
      repository,
      () => new Date('2026-11-07T17:00:00Z'),
      { assertOwnership: async () => ({ name: 'Criador' }) },
      { mediaReady: true, courses },
    )
    const actor: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Professora',
      staff: true,
    }
    const { course, lessons } = courses.add({ lessons: 1, status: courseStatus })
    const block = courses.addStudioBlock(course.id, lessons[0]!.id)
    const { cohort, sessions } = await service.createCohort(actor, course.id, {
      title: 'Turma SQL',
      timeZone: 'America/Sao_Paulo',
      capacity,
      accessDays: 30,
      teacherIds: [actor.id],
      schedule: [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }],
    })
    await service.updateCohort({ ...actor, admin: true }, cohort.id, { status: 'open' })
    return {
      repository,
      service,
      actor,
      cohort,
      session: sessions[0]!,
      course,
      lesson: lessons[0]!,
      block,
    }
  }

  test('SQL filters owned cohorts before cursor pagination, excluding unrelated drafts', async () => {
    // The fourth cohort is open, but its live course is still a draft: not discovery.
    const records = await Promise.all([setup(), setup(), setup(), setup(1, 'draft')])
    const child = { id: randomUUID(), accountId: randomUUID(), name: 'Alice', staff: false }
    for (const item of records.slice(0, 3))
      await item.service.enroll(item.actor, item.cohort.id, {
        accountId: child.accountId,
        learnerId: child.id,
        learnerName: child.name,
      })
    let cursor: string | undefined
    const ids: string[] = []
    do {
      const page = await records[0]!.service.catalog(child, 'learner', { cursor, limit: 1 })
      expect(page.cohorts).toHaveLength(1)
      ids.push(page.cohorts[0]!.id)
      cursor = page.nextCursor ?? undefined
    } while (cursor)
    expect(new Set(ids)).toEqual(new Set(records.slice(0, 3).map((item) => item.cohort.id)))
    expect(ids).not.toContain(records[3]!.cohort.id)
  })

  test('lock no banco impede venda concorrente da última vaga e grava grants atomicamente', async () => {
    const { repository, service, actor, cohort } = await setup()
    const allocations = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        service.enroll(actor, cohort.id, {
          accountId: randomUUID(),
          learnerId: randomUUID(),
          learnerName: 'Teste',
        }),
      ),
    )
    expect(allocations.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const aggregate = (await repository.findCohort(cohort.id))!
    expect(aggregate.enrollments).toHaveLength(1)
    expect(aggregate.grants).toHaveLength(1)
    expect(aggregate.grants[0]?.endsAt).toBe('2026-12-07T17:00:00.000Z')
  })

  test('S1: um pool de UMA conexão basta; a escrita do projeto não espera a trava da turma', async () => {
    const { service, actor, cohort, session, block, lesson } = await setup(1)
    const child: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Alice',
      staff: false,
    }
    await service.enroll(actor, cohort.id, {
      accountId: child.accountId,
      learnerId: child.id,
      learnerName: child.name,
    })
    // Any write that opened a second pool connection while holding its locks would wait
    // forever here: the only connection is the one holding them.
    const single = createDbConnection(databaseUrl as string, { max: 1 })
    const bounded = <T>(work: Promise<T>) =>
      Promise.race([
        work,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('pool esgotado: segunda conexão')), 8000),
        ),
      ])
    try {
      const clock = () => new Date('2026-11-07T17:00:00Z')
      const live = new LiveService(
        new DrizzleLiveRepository(single.db),
        clock,
        { assertOwnership: async () => ({ name: 'Criador' }) },
        { mediaReady: true, courses },
      )
      const workspaces = new LiveWorkspaceService(
        new DrizzleLiveWorkspaceRepository(single.db),
        live,
        clock,
      )
      const deviceId = randomUUID()
      const saved = await bounded(
        (async () => {
          const opened = await workspaces.openForBlock(child, session.id, block.blockId)
          const claimed = await workspaces.claim(child, opened.id, deviceId, false)
          await workspaces.renew(child, opened.id, deviceId, claimed.writerEpoch)
          // Room commands that read the published lesson do it before taking the cohort lock.
          await live.control(actor, session.id, undefined, { kind: 'start' })
          await live.join(child, session.id, { deviceId, takeover: false })
          await live.control(actor, session.id, undefined, { kind: 'admit', learnerId: child.id })
          await live.control(actor, session.id, undefined, {
            kind: 'open-section',
            sectionId: lesson.sectionIds[1]!,
          })
          await live.heartbeat(child, session.id, deviceId, {
            stepId: null,
            saveState: 'saved',
            sectionId: lesson.sectionIds[1]!,
            completedSectionIds: [lesson.sectionIds[0]!],
          })
          return claimed
        })(),
      )
      // A room transaction holding the cohort row does not block the project save.
      await connection.sql.begin(async (sql) => {
        await sql`select id from members.live_cohorts where id = ${cohort.id} for update`
        const committed = await bounded(
          workspaces.commit(child, saved.id, {
            deviceId,
            writerEpoch: saved.writerEpoch,
            expectedRevision: 0,
            mutationId: randomUUID(),
            project: saved.project,
          }),
        )
        expect(committed.revision).toBe(1)
      })
    } finally {
      await single.close()
    }
  }, 20_000)

  test('vagas pendentes permitem onboarding; Mural é por perfil e expira na janela da oficina', async () => {
    const { service, actor, cohort } = await setup(2)
    const accountId = randomUUID(),
      learnerId = randomUUID()
    const first = await service.enroll(actor, cohort.id, {
      accountId,
      learnerId: null,
      learnerName: 'Vaga 1',
    })
    await service.enroll(actor, cohort.id, { accountId, learnerId: null, learnerName: 'Vaga 2' })
    const benefits = new DrizzleLiveBenefitsRepository(connection.db)
    expect(await benefits.maxProfiles(accountId, new Date('2026-11-01T00:00:00Z'))).toBe(2)
    await service.assignLearner(actor, first.id, learnerId)
    expect(await benefits.maxProfiles(accountId, new Date('2026-11-07T17:00:00Z'))).toBe(2)
    expect(await benefits.hasMural(accountId, learnerId, new Date('2026-11-07T16:59:59Z'))).toBe(
      false,
    )
    expect(await benefits.hasMural(accountId, learnerId, new Date('2026-11-07T17:00:00Z'))).toBe(
      true,
    )
    expect(await benefits.hasMural(accountId, randomUUID(), new Date('2026-11-07T17:00:00Z'))).toBe(
      false,
    )
    expect(await benefits.hasMural(randomUUID(), learnerId, new Date('2026-11-07T17:00:00Z'))).toBe(
      false,
    )
    expect(await benefits.hasMural(accountId, learnerId, new Date('2026-12-07T17:00:00Z'))).toBe(
      false,
    )
    await service.revoke(actor, first.id)
    expect(await benefits.hasMural(accountId, learnerId, new Date('2026-11-07T17:00:00Z'))).toBe(
      false,
    )
  })

  test('posição de replay persiste por perfil, aula e versão; nova instância recupera o dado', async () => {
    const { service, actor, cohort, session } = await setup(2)
    const child: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Alice',
      staff: false,
    }
    const sibling = { ...child, id: randomUUID() }
    for (const learner of [child, sibling])
      await service.enroll(actor, cohort.id, {
        accountId: learner.accountId,
        learnerId: learner.id,
        learnerName: learner.name,
      })
    const recording = await service.setRecordingState(session.occurrenceId, {
      state: 'review',
      storageKey: `live/recordings/${session.occurrenceId}/replay.webm`,
    })
    const published = await service.publishRecording(actor, session.id, recording.version, true)
    const version = published.occurrence!.recording.version
    await service.saveReplayPosition(child, session.id, version, 124.8)
    const reconnected = new DrizzleLiveRepository(connection.db)
    expect(await reconnected.readReplayPosition(session.id, child.id, version)).toBe(124)
    expect((await service.replayPosition(sibling, session.id, version)).positionSeconds).toBe(0)
    expect(await reconnected.readReplayPosition(session.id, child.id, version + 1)).toBe(0)
  })

  test('publicação usa a revisão canônica persistida e revalida família e revogação no PostgreSQL', async () => {
    const { service, actor, cohort, session, block } = await setup()
    const child: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Alice',
      staff: false,
    }
    const enrollment = await service.enroll(actor, cohort.id, {
      accountId: child.accountId,
      learnerId: child.id,
      learnerName: child.name,
    })
    const clock = () => new Date('2026-11-07T17:00:00Z')
    const workspaces = new LiveWorkspaceService(
      new DrizzleLiveWorkspaceRepository(connection.db),
      service,
      clock,
    )
    const opened = await workspaces.openForBlock(child, session.id, block.blockId),
      deviceId = randomUUID()
    let workspace = await workspaces.claim(child, opened.id, deviceId, false)
    workspace = await workspaces.commit(child, workspace.id, {
      deviceId,
      writerEpoch: workspace.writerEpoch,
      expectedRevision: 0,
      mutationId: randomUUID(),
      project: workspace.project,
    })
    const publication = new LivePublicationService(
      workspaces,
      'database-publication-test-secret',
      clock,
    )
    const prepared = await publication.prepare(child, workspace.id, 1, crypto.randomUUID())
    const proof = {
      userId: child.id,
      accountId: child.accountId,
      workspaceId: workspace.id,
      revision: 1,
      playId: prepared.playId,
      publicationToken: prepared.publicationToken,
    }
    expect((await publication.verify(proof)).eligible).toBe(true)
    expect(prepared.project.id).toBe(workspace.id)
    expect(
      await publication.verify({ ...proof, accountId: randomUUID() }).then(
        () => false,
        () => true,
      ),
    ).toBe(true)
    workspace = await workspaces.commit(child, workspace.id, {
      deviceId,
      writerEpoch: workspace.writerEpoch,
      expectedRevision: 1,
      mutationId: randomUUID(),
      project: { ...workspace.project, name: 'Revisão nova' },
    })
    expect(
      await publication.verify(proof).then(
        () => false,
        () => true,
      ),
    ).toBe(true)
    const latest = await publication.prepare(child, workspace.id, 2, crypto.randomUUID())
    await service.revoke(actor, enrollment.id)
    expect(
      await publication
        .verify({
          ...proof,
          revision: 2,
          playId: latest.playId,
          publicationToken: latest.publicationToken,
        })
        .then(
          () => false,
          () => true,
        ),
    ).toBe(true)
  })

  test('conflito de controle reverte a transação e reconnect recupera admissão durável', async () => {
    const { service, actor, cohort, session } = await setup()
    const child: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Criador',
      staff: false,
    }
    const deviceId = randomUUID()
    await service.enroll(actor, cohort.id, {
      accountId: child.accountId,
      learnerId: child.id,
      learnerName: child.name,
    })
    await service.control(actor, session.id, 1, { kind: 'start' })
    const joined = await service.join(child, session.id, { deviceId, takeover: false })
    await service.control(actor, session.id, joined.occurrence!.version, {
      kind: 'admit',
      learnerId: child.id,
    })
    const reconnect = await service.join(child, session.id, { deviceId, takeover: false })
    expect(reconnect.occurrence?.participants[0]?.admission).toBe('admitted')
    // Moderation does not depend on the version: two concurrent toggles both apply, in turn.
    const toggles = await Promise.allSettled([
      service.control(actor, session.id, reconnect.occurrence!.version, {
        kind: 'chat',
        enabled: false,
      }),
      service.control(actor, session.id, reconnect.occurrence!.version, {
        kind: 'chat',
        enabled: true,
      }),
    ])
    expect(toggles.filter((result) => result.status === 'fulfilled')).toHaveLength(2)
    const current = (await service.room(actor, session.id)).occurrence!.version
    expect(current).toBe(reconnect.occurrence!.version + 2)
    // A state transition still checks the version: the loser is rolled back.
    const results = await Promise.allSettled([
      service.control(actor, session.id, current, { kind: 'end' }),
      service.control(actor, session.id, current, { kind: 'end' }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect((await service.room(actor, session.id)).occurrence?.version).toBe(current + 1)
  })

  test('encontro agendado vencido entra na varredura em SQL e vira cancelado', async () => {
    const { repository, service, actor } = await setup()
    // A schedule older than any other fixture: the sweep is oldest-first and bounded to 100.
    const { course } = courses.add({ lessons: 1 })
    const {
      sessions: [session],
    } = await service.createCohort(actor, course.id, {
      title: 'Turma que não aconteceu',
      timeZone: 'America/Sao_Paulo',
      capacity: 1,
      accessDays: 30,
      teacherIds: [actor.id],
      schedule: [{ startsAt: '2001-01-01T17:00:00Z', endsAt: '2001-01-01T18:00:00Z' }],
    })
    if (!session) throw new Error('missing session')
    const after = new Date('2001-01-01T18:00:01Z')
    expect(await repository.overdueOccurrences(after)).toContain(session.occurrenceId)
    expect(await repository.overdueOccurrences(new Date('2001-01-01T17:59:59Z'))).not.toContain(
      session.occurrenceId,
    )
    expect(await repository.sessionRef(session.id)).toEqual({
      cohortId: session.cohortId,
      lessonId: course.lessons[0]!.id,
      occurrenceId: session.occurrenceId,
    })
    const later = new LiveService(
      repository,
      () => after,
      { assertOwnership: async () => ({ name: 'Criador' }) },
      { mediaReady: true, courses },
    )
    // The room view of the teacher triggers the same deadline path for this occurrence only.
    expect((await later.room(actor, session.id)).occurrence?.state).toBe('cancelled')
    expect(await repository.overdueOccurrences(after)).not.toContain(session.occurrenceId)
  })

  test('sala de UM encontro: leitura só dele, escrita só dele, presença na linha pequena', async () => {
    const repository = new DrizzleLiveRepository(connection.db)
    const service = new LiveService(
      repository,
      () => new Date('2026-11-07T17:00:00Z'),
      { assertOwnership: async () => ({ name: 'Criador' }) },
      { mediaReady: true, courses },
    )
    const actor: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Ana', staff: true }
    const child: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Bia',
      staff: false,
    }
    const { course } = courses.add({ lessons: 2 })
    const { cohort, sessions } = await service.createCohort(actor, course.id, {
      title: 'Turma de dois encontros',
      timeZone: 'America/Sao_Paulo',
      capacity: 2,
      accessDays: 30,
      teacherIds: [actor.id],
      schedule: [
        { startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' },
        { startsAt: '2026-11-14T17:00:00Z', endsAt: '2026-11-14T18:00:00Z' },
      ],
    })
    await service.updateCohort({ ...actor, admin: true }, cohort.id, { status: 'open' })
    await service.enroll(actor, cohort.id, {
      accountId: child.accountId,
      learnerId: child.id,
      learnerName: 'Bia',
    })
    const [first, second] = sessions as [(typeof sessions)[number], (typeof sessions)[number]]
    const room = (await repository.findRoom({ sessionId: first.id }))!
    expect(room.sessions.map((session) => session.id)).toEqual([first.id])
    expect(room.occurrences.map((occurrence) => occurrence.id)).toEqual([first.occurrenceId])
    expect(room.grants.map((grant) => grant.sessionId)).toEqual([first.id])
    expect(room.grants[0]?.endsAt).toBe('2026-12-07T17:00:00.000Z')
    expect(
      (await repository.findRoom({ occurrenceId: second.occurrenceId }))?.sessions[0]?.id,
    ).toBe(second.id)
    const xmin = async (id: string) =>
      (
        await connection.sql`select xmin::text as v from members.live_occurrences where id = ${id}`
      )[0]?.v as string
    const untouched = await xmin(second.occurrenceId)
    await service.control(actor, first.id, undefined, { kind: 'start' })
    const deviceId = randomUUID()
    await service.join(child, first.id, { deviceId, takeover: false })
    await service.control(actor, first.id, undefined, { kind: 'admit', learnerId: child.id })
    expect(await xmin(second.occurrenceId)).toBe(untouched)
    // Presence: the small row, overlaid on every read; the occurrence row stays as it was.
    const written = await xmin(first.occurrenceId)
    await repository.touchPresence({
      occurrenceId: first.occurrenceId,
      actorId: child.id,
      accountId: child.accountId,
      at: new Date('2026-11-07T17:00:30Z'),
      activity: true,
    })
    expect(await xmin(first.occurrenceId)).toBe(written)
    const seen = (await repository.findRoom({ sessionId: first.id }))!.occurrences[0]!
    expect(seen.participants[0]?.seenAt).toBe('2026-11-07T17:00:30.000Z')
    expect(
      (await repository.findCohort(cohort.id))!.occurrences.find((o) => o.id === first.occurrenceId)
        ?.participants[0]?.seenAt,
    ).toBe('2026-11-07T17:00:30.000Z')
    // An older presence never moves it back.
    await repository.touchPresence({
      occurrenceId: first.occurrenceId,
      actorId: child.id,
      accountId: child.accountId,
      at: new Date('2026-11-07T17:00:10Z'),
    })
    expect(
      (await repository.findRoom({ sessionId: first.id }))!.occurrences[0]!.participants[0]?.seenAt,
    ).toBe('2026-11-07T17:00:30.000Z')
    // Account erasure: no presence after the fence, and the purge removes it.
    await connection.db.transaction(async (tx) => {
      await tx
        .insert(accountDeletionFences)
        .values({ accountId: child.accountId, createdAt: new Date() })
      await purgeLiveAccount(tx, child.accountId, [child.id])
    })
    const refused = await repository
      .touchPresence({
        occurrenceId: first.occurrenceId,
        actorId: child.id,
        accountId: child.accountId,
        at: new Date('2026-11-07T17:01:00Z'),
      })
      .then(
        () => null,
        (error: Error) => error,
      )
    expect(refused?.message).toContain('exclusão')
    const [left] =
      await connection.sql`select count(*)::int as n from members.live_presence where actor_id = ${child.id}`
    expect(left?.n).toBe(0)
  })

  test('purga remove apenas a família alvo e a cerca impede matrícula tardia', async () => {
    const { service, actor, repository, cohort, session } = await setup(2)
    const child: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Criança alvo',
      staff: false,
    }
    const other: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Outra família',
      staff: false,
    }
    await service.enroll(actor, cohort.id, {
      accountId: child.accountId,
      learnerId: child.id,
      learnerName: child.name,
    })
    await service.enroll(actor, cohort.id, {
      accountId: other.accountId,
      learnerId: other.id,
      learnerName: other.name,
    })
    await service.control(actor, session.id, 1, { kind: 'start' })
    const deviceId = randomUUID()
    const joined = await service.join(child, session.id, { deviceId, takeover: false })
    await service.control(actor, session.id, joined.occurrence!.version, {
      kind: 'admit',
      learnerId: child.id,
    })
    await service.chat(child, session.id, deviceId, 'Mensagem da criança alvo')
    await connection.db.transaction(async (tx) => {
      await tx
        .insert(accountDeletionFences)
        .values({ accountId: child.accountId, createdAt: new Date() })
      await purgeLiveAccount(tx, child.accountId, [child.accountId, child.id])
    })
    const state = (await repository.findCohort(cohort.id))!
    expect(state.enrollments).toHaveLength(1)
    expect(state.enrollments[0]?.learnerId).toBe(other.id)
    expect(state.grants).toHaveLength(1)
    expect(state.occurrences[0]?.participants).toEqual([])
    expect(state.occurrences[0]?.messages).toEqual([])
    const result = await Promise.allSettled([
      service.enroll(actor, cohort.id, {
        accountId: child.accountId,
        learnerId: child.id,
        learnerName: child.name,
      }),
    ])
    expect(result[0]?.status).toBe('rejected')
  })
})
