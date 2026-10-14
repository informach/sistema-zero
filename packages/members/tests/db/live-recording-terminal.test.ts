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
  liveMediaConnections,
  liveRecordingJobs,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { InMemoryLiveCourses } from '../fakes/live-in-memory'
import { persistLiveCourse } from './live-course-rows'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_live_test')
if (!databaseUrl)
  console.warn('[tests/db] Postgres indisponível: estados finais da gravação não verificados.')
const token = 'private-recorder-test-token-at-least-32-characters'

/**
 * `expect(promise).rejects` can hang with the postgres driver in tests/db (see CLAUDE.md):
 * capture the failure with try/catch instead.
 */
async function failure(work: Promise<unknown>): Promise<unknown> {
  try {
    await work
  } catch (error) {
    return error
  }
  return null
}

/** A fake private recorder: POST answers `post()`, GET answers `get()`. */
function recorder(handlers: {
  post?: (body: Record<string, unknown>) => Response
  get?: () => Response
}) {
  const commands: Record<string, unknown>[] = []
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(request) {
      if (request.method === 'GET')
        return handlers.get?.() ?? Response.json({ absent: true, captureStopped: true })
      const body = (await request.json()) as Record<string, unknown>
      commands.push(body)
      return handlers.post?.(body) ?? new Response('down', { status: 503 })
    },
  })
  return { url: `http://127.0.0.1:${server.port}`, commands, stop: () => server.stop(true) }
}

