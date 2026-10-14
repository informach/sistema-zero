import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { liveFixture } from '../fakes/live-fixture'

test.each([
  false,
  true,
])('a delayed lower-hands command preserves newer requests (all=%s)', async (all) => {
  const f = await liveFixture()
  await f.start()
  // The teacher's screen shows the room at this instant; the command carries it as `before`.
  const before = await f.live.room(f.teacher, f.session.id)
  f.advance(1000)
  await f.live.request(f.child, f.session.id, f.deviceId, 'hand', true)
  const raised = await f.live.room(f.teacher, f.session.id)
  const learnerId = all ? null : f.child.id
  // A stale version no longer fails a moderation command, and a newer hand stays up.
  const stale = await f.live.control(f.teacher, f.session.id, before.occurrence!.version, {
    kind: 'lower-hands',
    learnerId,
    before: before.serverTime,
  })
  expect(stale.occurrence!.participants[0]!.handAt).not.toBeNull()
  // A repeated request is idempotent and does not change the room.
  const repeated = await f.live.request(f.child, f.session.id, f.deviceId, 'hand', true)
  expect(repeated.occurrence!.participants[0]!.handAt).toBe(
    raised.occurrence!.participants[0]!.handAt,
  )
  const lowered = await f.live.control(f.teacher, f.session.id, undefined, {
    kind: 'lower-hands',
    learnerId,
    before: raised.serverTime,
  })
  expect(lowered.occurrence!.participants[0]!.handAt).toBeNull()
  // Without `before`, every hand is lowered (the command is idempotent).
  f.advance(1000)
  await f.live.request(f.child, f.session.id, f.deviceId, 'hand', true)
  const all2 = await f.live.control(f.teacher, f.session.id, undefined, {
    kind: 'lower-hands',
    learnerId,
  })
  expect(all2.occurrence!.participants[0]!.handAt).toBeNull()
  await expect(
    f.live.control(f.teacher, f.session.id, undefined, {
      kind: 'lower-hands',
      learnerId,
      before: 'ontem',
    }),
  ).rejects.toBeInstanceOf(ValidationError)
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
