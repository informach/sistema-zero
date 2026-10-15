import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { LiveService } from '../../src/application/live/live.service'
import {
  LiveAccessError,
  LiveConflictError,
  LiveNotFoundError,
} from '../../src/domain/live/live.errors'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import { InMemoryLiveCourses, InMemoryLiveRepository } from '../fakes/live-in-memory'

const admin: LiveActor = {
  id: randomUUID(),
  accountId: randomUUID(),
  name: 'Clara Admin',
  staff: true,
  admin: true,
}
const ana: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Ana Souza', staff: true }
const bruna: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Bruna', staff: true }
const outsider: LiveActor = {
  id: randomUUID(),
  accountId: randomUUID(),
  name: 'Equipe de fora',
  staff: true,
}
const bia: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Bia', staff: false }
const caio: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Caio', staff: false }
const biaDevice = randomUUID()
const caioDevice = randomUUID()
const startsAt = '2026-11-07T17:00:00.000Z'
const endsAt = '2026-11-07T18:00:00.000Z'

async function setup() {
  let now = new Date('2026-11-07T16:30:00Z')
  const repository = new InMemoryLiveRepository()
  const changed: string[] = []
  const names: Record<string, string> = { [bia.id]: 'Bia Lima', [caio.id]: 'Caio Reis' }
  const courses = new InMemoryLiveCourses()
  const { course, lessons } = courses.add({ lessons: 2, title: 'Esconde-esconde' })
  const live = new LiveService(
    repository,
    () => now,
    { assertOwnership: async (_account, learnerId) => ({ name: names[learnerId ?? ''] ?? 'X' }) },
    {
      mediaReady: true,
      onPermissionsChanged: async (id) => {
        changed.push(id)
      },
      courses,
    },
  )
  const { cohort, sessions } = await live.createCohort(admin, course.id, {
    title: 'Turma de sábado',
    timeZone: 'America/Sao_Paulo',
    capacity: 8,
    accessDays: 30,
    teacherIds: [ana.id, bruna.id],
    teacherNames: { [ana.id]: ' Ana ', [bruna.id]: 'Bruna', [outsider.id]: 'Intrusa' },
    schedule: [
      { startsAt, endsAt },
      { startsAt: '2026-11-14T17:00:00Z', endsAt: '2026-11-14T18:00:00Z' },
    ],
  })
  await live.updateCohort(admin, cohort.id, { status: 'open' })
  for (const child of [bia, caio])
    await live.enroll(admin, cohort.id, {
      accountId: child.accountId,
      learnerId: child.id,
      learnerName: child.name,
    })
  return {
    live,
    repository,
    course,
    lessons,
    cohort,
    session: sessions[0]!,
    later: sessions[1]!,
    changed,
    setTime: (value: string) => {
      now = new Date(value)
    },
  }
}

