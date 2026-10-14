import { afterAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { LiveWorkspaceService } from '../../src/application/live/live-workspace.service'
import { OwnRecordingProvider } from '../../src/infrastructure/live/own-recording.provider'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLiveRepository } from '../../src/infrastructure/persistence/drizzle/live.repository'
import { DrizzleLiveWorkspaceRepository } from '../../src/infrastructure/persistence/drizzle/live-workspace.repository'
import { liveRecordingJobs } from '../../src/infrastructure/persistence/drizzle/schema'
import { liveFixture } from '../fakes/live-fixture'
import { persistLiveCourse } from './live-course-rows'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase('sistemazero_live_corrections_test')
const db = url ? createDbConnection(url) : null
afterAll(async () => {
  await db?.close()
})

async function expectRejected(operation: Promise<unknown>) {
  const result = await operation.catch((error) => error)
  expect(result).toBeInstanceOf(Error)
}

describe.skipIf(!db)('interrupted assistance recovery on PostgreSQL', () => {
  test.each([
    'active',
    'returning',
  ] as const)('teacher ends abandoned %s help, fences old writes and resumes recording', async (state) => {
    const f = await liveFixture(new DrizzleLiveRepository(db!.db), {}, (course) =>
      persistLiveCourse(db!, course),
    )
    await f.start()
    const commands: { desiredState: string }[] = []
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      async fetch(request) {
        const command = (await request.json()) as { desiredState: string }
        commands.push(command)
        return Response.json({ ...command, state: 'paused', captureStopped: true })
      },
    })
    const provider = new OwnRecordingProvider(db!.db, f.repository, f.live, {
      url: `http://127.0.0.1:${server.port}`,
      token: 'review-token-at-least-32-characters-long',
    })
    const workspace = new LiveWorkspaceService(
      new DrizzleLiveWorkspaceRepository(db!.db),
      f.live,
      f.clock,
      provider,
    )
    try {
      const opened = await workspace.openForBlock(f.child, f.session.id, f.block.blockId)
      const claimed = await workspace.claim(f.child, opened.id, f.deviceId, false)
      const requested = await workspace.requestAssistance(f.teacher, opened.id)
      const accepted = await workspace.acceptAssistance(
        f.child,
        opened.id,
        requested.assistance!.id,
        {
          deviceId: f.deviceId,
          expectedRevision: claimed.revision,
          writerEpoch: claimed.writerEpoch,
          project: claimed.project,
          mutationId: randomUUID(),
        },
      )
      const teacherDevice = randomUUID()
      await workspace.attachTeacher(f.teacher, opened.id, teacherDevice)
      const teacherWrite = {
        deviceId: teacherDevice,
        expectedRevision: accepted.revision,
        writerEpoch: accepted.writerEpoch,
        project: { ...accepted.project, name: 'Ajuda guardada' },
        mutationId: randomUUID(),
      }
      await expectRejected(
        workspace.cancelAssistance(f.teacher, opened.id, requested.assistance!.id),
      )
      if (state === 'returning')
        await workspace.returnAuthorship(f.teacher, opened.id, teacherWrite)
      f.advance(31_000)
      await f.live.heartbeat(f.teacher, f.session.id, teacherDevice)
      const blocked = await provider
        .command(f.teacher, f.session.id, 'resume')
        .catch((error) => error)
      expect(blocked.code).toBe('RECORDING_ASSISTANCE_ACTIVE')
      const before = await workspace.get(f.teacher, opened.id)
      await expectRejected(workspace.cancelAssistance(f.child, opened.id, requested.assistance!.id))
      await expectRejected(workspace.cancelAssistance(f.teacher, opened.id, randomUUID()))
      const recovered = await workspace.cancelAssistance(
        f.teacher,
        opened.id,
        requested.assistance!.id,
      )
      expect(recovered.assistance).toBeNull()
      expect(recovered.writerId).toBe(f.child.id)
      expect(recovered.writerDeviceId).toBeNull()
      expect(recovered.leaseExpiresAt).toBeNull()
      expect(recovered.writerEpoch).toBeGreaterThan(before.writerEpoch)
      expect(recovered.revision).toBe(before.revision)
      expect(recovered.project).toEqual(before.project)
      await expectRejected(workspace.commit(f.teacher, opened.id, teacherWrite))
      await expectRejected(workspace.attachTeacher(f.teacher, opened.id, teacherDevice))
      await provider.command(f.teacher, f.session.id, 'resume')
      expect(commands.at(-1)!.desiredState).toBe('recording')
      const resumed = await workspace.claim(f.child, opened.id, f.deviceId, false)
      expect(resumed.writerId).toBe(f.child.id)
      expect(resumed.project).toEqual(before.project)
    } finally {
      await db!.db
        .delete(liveRecordingJobs)
        .where(eq(liveRecordingJobs.occurrenceId, f.session.occurrenceId))
      await server.stop(true)
    }
  }, 15_000)
})
