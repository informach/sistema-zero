import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { LiveService } from '../../src/application/live/live.service'
import { LiveAccessError } from '../../src/domain/live/live.errors'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import { InMemoryLiveCourses, InMemoryLiveRepository } from '../fakes/live-in-memory'

const admin: LiveActor = {
  id: randomUUID(),
  accountId: randomUUID(),
  name: 'Clara',
  staff: true,
  admin: true,
}
const ana: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Ana', staff: true }
const bruna: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Bruna', staff: true }
const bia: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Bia', staff: false }
const device = randomUUID()
const startsAt = '2026-11-07T17:00:00.000Z'

/** A cohort of three encounters; the class happens in the first one. */
async function setup() {
  let now = new Date(startsAt)
  const repository = new InMemoryLiveRepository()
  const courses = new InMemoryLiveCourses()
  const { course, lessons } = courses.add({ lessons: 3, sections: 3 })
  const live = new LiveService(
    repository,
    () => now,
    { assertOwnership: async () => ({ name: 'Bia' }) },
    { mediaReady: true, courses },
  )
  const { cohort, sessions } = await live.createCohort(admin, course.id, {
    title: 'Turma',
    timeZone: 'America/Sao_Paulo',
    capacity: 8,
    accessDays: 30,
    teacherIds: [ana.id, bruna.id],
    schedule: [0, 1, 2].map((week) => ({
      startsAt: new Date(Date.parse(startsAt) + week * 7 * 86_400_000).toISOString(),
      endsAt: new Date(Date.parse(startsAt) + week * 7 * 86_400_000 + 3_600_000).toISOString(),
    })),
  })
  await live.updateCohort(admin, cohort.id, { status: 'open' })
  await live.enroll(admin, cohort.id, {
    accountId: bia.accountId,
    learnerId: bia.id,
    learnerName: 'Bia',
  })
  const session = sessions[0]!
  await live.control(ana, session.id, undefined, { kind: 'start' })
  await live.join(bia, session.id, { deviceId: device, takeover: false })
  await live.control(ana, session.id, undefined, { kind: 'admit', learnerId: bia.id })
  return {
    live,
    repository,
    cohort,
    session,
    sessions,
    lesson: lessons[0]!,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms)
    },
  }
}

describe('a sala lê e grava só o encontro', () => {
  test('sala e batimento leem só este encontro, nunca a turma inteira', async () => {
    const f = await setup()
    const before = { ...f.repository.reads }
    await f.live.room(bia, f.session.id)
    await f.live.room(ana, f.session.id)
    await f.live.heartbeat(bia, f.session.id, device, { stepId: null, saveState: 'saved' })
    await f.live.heartbeat(ana, f.session.id, randomUUID())
    expect(f.repository.reads.cohort).toBe(before.cohort)
    expect(f.repository.reads.room).toBeGreaterThan(before.room)
    // The room view of an encounter carries nothing of the other encounters.
    const room = await f.live.room(ana, f.session.id)
    expect(room.recordings).toEqual([])
    expect(room.session.id).toBe(f.session.id)
  })

  test('batimento sem novidade não regrava a ocorrência; presença vai na linha pequena', async () => {
    const f = await setup()
    const report = { stepId: null, saveState: 'saved' as const }
    // The first report IS news (the activity changed): one write of the occurrence.
    let writes = f.repository.reads.occurrenceWrites
    await f.live.heartbeat(bia, f.session.id, device, report)
    expect(f.repository.reads.occurrenceWrites).toBe(writes + 1)
    writes = f.repository.reads.occurrenceWrites
    const presence = f.repository.reads.presenceWrites
    for (let beat = 0; beat < 6; beat++) {
      f.advance(5_000)
      await f.live.heartbeat(bia, f.session.id, device, report)
      await f.live.heartbeat(ana, f.session.id, randomUUID())
    }
    expect(f.repository.reads.occurrenceWrites).toBe(writes)
    expect(f.repository.reads.presenceWrites).toBe(presence + 12)
    // A repeated beat within the refresh window writes nothing at all.
    await f.live.heartbeat(bia, f.session.id, device, report)
    expect(f.repository.reads.presenceWrites).toBe(presence + 12)
    // Presence (from the small row) is what the teacher sees, at the beat's precision.
    const room = await f.live.room(ana, f.session.id)
    const participant = room.occurrence?.participants[0]
    expect(Date.parse(room.serverTime) - Date.parse(participant!.seenAt)).toBeLessThan(5_000)
    expect(
      Date.parse(room.serverTime) - Date.parse(participant!.activity!.reportedAt),
    ).toBeLessThan(5_000)
    expect(room.supervision).toBe('present')
    // A new part IS news again.
    await f.live.control(ana, f.session.id, undefined, {
      kind: 'open-section',
      sectionId: f.lesson.sectionIds[1]!,
    })
    writes = f.repository.reads.occurrenceWrites
    await f.live.heartbeat(bia, f.session.id, device, {
      ...report,
      sectionId: f.lesson.sectionIds[1]!,
    })
    expect(f.repository.reads.occurrenceWrites).toBe(writes + 1)
  })

  test('a supervisão segue a presença da professora; sem batimento, ela some como antes', async () => {
    const f = await setup()
    for (let beat = 0; beat < 8; beat++) {
      f.advance(5_000)
      await f.live.heartbeat(ana, f.session.id, randomUUID())
    }
    expect((await f.live.room(bia, f.session.id)).supervision).toBe('present')
    f.advance(16_000)
    expect((await f.live.room(bia, f.session.id)).supervision).toBe('reconnecting')
    f.advance(15_000)
    expect((await f.live.room(bia, f.session.id)).supervision).toBe('unavailable')
    // A teacher removed from the cohort never supervises through an old presence row.
    f.advance(1_000)
    await f.live.heartbeat(bruna, f.session.id, randomUUID())
    expect((await f.live.room(bia, f.session.id)).supervision).toBe('present')
    await f.live.updateCohort(admin, f.cohort.id, { teacherIds: [ana.id] })
    expect((await f.live.room(bia, f.session.id)).supervision).toBe('unavailable')
  })

  test('presença respeita a cerca de exclusão da conta', async () => {
    const f = await setup()
    f.advance(5_000)
    f.repository.fences.add(bia.accountId)
    await expect(f.live.heartbeat(bia, f.session.id, device)).rejects.toBeInstanceOf(
      LiveAccessError,
    )
  })

  test('escrever num encontro nunca toca os outros encontros da turma', async () => {
    const f = await setup()
    const others = () =>
      JSON.stringify(
        f.repository.cohorts
          .get(f.cohort.id)!
          .occurrences.filter((item) => item.sessionId !== f.session.id),
      )
    const before = others()
    await f.live.chat(ana, f.session.id, randomUUID(), 'Bem-vindos!')
    await f.live.control(ana, f.session.id, undefined, { kind: 'chat', enabled: false })
    await f.live.heartbeat(bia, f.session.id, device, { stepId: null, saveState: 'saving' })
    expect(others()).toBe(before)
    // The cohort still has every encounter after the slice writes.
    expect(f.repository.cohorts.get(f.cohort.id)!.sessions).toHaveLength(3)
    expect(f.repository.cohorts.get(f.cohort.id)!.occurrences).toHaveLength(3)
  })
})
