import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { LiveLearningStep } from '@sistemazero/core/live'
import { LiveService } from '../../src/application/live/live.service'
import { LiveLearningService } from '../../src/application/live/live-learning.service'
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

  async function setup(capacity = 1, steps?: LiveLearningStep[]) {
    const repository = new DrizzleLiveRepository(connection.db)
    const service = new LiveService(
      repository,
      () => new Date('2026-11-07T17:00:00Z'),
      { assertOwnership: async () => ({ name: 'Criador' }) },
      { mediaReady: true },
    )
    const actor: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Professora',
      staff: true,
    }
    const program = await service.createProgram(actor, {
      title: 'Oficina teste',
      description: 'Somente neste banco de teste',
      lessons: [
        {
          title: 'Cenário',
          instructions: 'Criar o cenário',
          starterProjectId: null,
          materials: [],
          steps,
        },
      ],
    })
    const { cohort, sessions } = await service.createCohort(actor, program.id, {
      title: 'Turma SQL',
      timeZone: 'America/Sao_Paulo',
      capacity,
      accessDays: 30,
      teacherIds: [actor.id],
      schedule: [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }],
    })
    await service.updateCohort(actor, cohort.id, 'open')
    return { repository, service, actor, cohort, session: sessions[0]! }
  }

  test('SQL filters owned cohorts before cursor pagination, excluding unrelated drafts', async () => {
    const records = await Promise.all([setup(), setup(), setup(), setup()])
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

  test('atividade persiste fora de cursos, serializa tentativa duplicada e purga as respostas', async () => {
    const block = {
      id: randomUUID(),
      revision: randomUUID(),
      content: {
        kind: 'interactive' as const,
        title: 'Minha descoberta',
        instructions: 'Experimente',
        required: false,
        hints: [],
        activity: { type: 'html' as const, html: '<p>Experimente!</p>' },
      },
    }
    const { service, actor, cohort, session, repository } = await setup(1, [
      { id: randomUUID(), title: 'Etapa', instructions: 'Crie algo', blocks: [block] },
    ])
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
    const learning = new LiveLearningService(
      service,
      repository,
      () => new Date('2026-11-07T17:00:00Z'),
    )
    const input = {
      id: randomUUID(),
      revision: block.revision,
      answers: { participated: true },
      hintsUsed: 0,
    }
    const duplicate = await Promise.all([
      learning.attempt(child, session.id, block.id, input),
      learning.attempt(child, session.id, block.id, input),
    ])
    expect(duplicate.map((result) => result.progress.attemptsCount)).toEqual([1, 1])
    const restored = new LiveLearningService(
      service,
      new DrizzleLiveRepository(connection.db),
      () => new Date('2026-11-07T17:00:00Z'),
    )
    expect((await restored.read(child, session.id)).blocks[0]).toMatchObject({
      attemptsCount: 1,
      result: { passed: true, verifiedBy: 'client' },
    })
    await connection.db.transaction(async (tx) => {
      await tx
        .insert(accountDeletionFences)
        .values({ accountId: child.accountId, createdAt: new Date() })
      await purgeLiveAccount(tx, child.accountId, [child.id])
    })
    expect(await repository.readLearningProgress(session.id, child.id, child.accountId)).toEqual([])
    expect(
      await repository.findLearningAttempt(session.id, child.id, child.accountId, input.id),
    ).toBeNull()
  })

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
    const { service, actor, cohort, session } = await setup()
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
    const opened = await workspaces.open(child, session.id, child.id),
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
    const results = await Promise.allSettled([
      service.control(actor, session.id, reconnect.occurrence!.version, {
        kind: 'chat',
        enabled: false,
      }),
      service.control(actor, session.id, reconnect.occurrence!.version, {
        kind: 'chat',
        enabled: true,
      }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect((await service.room(actor, session.id)).occurrence?.version).toBe(
      reconnect.occurrence!.version + 1,
    )
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
