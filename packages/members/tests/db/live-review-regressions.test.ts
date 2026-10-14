/** Acceptance regressions converted from the 2026-10-14 review reproductions. */
import { afterAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { LiveService } from '../../src/application/live/live.service'
import { LiveWorkspaceService } from '../../src/application/live/live-workspace.service'
import type { LiveRepository } from '../../src/domain/ports/live-repository.port'
import { OwnRecordingProvider } from '../../src/infrastructure/live/own-recording.provider'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLiveRepository } from '../../src/infrastructure/persistence/drizzle/live.repository'
import { DrizzleLiveWorkspaceRepository } from '../../src/infrastructure/persistence/drizzle/live-workspace.repository'
import { liveRecordingJobs } from '../../src/infrastructure/persistence/drizzle/schema'
import { InMemoryLiveCourses, InMemoryLiveRepository } from '../fakes/live-in-memory'
import { prepareTestDatabase } from './test-database'

/** The live course is read through the port; its SQL adapter has its own test. */
const liveCourses = new InMemoryLiveCourses()

const databaseUrl = await prepareTestDatabase('sistemazero_live_corrections_test')
const connection = databaseUrl ? createDbConnection(databaseUrl) : null
afterAll(async () => {
  await connection?.close()
})

async function fixture(repository: LiveRepository = new InMemoryLiveRepository()) {
  const startsAt = new Date(Date.now() - 60_000).toISOString()
  const endsAt = new Date(Date.now() + 60_000).toISOString()
  let now = new Date()
  const teacher = { id: randomUUID(), accountId: randomUUID(), name: 'Professora', staff: true }
  const child = { id: randomUUID(), accountId: randomUUID(), name: 'Criança', staff: false }
  const live = new LiveService(
    repository,
    () => now,
    { assertOwnership: async () => ({ name: child.name }) },
    { mediaReady: true, courses: liveCourses },
  )
  const { course, lessons } = liveCourses.add({ lessons: 1 })
  const block = liveCourses.addStudioBlock(course.id, lessons[0]!.id)
  const {
    cohort,
    sessions: [session],
  } = await live.createCohort(teacher, course.id, {
    title: 'Review',
    timeZone: 'America/Sao_Paulo',
    capacity: 8,
    accessDays: 30,
    teacherIds: [teacher.id],
    schedule: [{ startsAt, endsAt }],
  })
  await live.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
  await live.enroll(teacher, cohort.id, {
    accountId: child.accountId,
    learnerId: child.id,
    learnerName: child.name,
  })
  await live.control(teacher, session!.id, 1, { kind: 'start' })
  return {
    repository,
    live,
    teacher,
    child,
    cohort,
    session: session!,
    block,
    setTime: (date: string) => {
      now = new Date(date)
    },
  }
}

describe('Regression: lifecycle and replacement', () => {
  test('hard end denies media and durably ends the occurrence', async () => {
    const f = await fixture()
    f.setTime(new Date(Date.parse(f.session.endsAt) + 1000).toISOString())
    const room = await f.live.room(f.teacher, f.session.id)
    expect(room.occurrence!.state).toBe('ended')
    expect(room.access.canJoinMedia).toBe(false)
    await expect(
      f.live.authorizeMedia(f.teacher, f.session.occurrenceId, randomUUID()),
    ).rejects.toThrow()
  })

  test('replacement agenda shows the new call date without resetting lesson access', async () => {
    const f = await fixture()
    await f.live.control(f.teacher, f.session.id, 2, { kind: 'end' })
    const startsAt = new Date(Date.now() + 86_400_000).toISOString()
    const replacement = await f.live.replaceOccurrence(f.teacher, f.session.id, {
      expectedVersion: 3,
      startsAt,
      endsAt: new Date(Date.now() + 90_000_000).toISOString(),
    })
    const catalog = await f.live.catalog(f.child)
    expect(catalog.sessions[0]!.occurrenceId).toBe(replacement.id)
    expect(catalog.sessions[0]!.startsAt).toBe(f.session.startsAt)
    expect(catalog.sessions[0]!.occurrenceStartsAt).toBe(replacement.startsAt)
  })

  test('teacher can withdraw a historical replay after scheduling a replacement', async () => {
    const f = await fixture()
    const reviewed = await f.live.setRecordingState(f.session.occurrenceId, {
      state: 'review',
      storageKey: `live/recordings/${f.session.occurrenceId}/review.mp4`,
    })
    await f.live.publishRecording(f.teacher, f.session.id, reviewed.version, true)
    await f.live.control(f.teacher, f.session.id, 2, { kind: 'end' })
    await f.live.replaceOccurrence(f.teacher, f.session.id, {
      expectedVersion: 3,
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
      endsAt: new Date(Date.now() + 90_000_000).toISOString(),
    })
    const current = await f.live.room(f.teacher, f.session.id)
    expect(current.occurrence!.recording.state).toBe('not_started')
    const old = current.recordings!.find((item) => item.occurrenceId === f.session.occurrenceId)!
    await f.live.publishRecording(
      f.teacher,
      f.session.id,
      old.recording.version,
      false,
      old.occurrenceId,
    )
    await expect(f.live.recording(f.child, f.session.id, old.occurrenceId)).rejects.toThrow()
  })
})