describe.skipIf(!databaseUrl)('Gravação com estados finais no PostgreSQL', () => {
  let connection: DbConnection
  /** The live course is read through the port; its SQL adapter has its own test. */
  const liveCourses = new InMemoryLiveCourses((course) => persistLiveCourse(connection, course))
  beforeAll(() => {
    connection = createDbConnection(databaseUrl!)
  })
  afterAll(async () => {
    await connection?.close()
  })

  async function setup(state: 'live' | 'ended' = 'live', conducted = true) {
    const repository = new DrizzleLiveRepository(connection.db)
    const service = new LiveService(
      repository,
      () => new Date('2026-11-07T17:00:00Z'),
      { assertOwnership: async () => ({ name: 'Criador' }) },
      { mediaReady: true, courses: liveCourses },
    )
    const ana: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Ana', staff: true }
    const bruna: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Bruna',
      staff: true,
    }
    const { course } = liveCourses.add({ lessons: 1 })
    const { cohort, sessions } = await service.createCohort(ana, course.id, {
      title: 'Turma',
      timeZone: 'America/Sao_Paulo',
      capacity: 2,
      accessDays: 30,
      teacherIds: [ana.id, bruna.id],
      schedule: [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }],
    })
    await repository.transaction(cohort.id, (aggregate) => {
      const occurrence = aggregate.occurrences[0]!
      occurrence.state = state
      occurrence.conductorId = conducted ? bruna.id : null
      occurrence.teachers = { [bruna.id]: '2026-11-07T17:00:00.000Z' }
      if (state === 'live') occurrence.recording.state = 'recording'
    })
    const session = sessions[0]!
    const job = () =>
      connection.db
        .select()
        .from(liveRecordingJobs)
        .where(eq(liveRecordingJobs.occurrenceId, session.occurrenceId))
        .then((rows) => rows[0])
    const shown = async () =>
      (await repository.findCohort(cohort.id))!.occurrences[0]!.recording.state
    return { repository, service, ana, bruna, cohort, session, job, shown }
  }
  const provider = (f: Awaited<ReturnType<typeof setup>>, url: string, now = Date.now) =>
    new OwnRecordingProvider(connection.db, f.repository, f.service, { url, token }, now)

  test('encontro que nunca foi ao vivo não cria trabalho de gravação', async () => {
    const f = await setup('ended', false)
    const fake = recorder({})
    try {
      await provider(f, fake.url).syncOccurrence(f.session.occurrenceId)
      expect(await f.job()).toBeUndefined()
      expect(fake.commands).toEqual([])
    } finally {
      await fake.stop()
    }
  })

  test('encerrado sem nenhum trecho vira "empty" e sai do laço', async () => {
    const f = await setup('ended')
    const fake = recorder({ get: () => Response.json({ absent: true, captureStopped: true }) })
    try {
      const recording = provider(f, fake.url)
      expect(await failure(recording.syncOccurrence(f.session.occurrenceId))).toBeInstanceOf(Error)
      expect(await f.job()).toMatchObject({ confirmedState: 'empty' })
      expect((await f.job())?.finishedAt).toBeInstanceOf(Date)
      expect(await f.shown()).toBe('empty')
      const sent = fake.commands.length
      expect(await recording.dueOccurrences(f.session.occurrenceId)).not.toContain(
        f.session.occurrenceId,
      )
      await recording.syncOccurrence(f.session.occurrenceId)
      expect(fake.commands.length).toBe(sent)
    } finally {
      await fake.stop()
    }
  })

  test('falha repetida depois do fim espera cada vez mais e termina em "failed"', async () => {
    const f = await setup('ended')
    let now = Date.now()
    const fake = recorder({
      get: () => Response.json({ state: 'processing', segments: [{}], captureStopped: false }),
    })
    try {
      const recording = provider(f, fake.url, () => now)
      const delays: number[] = []
      for (let attempt = 1; attempt <= 8; attempt++) {
        await failure(recording.syncOccurrence(f.session.occurrenceId))
        const job = await f.job()
        if (job?.finishedAt) break
        expect(job?.attempts).toBe(attempt)
        delays.push(job!.nextAttemptAt!.getTime() - now)
        // Not due yet: the cycle skips it until the backoff elapses.
        expect(await recording.dueOccurrences(f.session.occurrenceId)).not.toContain(
          f.session.occurrenceId,
        )
        now = job!.nextAttemptAt!.getTime()
        expect(await recording.dueOccurrences(f.session.occurrenceId)).toContain(
          f.session.occurrenceId,
        )
      }
      expect(delays[1]!).toBeGreaterThan(delays[0]!)
      expect(await f.job()).toMatchObject({ confirmedState: 'failed' })
      expect(await f.shown()).toBe('failed')
    } finally {
      await fake.stop()
    }
  })

  test('gravador calado ao vivo aparece como indisponível e não segura a ajuda', async () => {
    const f = await setup('live')
    let now = Date.now()
    const fake = recorder({})
    try {
      const recording = provider(f, fake.url, () => now)
      for (let attempt = 0; attempt < 6; attempt++) {
        await failure(recording.syncOccurrence(f.session.occurrenceId))
        now += 5_000
      }
      expect(await f.shown()).toBe('unavailable')
      // The newest `recording` lease is still running: no proof yet.
      await connection.db
        .update(liveRecordingJobs)
        .set({ recordingLeaseEndsAt: new Date(now + 10_000) })
        .where(eq(liveRecordingJobs.occurrenceId, f.session.occurrenceId))
      expect(await failure(recording.confirmPaused(f.session.occurrenceId))).toMatchObject({
        code: 'RECORDING_UNCONFIRMED',
      })
      expect((await f.job())?.desiredState).toBe('paused')
      // Once that lease ended (plus the margin), the recorder paused itself by contract.
      now += 30_000
      await recording.confirmPaused(f.session.occurrenceId)
    } finally {
      await fake.stop()
    }
  })

  test('sem trabalho de gravação a ajuda é liberada e nada passa a gravar', async () => {
    const f = await setup('live')
    const fake = recorder({})
    try {
      await provider(f, fake.url).confirmPaused(f.session.occurrenceId)
      expect(await f.job()).toMatchObject({ desiredState: 'paused', commandVersion: 0 })
      expect(fake.commands).toEqual([])
    } finally {
      await fake.stop()
    }
  })

  test('a gravação segue a professora que começou o encontro, não a primeira da lista', async () => {
    const f = await setup('live')
    const fake = recorder({
      post: (body) => Response.json({ ...body, state: 'recording', captureStopped: false }),
    })
    const connectionFor = (actor: LiveActor, sessionId: string) => ({
      id: randomUUID(),
      occurrenceId: f.session.occurrenceId,
      actor,
      deviceId: randomUUID(),
      generation: 1,
      role: 'teacher' as const,
      sessionId,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      leaseEndsAt: new Date(Date.now() + 600_000).toISOString(),
      hardEndsAt: '2026-11-07T18:00:00.000Z',
      resources: [
        {
          mid: '0',
          direction: 'local' as const,
          publication: {
            id: randomUUID(),
            actorId: actor.id,
            role: 'teacher' as const,
            kind: 'microphone' as const,
            simulcast: false,
          },
          publisherSessionId: sessionId,
          trackName: `${actor.name}-mic`,
          state: 'active' as const,
          muteEpoch: 0,
        },
      ],
      pending: null,
      cleanupPending: false,
      uncertain: false,
    })
    try {
      for (const [actor, sessionId] of [
        [f.ana, 'sfu-ana'],
        [f.bruna, 'sfu-bruna'],
      ] as const) {
        const state = connectionFor(actor, sessionId)
        await connection.db.insert(liveMediaConnections).values({
          id: state.id,
          occurrenceId: state.occurrenceId,
          actorId: actor.id,
          participationId: `${state.occurrenceId}:${actor.id}`,
          deviceId: state.deviceId,
          generation: 1,
          state: state as unknown as Record<string, unknown>,
        })
      }
      await provider(f, fake.url).syncOccurrence(f.session.occurrenceId)
      expect(fake.commands.at(-1)?.sources).toEqual([
        { role: 'teacher', kind: 'microphone', sessionId: 'sfu-bruna', trackName: 'Bruna-mic' },
      ])
      expect((await f.job())?.recordingLeaseEndsAt).toBeInstanceOf(Date)
      expect((await f.job())?.confirmedAt).toBeInstanceOf(Date)
    } finally {
      await fake.stop()
    }
  })
})
