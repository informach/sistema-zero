import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { LiveService } from '../../src/application/live/live.service'
import {
  LiveAccessError,
  LiveConflictError,
  LiveNotFoundError,
  LiveUnavailableError,
} from '../../src/domain/live/live.errors'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import { InMemoryLiveCourses, InMemoryLiveRepository } from '../fakes/live-in-memory'

const teacher: LiveActor = {
  id: randomUUID(),
  accountId: randomUUID(),
  name: 'Ana Professora',
  staff: true,
}
const learner: LiveActor = {
  id: randomUUID(),
  accountId: randomUUID(),
  name: 'Bia Criança',
  staff: false,
}
const other: LiveActor = {
  id: randomUUID(),
  accountId: randomUUID(),
  name: 'Outra Criança',
  staff: false,
}
const device = randomUUID()
const startsAt = '2026-11-07T17:00:00.000Z'
const endsAt = '2026-11-07T18:00:00.000Z'

test('deadline sweep durably ends an unattended call and is idempotent', async () => {
  const f = await fixture()
  await f.start()
  f.setTime('2026-11-07T18:00:01Z')
  await f.service.reconcileDeadlines()
  const first = await f.service.room(teacher, f.session.id)
  expect(first.occurrence?.state).toBe('ended')
  expect(first.access.canJoinMedia).toBe(false)
  await f.service.reconcileDeadlines()
  expect((await f.service.room(teacher, f.session.id)).occurrence?.version).toBe(
    first.occurrence?.version,
  )
})

async function fixture(capacity = 8, mediaReady = true) {
  let now = new Date(startsAt)
  const repository = new InMemoryLiveRepository()
  const profiles = {
    assertOwnership: async (accountId: string, learnerId: string | null) => {
      if (learnerId === learner.id && accountId !== learner.accountId) throw new LiveAccessError()
      return { name: learnerId === learner.id ? learner.name : 'Outro Criador' }
    },
  }
  const courses = new InMemoryLiveCourses()
  const { course, lessons } = courses.add({ lessons: 2, title: 'Cadê todo mundo?' })
  const service = new LiveService(repository, () => now, profiles, { mediaReady, courses })
  const { cohort, sessions } = await service.createCohort(teacher, course.id, {
    title: 'Turma A',
    timeZone: 'America/Sao_Paulo',
    capacity,
    accessDays: 30,
    teacherIds: [teacher.id],
    schedule: [
      { startsAt, endsAt },
      { startsAt: '2026-11-14T17:00:00Z', endsAt: '2026-11-14T18:00:00Z' },
    ],
  })
  await service.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
  const session = sessions[0]!
  const enrollment = await service.enroll(teacher, cohort.id, {
    accountId: learner.accountId,
    learnerId: learner.id,
    learnerName: 'Untrusted name',
  })
  const start = async () => {
    const room = await service.room(teacher, session.id)
    await service.control(teacher, session.id, room.occurrence!.version, { kind: 'start' })
    await service.join(learner, session.id, { deviceId: device, takeover: false })
    const joined = await service.room(teacher, session.id)
    return service.control(teacher, session.id, joined.occurrence!.version, {
      kind: 'admit',
      learnerId: learner.id,
    })
  }
  return {
    repository,
    service,
    courses,
    course,
    lessons,
    cohort,
    session,
    sessions,
    enrollment,
    start,
    setTime: (value: string) => {
      now = new Date(value)
    },
  }
}