describe.skipIf(!connection)('Regression: recorder reconciliation on local PostgreSQL', () => {
  test('the teacher can cancel unanswered help and resume the recording', async () => {
    const f = await fixture(new DrizzleLiveRepository(connection!.db))
    const deviceId = randomUUID()
    await f.live.join(f.child, f.session.id, { deviceId, takeover: false })
    const room = await f.live.room(f.teacher, f.session.id)
    await f.live.control(f.teacher, f.session.id, room.occurrence!.version, {
      kind: 'admit',
      learnerId: f.child.id,
    })
    const workspaceService = new LiveWorkspaceService(
      new DrizzleLiveWorkspaceRepository(connection!.db),
      f.live,
    )
    const workspace = await workspaceService.openForBlock(f.child, f.session.id, f.block.blockId)
    await workspaceService.claim(f.child, workspace.id, deviceId, false)
    const requested = await workspaceService.requestAssistance(f.teacher, workspace.id)
    const commands: any[] = []
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      async fetch(request) {
        const command = (await request.json()) as Record<string, unknown>
        commands.push(command)
        return Response.json({ ...command, state: 'paused', captureStopped: true })
      },
    })
    try {
      const provider = new OwnRecordingProvider(connection!.db, f.repository, f.live, {
        url: `http://127.0.0.1:${server.port}`,
        token: 'review-token-with-at-least-32-characters',
      })
      await provider.syncOccurrence(f.session.occurrenceId)
      expect(commands[0].desiredState).toBe('paused')
      const resumeFailure = await provider
        .command(f.teacher, f.session.id, 'resume')
        .catch((error) => error)
      expect(resumeFailure.code).toBe('RECORDING_ASSISTANCE_ACTIVE')
      await workspaceService.cancelAssistance(f.teacher, workspace.id, requested.assistance!.id)
      await provider.command(f.teacher, f.session.id, 'resume')
      expect(commands.at(-1).desiredState).toBe('recording')
      expect((await workspaceService.get(f.teacher, workspace.id)).assistance).toBeNull()
    } finally {
      await connection!.db
        .delete(liveRecordingJobs)
        .where(eq(liveRecordingJobs.occurrenceId, f.session.occurrenceId))
      await server.stop(true)
    }
  })

  test('failed stop is retried after recorder recovery', async () => {
    const f = await fixture(new DrizzleLiveRepository(connection!.db))
    let failing = true
    let requests = 0
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      async fetch(request) {
        requests++
        const command = (await request.json()) as Record<string, unknown>
        if (failing) return new Response('Transient failure', { status: 503 })
        const prefix = `live/recordings/${command.occurrenceId}/${command.jobId}/${command.generation}/`
        await provider.acceptEvent({
          jobId: command.jobId as string,
          occurrenceId: command.occurrenceId as string,
          generation: command.generation as number,
          eventSequence: 1,
          state: 'review',
          manifestKey: `${prefix}manifest.json`,
          replayKey: `${prefix}replay.mp4`,
          error: null,
          captureStopped: true,
        })
        return Response.json({ ...command, state: 'review', captureStopped: true })
      },
    })
    const provider = new OwnRecordingProvider(connection!.db, f.repository, f.live, {
      url: `http://127.0.0.1:${server.port}`,
      token: 'review-token-with-at-least-32-characters',
    })
    let stop: (() => Promise<void>) | undefined
    try {
      const failure = await provider
        .command(f.teacher, f.session.id, 'stop')
        .catch((error) => error)
      expect(failure).toBeInstanceOf(Error)
      expect(requests).toBe(1)
      failing = false
      stop = provider.start()
      await Bun.sleep(5600)
      expect(requests).toBeGreaterThan(1)
      const [job] = await connection!.db
        .select()
        .from(liveRecordingJobs)
        .where(eq(liveRecordingJobs.occurrenceId, f.session.occurrenceId))
      expect(job!.desiredState).toBe('stopped')
      expect(job!.confirmedState).toBe('review')
      expect((await f.live.room(f.teacher, f.session.id)).occurrence!.recording.state).toBe(
        'review',
      )
    } finally {
      await stop?.()
      await connection!.db
        .delete(liveRecordingJobs)
        .where(eq(liveRecordingJobs.occurrenceId, f.session.occurrenceId))
      await server.stop(true)
    }
  }, 40_000)
})
