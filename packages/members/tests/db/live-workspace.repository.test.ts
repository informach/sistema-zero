import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { LiveService } from '../../src/application/live/live.service'
import { LiveWorkspaceService } from '../../src/application/live/live-workspace.service'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLiveRepository } from '../../src/infrastructure/persistence/drizzle/live.repository'
import { DrizzleLiveWorkspaceRepository } from '../../src/infrastructure/persistence/drizzle/live-workspace.repository'
import { accountDeletionFences } from '../../src/infrastructure/persistence/drizzle/schema'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_live_workspace_test')
if (!databaseUrl)
  console.warn('[tests/db] Postgres indisponível: autoria ao vivo não verificada em banco real.')

describe.skipIf(!databaseUrl)('Autoria da oficina no PostgreSQL real', () => {
  let connection: DbConnection
  beforeAll(() => {
    connection = createDbConnection(databaseUrl as string)
  })
  afterAll(async () => {
    await connection?.close()
  })

  async function setup() {
    const clock = () => new Date('2026-11-07T17:00:00Z')
    const live = new LiveService(
      new DrizzleLiveRepository(connection.db),
      clock,
      { assertOwnership: async () => ({ name: 'Criador' }) },
      { mediaReady: true },
    )
    const teacher: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Professora',
      staff: true,
    }
    const child: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Alice',
      staff: false,
    }
    const program = await live.createProgram(teacher, {
      title: 'Oficina SQL',
      description: 'Ensaio isolado de persistência',
      lessons: [
        { title: 'Meu jogo', instructions: 'Criar', starterProjectId: null, materials: [] },
      ],
    })
    const { cohort, sessions } = await live.createCohort(teacher, program.id, {
      title: 'Turma SQL',
      capacity: 2,
      accessDays: 30,
      timeZone: 'America/Sao_Paulo',
      teacherIds: [teacher.id],
      schedule: [{ startsAt: clock().toISOString(), endsAt: '2026-11-07T18:00:00Z' }],
    })
    await live.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
    await live.enroll(teacher, cohort.id, {
      accountId: child.accountId,
      learnerId: child.id,
      learnerName: child.name,
    })
    const session = sessions[0]!
    const repository = new DrizzleLiveWorkspaceRepository(connection.db)
    const service = new LiveWorkspaceService(repository, live, clock)
    return { live, service, repository, teacher, child, session, deviceId: randomUUID() }
  }

  test('criação concorrente mantém um projeto e dois autores não gravam a mesma revisão', async () => {
    const { service, repository, child, session } = await setup()
    const opened = await Promise.all([
      service.open(child, session.id, child.id),
      service.open(child, session.id, child.id),
    ])
    expect(opened[0]!.id).toBe(opened[1]!.id)
    const id = opened[0]!.id
    const devices = [randomUUID(), randomUUID()]
    const claims = await Promise.allSettled(
      devices.map((device) => service.claim(child, id, device, false)),
    )
    expect(claims.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const workspace = (await repository.find(id))!
    const commands = ['Primeira edição', 'Edição concorrente'].map((name) => ({
      deviceId: workspace.writerDeviceId!,
      writerEpoch: workspace.writerEpoch,
      expectedRevision: 0,
      mutationId: randomUUID(),
      project: { ...workspace.project, name },
    }))
    const commits = await Promise.allSettled(
      commands.map((command) => service.commit(child, id, command)),
    )
    expect(commits.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const saved = (await repository.find(id))!
    expect(saved.revision).toBe(1)
    const retry = commands.find((command) => command.project.name === saved.project.name)!
    expect((await service.commit(child, id, retry)).revision).toBe(1)
    const taken = await service.claim(child, id, randomUUID(), true)
    expect(taken.writerEpoch).toBeGreaterThan(saved.writerEpoch)
    const staleError = await service.commit(child, id, retry).then(
      () => null,
      (error) => error,
    )
    expect(staleError).toBeInstanceOf(Error)
    expect(staleError.message).toContain('autoria mudou')
    expect(await repository.listOwned(child.accountId, child.id)).toHaveLength(1)
    expect(await repository.listOwned(randomUUID(), child.id)).toEqual([])
  })

  test('an unrelated cohort can save while another workspace transaction is open', async () => {
    const a = await setup(),
      b = await setup()
    const first = await a.service.open(a.child, a.session.id, a.child.id)
    const second = await b.service.open(b.child, b.session.id, b.child.id)
    let release = () => {},
      entered = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const locked = new Promise<void>((resolve) => {
      entered = resolve
    })
    const held = a.repository.transaction(first.id, async () => {
      entered()
      await gate
    })
    await locked
    const independent = b.repository.transaction(second.id, async () => true)
    try {
      expect(await Promise.race([independent, Bun.sleep(750).then(() => false)])).toBe(true)
    } finally {
      release()
      await Promise.all([held, independent])
    }
  })

  test('teacher lock prevents simultaneous assistance across independent cohorts', async () => {
    const a = await setup(),
      b = await setup()
    const first = await a.service.open(a.child, a.session.id, a.child.id)
    const second = await b.service.open(b.child, b.session.id, b.child.id)
    const teacherId = randomUUID()
    const now = new Date('2026-11-07T17:00:00Z')
    const results = await Promise.all(
      [first, second].map((item) =>
        a.repository.transaction(item.id, async (tx) => {
          if (await tx.teacherHasActiveWorkspace(teacherId, now)) return false
          await Bun.sleep(40)
          tx.workspace.writerId = teacherId
          tx.workspace.leaseExpiresAt = new Date(now.getTime() + 30_000).toISOString()
          tx.workspace.assistance = {
            id: randomUUID(),
            teacherId,
            teacherName: 'Ana',
            status: 'active',
            checkpointRevision: 0,
            requestedAt: now.toISOString(),
          }
          return true
        }),
      ),
    )
    expect(results.filter(Boolean)).toHaveLength(1)
  })

  test('a later lesson reuses the expired project and binds assistance to the current recording', async () => {
    const repository = new DrizzleLiveRepository(connection.db)
    let now = new Date('2026-11-07T17:00:00Z')
    const live = new LiveService(
      repository,
      () => now,
      { assertOwnership: async () => ({ name: 'Alice' }) },
      { mediaReady: true },
    )
    const teacher: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Ana',
      staff: true,
    }
    const child: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Alice',
      staff: false,
    }
    const deviceId = randomUUID()
    const program = await live.createProgram(teacher, {
      title: 'Continuar',
      description: 'Dois encontros',
      lessons: [
        { title: 'Primeiro', instructions: 'Criar', starterProjectId: null, materials: [] },
        {
          title: 'Segundo',
          instructions: 'Continuar',
          starterProjectId: null,
          continueProjectFrom: 0,
          materials: [],
        },
      ],
    })
    const { cohort, sessions } = await live.createCohort(teacher, program.id, {
      title: 'Turma',
      capacity: 2,
      accessDays: 1,
      teacherIds: [teacher.id],
      timeZone: 'America/Sao_Paulo',
      schedule: [
        { startsAt: now.toISOString(), endsAt: '2026-11-07T18:00:00Z' },
        { startsAt: '2026-11-14T17:00:00Z', endsAt: '2026-11-14T18:00:00Z' },
      ],
    })
    await live.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
    await live.enroll(teacher, cohort.id, {
      accountId: child.accountId,
      learnerId: child.id,
      learnerName: child.name,
    })
    const paused: string[] = []
    const service = new LiveWorkspaceService(
      new DrizzleLiveWorkspaceRepository(connection.db),
      live,
      () => now,
      {
        confirmPaused: async (id) => {
          paused.push(id)
        },
      },
    )
    const first = await service.open(child, sessions[0]!.id, child.id)
    let work = await service.claim(child, first.id, deviceId, false)
    work = await service.commit(child, work.id, {
      deviceId,
      writerEpoch: work.writerEpoch,
      expectedRevision: work.revision,
      mutationId: randomUUID(),
      project: { ...work.project, name: 'Cenário pronto' },
    })
    now = new Date('2026-11-14T17:00:00Z')
    const second = sessions[1]!
    let room = await live.control(teacher, second.id, 1, { kind: 'start' })
    room = await live.join(child, second.id, { deviceId, takeover: false })
    await live.control(teacher, second.id, room.occurrence!.version, {
      kind: 'admit',
      learnerId: child.id,
    })
    const current = service.forSession(second.id)
    const opened = await current.open(child, second.id, child.id)
    expect(opened.id).toBe(first.id)
    expect(opened.project.name).toBe('Cenário pronto')
    work = await current.claim(child, opened.id, deviceId, false)
    work = await current.requestAssistance(teacher, work.id)
    expect(work.assistance!.sessionId).toBe(second.id)
    await current.acceptAssistance(child, work.id, work.assistance!.id, {
      deviceId,
      writerEpoch: work.writerEpoch,
      expectedRevision: work.revision,
      mutationId: randomUUID(),
      project: work.project,
    })
    expect(paused).toEqual([second.occurrenceId])
    expect((await live.room(child, sessions[0]!.id)).access.canOpen).toBe(false)
    expect((await service.listOwned(child)).workspaces).toHaveLength(1)
  })

  test('checkpoint anterior à ajuda sobrevive à retenção e exclusão bloqueia novos commits', async () => {
    const { live, service, repository, teacher, child, session, deviceId } = await setup()
    let room = await live.control(teacher, session.id, 1, { kind: 'start' })
    await live.join(teacher, session.id, { deviceId: randomUUID(), takeover: false })
    room = await live.join(child, session.id, { deviceId, takeover: false })
    await live.control(teacher, session.id, room.occurrence!.version, {
      kind: 'admit',
      learnerId: child.id,
    })
    let workspace = await service.open(child, session.id, child.id)
    workspace = await service.claim(child, workspace.id, deviceId, false)
    workspace = await service.requestAssistance(teacher, workspace.id)
    workspace = await service.acceptAssistance(child, workspace.id, workspace.assistance!.id, {
      deviceId,
      writerEpoch: workspace.writerEpoch,
      expectedRevision: workspace.revision,
      mutationId: randomUUID(),
      project: workspace.project,
    })
    const checkpoint = workspace.revision
    const teacherDevice = randomUUID()
    workspace = await service.attachTeacher(teacher, workspace.id, teacherDevice)
    for (let index = 0; index < 23; index++)
      workspace = await service.commit(teacher, workspace.id, {
        deviceId: teacherDevice,
        writerEpoch: workspace.writerEpoch,
        expectedRevision: workspace.revision,
        mutationId: randomUUID(),
        project: { ...workspace.project, name: `Ajuda ${index}` },
      })
    const rows =
      await connection.sql`select revision from members.live_workspace_revisions where workspace_id = ${workspace.id}`
    expect(rows.some((row) => row.revision === checkpoint)).toBe(true)
    expect(rows.length).toBe(21)
    await connection.db
      .insert(accountDeletionFences)
      .values({ accountId: child.accountId, createdAt: new Date() })
    const deletionError = await service
      .commit(teacher, workspace.id, {
        deviceId: teacherDevice,
        writerEpoch: workspace.writerEpoch,
        expectedRevision: workspace.revision,
        mutationId: randomUUID(),
        project: workspace.project,
      })
      .then(
        () => null,
        (error) => error,
      )
    expect(deletionError).toBeInstanceOf(Error)
    expect(deletionError.message).toContain('exclusão')
    expect((await repository.find(workspace.id))?.revision).toBe(workspace.revision)
  }, 15_000)
})