describe('Oficinas: acesso e consistência', () => {
  test('cada aula tem trinta dias civis próprios; compra e replay não mudam a janela', async () => {
    const { service, session, sessions, enrollment, setTime } = await fixture()
    expect(enrollment.learnerName).toBe(learner.name)
    expect((await service.room(learner, session.id)).access.endsAt).toBe('2026-12-07T17:00:00.000Z')
    const future = await service.room(learner, sessions[1]!.id)
    expect(future.access.status).toBe('scheduled')
    expect(future.lesson).toBeNull()
    expect(future.occurrence).toBeNull()
    setTime('2026-12-07T17:00:00Z')
    expect((await service.room(learner, session.id)).access.status).toBe('expired')
    expect((await service.room(learner, sessions[1]!.id)).access.status).toBe('available')
  })
  test('outro perfil, outra família e admin não atribuído não recebem roteiro ou sala', async () => {
    const { service, session } = await fixture()
    await expect(service.room(other, session.id)).rejects.toBeInstanceOf(LiveNotFoundError)
    await expect(
      service.room({ ...learner, accountId: other.accountId }, session.id),
    ).rejects.toBeInstanceOf(LiveNotFoundError)
    await expect(service.room({ ...teacher, id: randomUUID() }, session.id)).rejects.toBeInstanceOf(
      LiveNotFoundError,
    )
    await expect(service.catalog(learner, 'parents')).rejects.toBeInstanceOf(LiveAccessError)
  })
  test('catálogo não entrega chaves privadas nem matrículas alheias', async () => {
    const { service, course } = await fixture()
    const catalog = await service.catalog(other)
    expect(catalog.enrollments).toEqual([])
    expect(JSON.stringify(catalog)).not.toContain('storageKey')
    expect(catalog.programs).toEqual([])
    expect(catalog.courses?.map((item) => item.id)).toEqual([course.id])
    expect(catalog.courses?.[0]?.lessons).toHaveLength(2)
  })
  test('duas inscrições simultâneas disputam uma única vaga; pendente também conta', async () => {
    const { service, cohort } = await fixture(2)
    const results = await Promise.allSettled([
      service.enroll(teacher, cohort.id, {
        accountId: other.accountId,
        learnerId: other.id,
        learnerName: 'Outra',
      }),
      service.enroll(teacher, cohort.id, {
        accountId: randomUUID(),
        learnerId: null,
        learnerName: 'Ainda sem perfil',
      }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect((await service.enrollments(teacher, cohort.id)).enrollments).toHaveLength(2)
  })
  test('inscrição repetida devolve a mesma vaga; vínculo a conta errada é recusado', async () => {
    const { service, cohort, enrollment } = await fixture()
    // A double click (or a retry) returns the seat that already exists, never a second one.
    const again = await service.enroll(teacher, cohort.id, {
      accountId: learner.accountId,
      learnerId: learner.id,
      learnerName: 'Bia',
    })
    expect(again.id).toBe(enrollment.id)
    const pending = { accountId: other.accountId, learnerId: null, learnerName: 'Irmão' }
    const first = await service.enroll(teacher, cohort.id, pending)
    const second = await service.enroll(teacher, cohort.id, { ...pending, learnerName: ' irmão ' })
    expect(second.id).toBe(first.id)
    expect((await service.enrollments(teacher, cohort.id)).enrollments).toHaveLength(2)
    await expect(
      service.enroll(teacher, cohort.id, {
        accountId: other.accountId,
        learnerId: learner.id,
        learnerName: 'Bia',
      }),
    ).rejects.toBeInstanceOf(LiveAccessError)
  })
  test('vincular vaga pendente não troca perfil já definido nem abre conta dos pais à criança', async () => {
    const { service, cohort, enrollment } = await fixture()
    const pending = await service.enroll(teacher, cohort.id, {
      accountId: other.accountId,
      learnerId: null,
      learnerName: 'Pendente',
    })
    await expect(service.assignLearner(learner, pending.id, other.id)).rejects.toBeInstanceOf(
      LiveNotFoundError,
    )
    await service.assignLearner({ ...other, id: other.accountId }, pending.id, other.id)
    await expect(
      service.assignLearner(teacher, enrollment.id, randomUUID()),
    ).rejects.toBeInstanceOf(LiveConflictError)
  })
  test('revogar matrícula bloqueia imediatamente conteúdos e nova negociação', async () => {
    const { service, session, enrollment, start } = await fixture()
    await start()
    await service.revoke(teacher, enrollment.id)
    await expect(service.room(learner, session.id)).rejects.toBeInstanceOf(LiveNotFoundError)
  })
})

describe('Oficinas: supervisão e participação', () => {
  test('guia individual expira sem aparecer para outros perfis', async () => {
    const { service, cohort, session, start, setTime } = await fixture()
    let room = await start()
    await service.enroll(teacher, cohort.id, {
      accountId: other.accountId,
      learnerId: other.id,
      learnerName: other.name,
    })
    room = await service.control(teacher, session.id, room.occurrence!.version, {
      kind: 'guide',
      target: 'studio-run',
      learnerId: learner.id,
    })
    expect((await service.room(learner, session.id)).occurrence?.guidance?.target).toBe(
      'studio-run',
    )
    expect((await service.room(other, session.id)).occurrence?.guidance).toBeNull()
    setTime('2026-11-07T17:00:08Z')
    expect((await service.room(learner, session.id)).occurrence?.guidance).toBeNull()
  })

  test('professora revisa antes de publicar, criança só recebe replay publicado dentro do grant', async () => {
    const { service, session, setTime } = await fixture()
    const storageKey = `live/recordings/${session.occurrenceId}/replay.mp4`
    const recording = await service.setRecordingState(session.occurrenceId, {
      state: 'review',
      storageKey,
    })
    await expect(service.recording(learner, session.id)).rejects.toBeInstanceOf(LiveNotFoundError)
    expect((await service.recording(teacher, session.id)).storageKey).toBe(storageKey)
    const published = await service.publishRecording(teacher, session.id, recording.version, true)
    expect(published.occurrence?.recording.storageKey).toBeNull()
    expect((await service.recording(learner, session.id)).expiresAt).toBe(
      '2026-12-07T17:00:00.000Z',
    )
    const version = published.occurrence!.recording.version
    await service.saveReplayPosition(learner, session.id, version, 123.4)
    expect((await service.replayPosition(learner, session.id, version)).positionSeconds).toBe(123)
    await expect(service.replayPosition(other, session.id, version)).rejects.toBeInstanceOf(
      LiveNotFoundError,
    )
    await expect(
      service.saveReplayPosition(learner, session.id, version + 1, 20),
    ).rejects.toBeInstanceOf(LiveNotFoundError)
    await expect(
      service.setRecordingState(session.occurrenceId, { state: 'failed' }),
    ).rejects.toBeInstanceOf(LiveConflictError)
    setTime('2026-12-07T17:00:00Z')
    await expect(service.recording(learner, session.id)).rejects.toBeInstanceOf(LiveAccessError)
  })
  test('não inicia turma com infraestrutura ainda não validada', async () => {
    const { service, session } = await fixture(8, false)
    await expect(service.control(teacher, session.id, 1, { kind: 'start' })).rejects.toBeInstanceOf(
      LiveUnavailableError,
    )
    expect((await service.room(teacher, session.id)).occurrence?.state).toBe('scheduled')
  })
  test('espera não lê conversa nem negocia mídia; admissão libera sem ligar dispositivos', async () => {
    const { service, session } = await fixture()
    await service.control(teacher, session.id, 1, { kind: 'start' })
    await service.chat(teacher, session.id, device, 'Bem-vindos!')
    const waiting = await service.join(learner, session.id, { deviceId: device, takeover: false })
    expect(waiting.occurrence?.messages).toEqual([])
    expect(waiting.access.canJoinMedia).toBe(false)
    await expect(
      service.authorizeMedia(learner, waiting.occurrence!.id, device),
    ).rejects.toBeInstanceOf(LiveAccessError)
    const room = await service.room(teacher, session.id)
    await service.control(teacher, session.id, room.occurrence!.version, {
      kind: 'admit',
      learnerId: learner.id,
    })
    expect(
      (await service.authorizeMedia(learner, room.occurrence!.id, device)).participation
        ?.turnGranted,
    ).toBe(false)
  })
  test('takeover exige ação explícita e inutiliza o dispositivo anterior', async () => {
    const { service, session, start } = await fixture()
    await start()
    const newDevice = randomUUID()
    await expect(
      service.join(learner, session.id, { deviceId: newDevice, takeover: false }),
    ).rejects.toBeInstanceOf(LiveConflictError)
    const changed = await service.join(learner, session.id, { deviceId: newDevice, takeover: true })
    expect(changed.occurrence?.participants[0]?.admission).toBe('admitted')
    await expect(service.heartbeat(learner, session.id, device)).rejects.toBeInstanceOf(
      LiveConflictError,
    )
    await expect(
      service.authorizeMedia(learner, changed.occurrence!.id, device),
    ).rejects.toBeInstanceOf(LiveConflictError)
  })
  test('ausência docente suspende conversa, fila e novas negociações sem apagar o trabalho', async () => {
    const { service, session, start, setTime } = await fixture()
    await start()
    setTime('2026-11-07T17:00:31Z')
    const room = await service.room(learner, session.id)
    expect(room.supervision).toBe('unavailable')
    expect(room.lesson).not.toBeNull()
    expect(room.access.canJoinMedia).toBe(false)
    await expect(service.chat(learner, session.id, device, 'Olá')).rejects.toBeInstanceOf(
      LiveConflictError,
    )
    await expect(service.request(learner, session.id, device, 'hand', true)).rejects.toBeInstanceOf(
      LiveConflictError,
    )
    await expect(
      service.authorizeMedia(learner, room.occurrence!.id, device),
    ).rejects.toBeInstanceOf(LiveUnavailableError)
    await service.heartbeat(teacher, session.id, device)
    expect((await service.room(learner, session.id)).supervision).toBe('present')
  })
  test('mãos e ajuda são independentes; abaixar todas não apaga ajuda', async () => {
    const { service, session, start } = await fixture()
    await start()
    await service.request(learner, session.id, device, 'hand', true)
    await service.request(learner, session.id, device, 'help', true)
    const room = await service.room(teacher, session.id)
    const cleared = await service.control(teacher, session.id, room.occurrence!.version, {
      kind: 'lower-hands',
      learnerId: null,
    })
    expect(cleared.occurrence?.participants[0]?.handAt).toBeNull()
    expect(cleared.occurrence?.participants[0]?.helpAt).not.toBeNull()
  })
  test('modo coletivo e mute transitório preservam trava individual e controles antigos não sobrescrevem', async () => {
    const { service, session, start } = await fixture()
    let room = await start()
    const oldVersion = room.occurrence!.version
    room = await service.control(teacher, session.id, room.occurrence!.version, {
      kind: 'lock-microphone',
      learnerId: learner.id,
    })
    room = await service.control(teacher, session.id, room.occurrence!.version, {
      kind: 'speaking-mode',
      mode: 'open',
    })
    expect(room.occurrence?.participants[0]?.microphoneLocked).toBe(true)
    // Moderation is idempotent: a busy room (stale version) never makes it fail.
    room = await service.control(teacher, session.id, oldVersion, {
      kind: 'unlock-microphone',
      learnerId: learner.id,
    })
    expect(room.occurrence?.participants[0]?.microphoneLocked).toBe(false)
    // State transitions still require the version the teacher saw.
    await expect(
      service.control(teacher, session.id, oldVersion, { kind: 'end' }),
    ).rejects.toBeInstanceOf(LiveConflictError)
    await expect(
      service.control(learner, session.id, room.occurrence!.version, { kind: 'end' }),
    ).rejects.toBeInstanceOf(LiveAccessError)
  })
  test('reposição conserva ocorrência antiga e precisa extensão explícita fora dos trinta dias', async () => {
    const { service, repository, cohort, session, start } = await fixture()
    const room = await start()
    const ended = await service.control(teacher, session.id, room.occurrence!.version, {
      kind: 'end',
    })
    await expect(
      service.replaceOccurrence(teacher, session.id, {
        expectedVersion: ended.occurrence!.version,
        startsAt: '2026-12-09T17:00:00Z',
        endsAt: '2026-12-09T18:00:00Z',
      }),
    ).rejects.toBeInstanceOf(LiveConflictError)
    // Extending the family's commercial access is admin-only (S7).
    await expect(
      service.replaceOccurrence(teacher, session.id, {
        expectedVersion: ended.occurrence!.version,
        startsAt: '2026-12-09T17:00:00Z',
        endsAt: '2026-12-09T18:00:00Z',
        extendAccessUntil: '2026-12-10T17:00:00Z',
      }),
    ).rejects.toBeInstanceOf(LiveAccessError)
    const replacement = await service.replaceOccurrence({ ...teacher, admin: true }, session.id, {
      expectedVersion: ended.occurrence!.version,
      startsAt: '2026-12-09T17:00:00Z',
      endsAt: '2026-12-09T18:00:00Z',
      extendAccessUntil: '2026-12-10T17:00:00Z',
    })
    expect(replacement.id).not.toBe(session.occurrenceId)
    const aggregate = (await repository.findCohort(cohort.id))!
    expect(aggregate.occurrences.find((item) => item.id === session.occurrenceId)?.state).toBe(
      'ended',
    )
    expect(aggregate.grants.find((item) => item.sessionId === session.id)?.startsAt).toBe(startsAt)
  })
  test('fim operacional não acaba com o prazo da atividade e não permite reabrir chamada', async () => {
    const { service, session, start, setTime } = await fixture()
    await start()
    setTime(endsAt)
    const room = await service.room(learner, session.id)
    expect(room.access.canOpen).toBe(true)
    expect(room.access.canJoinMedia).toBe(false)
    await expect(service.chat(learner, session.id, device, 'Olá')).rejects.toBeInstanceOf(
      LiveConflictError,
    )
  })
})

test('heartbeat reports only the active child device and valid lesson parts', async () => {
  const f = await fixture()
  await f.start()
  const [first, second] = f.lessons[0]!.sectionIds
  await f.service.heartbeat(learner, f.session.id, device, {
    stepId: null,
    saveState: 'saving',
    sectionId: second!,
    completedSectionIds: [first!],
  })
  const room = await f.service.room(teacher, f.session.id)
  expect(room.occurrence!.participants[0]!.activity).toEqual({
    stepId: null,
    saveState: 'saving',
    sectionId: second!,
    completedSectionIds: [first!],
    reportedAt: startsAt,
  })
  await expect(
    f.service.heartbeat(learner, f.session.id, randomUUID(), { stepId: null, saveState: 'saved' }),
  ).rejects.toThrow()
  // The old script steps no longer exist.
  await expect(
    f.service.heartbeat(learner, f.session.id, device, {
      stepId: randomUUID(),
      saveState: 'saved',
    }),
  ).rejects.toThrow()
})

test('catalog filters before paginating and visits each visible cohort once', async () => {
  const f = await fixture()
  const source = f.repository.cohorts.get(f.cohort.id)!
  for (let i = 0; i < 6; i++) {
    const copy = structuredClone(source)
    copy.cohort.id = randomUUID()
    copy.cohort.status = i % 2 ? 'open' : 'archived'
    copy.enrollments = []
    copy.sessions = []
    f.repository.cohorts.set(copy.cohort.id, copy)
  }
  const seen: string[] = []
  let cursor: string | undefined
  do {
    const page = await f.service.catalog(learner, 'learner', { limit: 1, cursor })
    expect(page.cohorts).toHaveLength(1)
    seen.push(...page.cohorts.map((item) => item.id))
    cursor = page.nextCursor ?? undefined
  } while (cursor)
  expect(seen).toHaveLength(4)
  expect(new Set(seen).size).toBe(4)
  expect(seen).toContain(f.cohort.id)
})