describe('contrato das oficinas (14/10)', () => {
  test('a criança entra na recepção 15 minutos antes; conteúdo só abre no horário', async () => {
    const f = await setup()
    // 20 minutes before: nothing yet.
    f.setTime('2026-11-07T16:40:00Z')
    expect((await f.live.room(bia, f.session.id)).occurrence).toBeNull()
    await expect(
      f.live.control(ana, f.session.id, undefined, { kind: 'open-lobby' }),
    ).rejects.toBeInstanceOf(LiveConflictError)
    // 10 minutes before: the child sees the occurrence and waits for the teacher.
    f.setTime('2026-11-07T16:50:00Z')
    const waiting = await f.live.room(bia, f.session.id)
    expect(waiting.occurrence?.state).toBe('scheduled')
    expect(waiting.access.canOpen).toBe(false)
    expect(waiting.access.canEnterLobby).toBe(false)
    expect(waiting.lesson).toBeNull()
    expect(waiting).not.toHaveProperty('planRevision')
    await expect(
      f.live.join(bia, f.session.id, { deviceId: biaDevice, takeover: false }),
    ).rejects.toBeInstanceOf(LiveConflictError)
    await f.live.control(ana, f.session.id, undefined, { kind: 'open-lobby' })
    expect((await f.live.room(bia, f.session.id)).access.canEnterLobby).toBe(true)
    const joined = await f.live.join(bia, f.session.id, { deviceId: biaDevice, takeover: false })
    expect(joined.occurrence?.state).toBe('lobby')
    expect(joined.occurrence?.participants[0]?.admission).toBe('waiting')
    expect(joined.lesson).toBeNull()
    expect(joined.occurrence?.messages).toEqual([])
    await f.live.heartbeat(bia, f.session.id, biaDevice)
    await f.live.join(caio, f.session.id, { deviceId: caioDevice, takeover: false })
    // Reception moderation: "Receber todos" without any version.
    const admitted = await f.live.control(ana, f.session.id, undefined, { kind: 'admit-all' })
    expect(admitted.occurrence?.participants.map((item) => item.admission)).toEqual([
      'admitted',
      'admitted',
    ])
    // Still no content or media before the start time.
    const early = await f.live.room(bia, f.session.id)
    expect(early.lesson).toBeNull()
    expect(early.access.canJoinMedia).toBe(false)
    await expect(
      f.live.authorizeMedia(bia, early.occurrence!.id, biaDevice),
    ).rejects.toBeInstanceOf(LiveAccessError)
    // At the start time the waiting page receives the lesson address (the old script is gone).
    f.setTime(startsAt)
    const opened = await f.live.room(bia, f.session.id)
    expect(opened.lesson).toEqual({
      courseId: f.course.id,
      courseSlug: f.course.slug,
      lessonId: f.lessons[0]!.id,
    })
    expect(opened).not.toHaveProperty('plan')
    expect(opened).not.toHaveProperty('planRevision')
  })

  test('cancelar encontro que não aconteceu permite reposição; admit-all respeita retirada', async () => {
    const f = await setup()
    f.setTime('2026-11-07T16:50:00Z')
    let room = await f.live.control(ana, f.session.id, undefined, { kind: 'open-lobby' })
    await f.live.join(bia, f.session.id, { deviceId: biaDevice, takeover: false })
    await f.live.join(caio, f.session.id, { deviceId: caioDevice, takeover: false })
    await f.live.control(ana, f.session.id, undefined, { kind: 'remove', learnerId: caio.id })
    room = await f.live.control(ana, f.session.id, undefined, { kind: 'admit-all' })
    expect(
      Object.fromEntries(
        room.occurrence!.participants.map((item) => [item.learnerId, item.admission]),
      ),
    ).toEqual({ [bia.id]: 'admitted', [caio.id]: 'removed' })
    await expect(
      f.live.control(bia, f.session.id, undefined, { kind: 'cancel' }),
    ).rejects.toBeInstanceOf(LiveAccessError)
    // Transitions still check the version when the teacher sends it.
    await expect(f.live.control(ana, f.session.id, 1, { kind: 'cancel' })).rejects.toBeInstanceOf(
      LiveConflictError,
    )
    const cancelled = await f.live.control(ana, f.session.id, room.occurrence!.version, {
      kind: 'cancel',
    })
    expect(cancelled.occurrence?.state).toBe('cancelled')
    // Idempotent.
    expect(
      (await f.live.control(ana, f.session.id, undefined, { kind: 'cancel' })).occurrence?.state,
    ).toBe('cancelled')
    await expect(
      f.live.control(ana, f.session.id, undefined, { kind: 'admit', learnerId: bia.id }),
    ).rejects.toBeInstanceOf(LiveConflictError)
    const replacement = await f.live.replaceOccurrence(ana, f.session.id, {
      expectedVersion: cancelled.occurrence!.version,
      startsAt: '2026-11-08T17:00:00Z',
      endsAt: '2026-11-08T18:00:00Z',
    })
    expect(replacement.state).toBe('scheduled')
    expect(replacement.conductorId).toBeNull()
  })

  test('não dá para cancelar um encontro ao vivo; a professora que começa conduz', async () => {
    const f = await setup()
    f.setTime(startsAt)
    const started = await f.live.control(bruna, f.session.id, undefined, { kind: 'start' })
    expect(started.occurrence?.conductorId).toBe(bruna.id)
    await expect(
      f.live.control(ana, f.session.id, undefined, { kind: 'cancel' }),
    ).rejects.toBeInstanceOf(LiveConflictError)
  })

  test('encontro agendado cujo horário passou é cancelado pela varredura e aceita reposição', async () => {
    const f = await setup()
    f.setTime('2026-11-07T18:00:01Z')
    await f.live.reconcileDeadlines()
    const room = await f.live.room(ana, f.session.id)
    expect(room.occurrence?.state).toBe('cancelled')
    expect(f.repository.auditLog.map((item) => item.action)).toContain('room.deadline-cancelled')
    expect(f.changed).toContain(room.occurrence!.id)
    // The future lesson is untouched.
    expect((await f.live.room(ana, f.later.id)).occurrence?.state).toBe('scheduled')
    const replacement = await f.live.replaceOccurrence(ana, f.session.id, {
      expectedVersion: room.occurrence!.version,
      startsAt: '2026-11-09T17:00:00Z',
      endsAt: '2026-11-09T18:00:00Z',
    })
    expect(replacement.state).toBe('scheduled')
  })

  test('a sala da criança não expõe o id de perfil dos colegas', async () => {
    const f = await setup()
    f.setTime(startsAt)
    await f.live.control(ana, f.session.id, undefined, { kind: 'start' })
    for (const [child, device] of [
      [bia, biaDevice],
      [caio, caioDevice],
    ] as const) {
      await f.live.join(child, f.session.id, { deviceId: device, takeover: false })
      await f.live.control(ana, f.session.id, undefined, { kind: 'admit', learnerId: child.id })
    }
    await f.live.chat(ana, f.session.id, randomUUID(), 'Bem-vindos!')
    await f.live.chat(bia, f.session.id, biaDevice, 'Oi!')
    await f.live.chat(caio, f.session.id, caioDevice, 'Olá!')
    const biaView = await f.live.room(bia, f.session.id)
    expect(biaView.occurrence?.messages.map((item) => [item.authorName, item.authorId])).toEqual([
      ['Ana', ana.id],
      ['Bia', bia.id],
      ['Caio', null],
    ])
    const teacherView = await f.live.room(ana, f.session.id)
    expect(teacherView.occurrence?.messages.map((item) => item.authorId)).toEqual([
      ana.id,
      bia.id,
      caio.id,
    ])
  })

  test('a turma guarda o nome das professoras e a agenda mostra estado e gravação', async () => {
    const f = await setup()
    expect(f.cohort.teacherNames).toEqual({ [ana.id]: 'Ana', [bruna.id]: 'Bruna' })
    f.setTime(startsAt)
    await f.live.control(ana, f.session.id, undefined, { kind: 'start' })
    const catalog = await f.live.catalog(bia)
    expect(catalog.cohorts[0]?.teacherNames).toEqual({ [ana.id]: 'Ana', [bruna.id]: 'Bruna' })
    const summary = catalog.sessions.find((item) => item.id === f.session.id)
    expect(summary).toMatchObject({ occurrenceState: 'live', recordingPublished: false })
    const room = await f.live.room(bia, f.session.id)
    expect(room.cohort.teacherNames?.[ana.id]).toBe('Ana')
  })

  test('só a administração troca professoras; nomes acompanham a lista e tudo é auditado', async () => {
    const f = await setup()
    await expect(
      f.live.updateCohort(ana, f.cohort.id, { teacherIds: [ana.id] }),
    ).rejects.toBeInstanceOf(LiveAccessError)
    await expect(
      f.live.updateCohort(admin, f.cohort.id, { teacherIds: [ana.id, ana.id] }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      f.live.updateCohort(admin, f.cohort.id, { teacherNames: { [ana.id]: '' } }),
    ).rejects.toBeInstanceOf(ValidationError)
    f.setTime(startsAt)
    await f.live.control(bruna, f.session.id, undefined, { kind: 'start' })
    const updated = await f.live.updateCohort(admin, f.cohort.id, {
      teacherIds: [ana.id, outsider.id],
      teacherNames: { [outsider.id]: 'Dora', [bruna.id]: 'Bruna' },
    })
    expect(updated.teacherIds).toEqual([ana.id, outsider.id])
    expect(updated.teacherNames).toEqual({ [ana.id]: 'Ana', [outsider.id]: 'Dora' })
    expect(f.repository.auditLog.map((item) => item.action)).toContain('cohort.teachers-changed')
    // Removing a teacher revokes her room right and her heartbeat no longer supervises.
    await expect(f.live.room(bruna, f.session.id)).rejects.toBeInstanceOf(LiveNotFoundError)
    expect(f.changed.length).toBeGreaterThan(0)
    const renamed = await f.live.updateCohort(admin, f.cohort.id, {
      teacherNames: { [ana.id]: 'Professora Ana' },
    })
    expect(renamed.teacherNames).toEqual({ [ana.id]: 'Professora Ana', [outsider.id]: 'Dora' })
    expect(f.repository.auditLog.map((item) => item.action)).toContain(
      'cohort.teacher-names-changed',
    )
    expect((await f.live.updateCohort(admin, f.cohort.id, { status: 'closed' })).status).toBe(
      'closed',
    )
  })

  test('equipe não atribuída não vê crianças nem famílias de outras turmas', async () => {
    const f = await setup()
    const asOutsider = await f.live.catalog(outsider, 'admin')
    expect(asOutsider.cohorts.map((item) => item.id)).toContain(f.cohort.id)
    expect(asOutsider.enrollments).toEqual([])
    await expect(f.live.enrollments(outsider, f.cohort.id)).rejects.toBeInstanceOf(
      LiveNotFoundError,
    )
    expect((await f.live.catalog(ana, 'admin')).enrollments).toHaveLength(2)
    expect((await f.live.catalog(admin, 'admin')).enrollments).toHaveLength(2)
    expect((await f.live.enrollments(admin, f.cohort.id)).enrollments).toHaveLength(2)
  })

  test('autorização de mídia em lote: uma leitura da sala e o primeiro nome de cada um', async () => {
    const f = await setup()
    f.setTime(startsAt)
    await f.live.control(ana, f.session.id, undefined, { kind: 'start' })
    await f.live.join(bia, f.session.id, { deviceId: biaDevice, takeover: false })
    await f.live.control(ana, f.session.id, undefined, { kind: 'admit', learnerId: bia.id })
    await f.live.join(caio, f.session.id, { deviceId: caioDevice, takeover: false })
    const occurrenceId = (await f.live.room(ana, f.session.id)).occurrence!.id
    let loads = 0
    const original = f.repository.findRoom.bind(f.repository)
    f.repository.findRoom = async (ref) => {
      loads++
      return original(ref)
    }
    const cohortLoads = f.repository.reads.cohort
    const results = await f.live.authorizeMediaMany(occurrenceId, [
      { actor: bia, deviceId: biaDevice },
      { actor: ana, deviceId: randomUUID() },
      { actor: bruna, deviceId: randomUUID() },
      { actor: caio, deviceId: caioDevice },
    ])
    // One read of THIS encounter, never the whole cohort.
    expect(loads).toBe(1)
    expect(f.repository.reads.cohort).toBe(cohortLoads)
    expect(results.map((item) => (item.ok ? item.access.displayName : 'negado'))).toEqual([
      'Bia',
      'Ana',
      'Bruna',
      'negado',
    ])
    // Caio is still waiting: a real denial from the same snapshot.
    expect(results[3]).toMatchObject({ ok: false })
  })

  test('mensagens que chegam à criança não falam em aula', async () => {
    const f = await setup()
    f.setTime(startsAt)
    await f.live.control(ana, f.session.id, undefined, { kind: 'open-lobby' })
    await f.live.join(bia, f.session.id, { deviceId: biaDevice, takeover: false })
    const error = await f.live
      .request(bia, f.session.id, biaDevice, 'hand', true)
      .catch((cause: Error) => cause)
    expect(error).toBeInstanceOf(LiveConflictError)
    expect((error as Error).message).toBe('O encontro ainda não começou.')
    expect(new LiveNotFoundError().message).not.toMatch(/aula/i)
    expect(new LiveAccessError().message).not.toMatch(/aula/i)
  })
})
