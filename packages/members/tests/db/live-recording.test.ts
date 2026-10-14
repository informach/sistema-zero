import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { LiveService } from '../../src/application/live/live.service'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import { OwnRecordingProvider } from '../../src/infrastructure/live/own-recording.provider'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLiveRepository } from '../../src/infrastructure/persistence/drizzle/live.repository'
import {
  liveRecordingJobs,
  liveWorkspaces,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_live_test')
if (!databaseUrl)
  console.warn(
    '[tests/db] Postgres indisponível: coordenação do gravador não verificada em banco real.',
  )
const token = 'private-recorder-test-token-at-least-32-characters'

describe.skipIf(!databaseUrl)('Coordenação do gravador no PostgreSQL', () => {
  let connection: DbConnection
  beforeAll(() => {
    connection = createDbConnection(databaseUrl!)
  })
  afterAll(async () => {
    await connection?.close()
  })

  async function setup() {
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
      title: 'Gravador teste',
      description: 'Banco de teste',
      lessons: [{ title: 'Projeto', instructions: 'Criar', starterProjectId: null, materials: [] }],
    })
    const { cohort, sessions } = await service.createCohort(actor, program.id, {
      title: 'Turma teste',
      timeZone: 'America/Sao_Paulo',
      capacity: 2,
      accessDays: 30,
      teacherIds: [actor.id],
      schedule: [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }],
    })
    await repository.transaction(cohort.id, (aggregate) => {
      aggregate.occurrences[0]!.state = 'live'
    })
    return { repository, service, actor, cohort, session: sessions[0]! }
  }

  test('uma intenção recording antiga é convertida para paused sob o lock de comando quando há assistência', async () => {
    const f = await setup(),
      learnerId = randomUUID()
    await connection.db.insert(liveRecordingJobs).values({
      occurrenceId: f.session.occurrenceId,
      jobId: randomUUID(),
      generation: 1,
      desiredState: 'recording',
      leaseEndsAt: new Date(Date.now() + 20_000),
    })
    await connection.db.insert(liveWorkspaces).values({
      id: randomUUID(),
      sessionId: f.session.id,
      learnerId,
      accountId: randomUUID(),
      writerId: learnerId,
      project: {},
      updatedAt: new Date(),
      assistance: {
        id: randomUUID(),
        teacherId: f.actor.id,
        teacherName: f.actor.name,
        status: 'requested',
        requestedAt: new Date().toISOString(),
        checkpointRevision: null,
      },
    })
    const commands: { desiredState: string; commandVersion: number }[] = []
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      async fetch(request) {
        expect(request.headers.get('authorization')).toBe(`Bearer ${token}`)
        const command = (await request.json()) as {
          jobId: string
          generation: number
          commandVersion: number
          desiredState: string
        }
        commands.push(command)
        return Response.json({ ...command, state: 'paused', captureStopped: true })
      },
    })
    try {
      const provider = new OwnRecordingProvider(connection.db, f.repository, f.service, {
        url: `http://127.0.0.1:${server.port}`,
        token,
      })
      await provider.syncOccurrence(f.session.occurrenceId)
      // Simulates another resume intent that began before the pending assistance was visible.
      await connection.db
        .update(liveRecordingJobs)
        .set({ desiredState: 'recording' })
        .where(eq(liveRecordingJobs.occurrenceId, f.session.occurrenceId))
      await provider.syncOccurrence(f.session.occurrenceId)
      expect(
        commands.map(({ desiredState, commandVersion }) => [desiredState, commandVersion]),
      ).toEqual([
        ['paused', 1],
        ['paused', 2],
      ])
    } finally {
      await server.stop(true)
    }
  })

  test('ajuda após replay publicado exige prova privada exata e preserva estado e arquivo', async () => {
    const f = await setup(),
      jobId = randomUUID(),
      generation = 1
    const replayKey = `live/recordings/${f.session.occurrenceId}/${jobId}/${generation}/replay.mp4`
    await connection.db.insert(liveRecordingJobs).values({
      occurrenceId: f.session.occurrenceId,
      jobId,
      generation,
      desiredState: 'stopped',
      confirmedState: 'review',
      replayKey,
      leaseEndsAt: new Date(),
    })
    const review = await f.service.setRecordingState(f.session.occurrenceId, {
      state: 'review',
      storageKey: replayKey,
    })
    await f.service.publishRecording(f.actor, f.session.id, review.version, true)
    let proof = { jobId, generation: 2, state: 'review', captureStopped: true, replayKey }
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch(request) {
        expect(request.method).toBe('GET')
        expect(request.headers.get('authorization')).toBe(`Bearer ${token}`)
        return Response.json(proof)
      },
    })
    try {
      const provider = new OwnRecordingProvider(connection.db, f.repository, f.service, {
        url: `http://127.0.0.1:${server.port}`,
        token,
      })
      const denied = async () => {
        let failure: unknown
        try {
          await provider.confirmPaused(f.session.occurrenceId)
        } catch (error) {
          failure = error
        }
        expect(failure).toMatchObject({ code: 'RECORDING_PAUSE_UNCONFIRMED' })
      }
      await denied()
      proof = { ...proof, generation, captureStopped: false }
      await denied()
      proof = { ...proof, captureStopped: true, replayKey: 'different-file' }
      await denied()
      proof = { ...proof, replayKey }
      await provider.confirmPaused(f.session.occurrenceId)
      const aggregate = await f.repository.findCohort(f.cohort.id)
      expect(aggregate?.occurrences[0]?.recording).toMatchObject({
        state: 'ready',
        published: true,
        storageKey: replayKey,
      })
    } finally {
      await server.stop(true)
    }
  })
})
