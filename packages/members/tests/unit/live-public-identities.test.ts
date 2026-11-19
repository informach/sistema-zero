import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { LiveService } from '../../src/application/live/live.service'
import type {
  LiveCohortAggregate,
  LiveRepository,
} from '../../src/domain/ports/live-repository.port'
import { InMemoryLiveCourses, InMemoryLiveRepository } from '../fakes/live-in-memory'

class ObservedRepository extends InMemoryLiveRepository {
  locked = false
  override roomTransaction<T>(
    ref: Parameters<LiveRepository['roomTransaction']>[0],
    mutate: (aggregate: LiveCohortAggregate) => T | Promise<T>,
    accountId?: string,
  ): Promise<T> {
    return super.roomTransaction(
      ref,
      async (aggregate) => {
        this.locked = true
        try {
          return await mutate(aggregate)
        } finally {
          this.locked = false
        }
      },
      accountId,
    )
  }
}

async function fixture(audience: 'kids' | 'adult' = 'kids') {
  const teacher = { id: randomUUID(), accountId: randomUUID(), name: 'Ana Professora', staff: true }
  const child = {
    id: randomUUID(),
    accountId: randomUUID(),
    name: 'Apelido antigo da sessão',
    staff: false,
  }
  const peer = {
    id: randomUUID(),
    accountId: randomUUID(),
    name: 'Outro nome antigo',
    staff: false,
  }
  if (audience === 'adult') {
    child.accountId = child.id
    peer.accountId = peer.id
  }
  const device = randomUUID()
  const repository = new ObservedRepository()
  const courses = new InMemoryLiveCourses()
  const { course } = courses.add({ lessons: 1, audience })
  const names = new Map<string, string>([
    [child.id, 'Fada Azul'],
    [peer.id, 'Dragão Verde'],
  ])
  let offline = false
  let calls = 0
  const service = new LiveService(
    repository,
    () => new Date('2026-11-07T17:00:00Z'),
    {
      assertOwnership: async () => ({ name: 'Nome Privado Antigo' }),
    },
    {
      mediaReady: true,
      courses,
      publicIdentities: {
        getProfileNames: async (ids) => {
          expect(repository.locked).toBe(false)
          calls++
          if (offline) throw new Error('offline')
          return new Map(ids.flatMap((id) => (names.has(id) ? [[id, names.get(id) ?? '']] : [])))
        },
      },
    },
  )
  const { cohort, sessions } = await service.createCohort(teacher, course.id, {
    title: 'Turma',
    timeZone: 'America/Sao_Paulo',
    capacity: 8,
    accessDays: 30,
    teacherIds: [teacher.id],
    schedule: [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }],
  })
  await service.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
  for (const actor of [child, peer])
    await service.enroll(teacher, cohort.id, {
      accountId: actor.accountId,
      learnerId: actor.id,
      learnerName: 'Não confiar',
    })
  const session = sessions[0]
  if (!session) throw new Error('Missing session')
  const room = await service.room(teacher, session.id)
  await service.control(teacher, session.id, room.occurrence?.version, { kind: 'start' })
  for (const actor of [child, peer]) {
    await service.join(actor, session.id, { deviceId: device, takeover: false })
    await service.control(teacher, session.id, undefined, { kind: 'admit', learnerId: actor.id })
  }
  return {
    service,
    repository,
    teacher,
    child,
    peer,
    session,
    cohort,
    names,
    device,
    offline: () => {
      offline = true
    },
    calls: () => calls,
  }
}

test('workshop participants, historic messages and media use complete current nicknames outside SQL locks', async () => {
  const f = await fixture()
  await f.service.chat(f.child, f.session.id, f.device, 'Olá!')
  await f.service.chat(f.peer, f.session.id, f.device, 'Oi!')
  await f.service.chat(f.teacher, f.session.id, randomUUID(), 'Bem-vindos!')
  f.names.set(f.child.id, 'Estrela do Mar')
  const roster = await f.service.catalog(f.teacher, 'admin')
  expect(
    roster.enrollments.find((enrollment) => enrollment.learnerId === f.child.id)?.learnerName,
  ).toBe('Estrela do Mar')
  const room = await f.service.room(f.teacher, f.session.id)
  expect(room.occurrence?.participants.map((p) => p.displayName)).toEqual([
    'Estrela do Mar',
    'Dragão Verde',
  ])
  expect(room.occurrence?.messages.map((m) => m.authorName)).toEqual([
    'Estrela do Mar',
    'Dragão Verde',
    'Ana',
  ])
  const childRoom = await f.service.request(f.child, f.session.id, f.device, 'hand', true)
  expect(childRoom.occurrence?.messages[1]).toMatchObject({
    authorId: null,
    authorName: 'Dragão Verde',
  })
  expect(childRoom.occurrence?.participants).toHaveLength(1)
  const occurrence = room.occurrence
  if (!occurrence) throw new Error('Missing occurrence')
  const before = f.calls()
  const media = await f.service.authorizeMediaMany(occurrence.id, [
    { actor: f.child, deviceId: f.device },
    { actor: f.peer, deviceId: f.device },
    { actor: f.teacher, deviceId: randomUUID() },
  ])
  expect(f.calls() - before).toBe(1)
  expect(media.map((r) => (r.ok ? r.access.displayName : 'denied'))).toEqual([
    'Estrela do Mar',
    'Dragão Verde',
    'Ana',
  ])
  const single = await f.service.authorizeMedia(f.child, occurrence.id, f.device)
  expect(single.displayName).toBe('Estrela do Mar')
  expect(single.participation?.displayName).toBe('Estrela do Mar')
})

test('unavailable or removed public identities never restore private enrollment/message snapshots', async () => {
  const f = await fixture()
  await f.service.chat(f.child, f.session.id, f.device, 'Olá!')
  f.names.delete(f.child.id)
  expect(
    (await f.service.room(f.teacher, f.session.id)).occurrence?.participants[0]?.displayName,
  ).toBe('Criador(a)')
  f.offline()
  const view = await f.service.heartbeat(f.child, f.session.id, f.device)
  expect(view.occurrence?.participants[0]?.displayName).toBe('Criador(a)')
  expect(view.occurrence?.messages[0]?.authorName).toBe('Criador(a)')
  expect(JSON.stringify(view)).not.toContain('Nome Privado Antigo')
})

test('adult workshop names are unchanged and do not query child identities', async () => {
  const f = await fixture('adult')
  const before = f.calls()
  f.offline()
  const view = await f.service.room(f.teacher, f.session.id)
  expect(view.occurrence?.participants[0]?.displayName).toBe('Nome')
  expect(f.calls()).toBe(before)
})
