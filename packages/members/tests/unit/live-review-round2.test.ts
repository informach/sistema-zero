import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { LiveConflictError } from '../../src/domain/live/live.errors'
import { liveFixture } from '../fakes/live-fixture'

test.each([
  false,
  true,
])('a delayed lower-hands command preserves newer requests (all=%s)', async (all) => {
  const f = await liveFixture()
  await f.start()
  const before = await f.live.room(f.teacher, f.session.id)
  await f.live.request(f.child, f.session.id, f.deviceId, 'hand', true)
  const raised = await f.live.room(f.teacher, f.session.id)
  const command = { kind: 'lower-hands' as const, learnerId: all ? null : f.child.id }
  await expect(
    f.live.control(f.teacher, f.session.id, before.occurrence!.version, command),
  ).rejects.toBeInstanceOf(LiveConflictError)
  expect(
    (await f.live.room(f.teacher, f.session.id)).occurrence!.participants[0]!.handAt,
  ).not.toBeNull()
  // A repeated request is idempotent and does not invalidate an otherwise current command.
  const repeated = await f.live.request(f.child, f.session.id, f.deviceId, 'hand', true)
  expect(repeated.occurrence!.version).toBe(raised.occurrence!.version)
  const lowered = await f.live.control(f.teacher, f.session.id, raised.occurrence!.version, command)
  expect(lowered.occurrence!.participants[0]!.handAt).toBeNull()
  // Even within the same millisecond, lowering and raising again constitutes a new request.
  await f.live.request(f.child, f.session.id, f.deviceId, 'hand', true)
  await expect(
    f.live.control(f.teacher, f.session.id, lowered.occurrence!.version, command),
  ).rejects.toBeInstanceOf(LiveConflictError)
})

test('discovery stays public while personal agendas contain only active enrollments or assigned teaching', async () => {
  const f = await liveFixture()
  await f.live.updateProgram(f.teacher, f.cohort.programId, {
    expectedRevision: 1,
    status: 'published',
  })
  const visitor = { id: randomUUID(), accountId: randomUUID(), name: 'Visitante', staff: false }
  const publicCatalog = await f.live.catalog(visitor)
  expect(publicCatalog.programs.map((item) => item.id)).toContain(f.cohort.programId)
  expect(publicCatalog.cohorts.map((item) => item.id)).toContain(f.cohort.id)
  expect(publicCatalog.sessions).toEqual([])
  expect((await f.live.catalog({ ...visitor, staff: true })).sessions).toEqual([])
  expect((await f.live.catalog({ ...visitor, id: visitor.accountId }, 'parents')).sessions).toEqual(
    [],
  )
  expect((await f.live.catalog(f.teacher)).sessions.map((item) => item.id)).toContain(f.session.id)
  expect((await f.live.catalog(f.child)).sessions.map((item) => item.id)).toContain(f.session.id)
  expect(
    (await f.live.catalog({ ...f.child, id: f.child.accountId }, 'parents')).sessions.map(
      (item) => item.id,
    ),
  ).toContain(f.session.id)
  // An expired lesson remains in the enrolled family's history with its original window.
  f.advance(31 * 86_400_000)
  expect((await f.live.catalog(f.child)).sessions.map((item) => item.id)).toContain(f.session.id)
  const own = (await f.live.catalog(f.child)).enrollments[0]!
  await f.live.revoke(f.teacher, own.id)
  expect((await f.live.catalog(f.child)).sessions).toEqual([])
  expect((await f.live.catalog({ ...f.child, id: f.child.accountId }, 'parents')).sessions).toEqual(
    [],
  )
  expect((await f.live.catalog(f.teacher, 'admin')).sessions.map((item) => item.id)).toContain(
    f.session.id,
  )
})
