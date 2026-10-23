import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { LiveService, type LiveServiceOptions } from '../../src/application/live/live.service'
import { LiveWorkspaceService } from '../../src/application/live/live-workspace.service'
import {
  LiveAccessError,
  LiveConflictError,
  LiveNotFoundError,
} from '../../src/domain/live/live.errors'
import type { LiveRecordingSegmentTime } from '../../src/domain/live/recording-chapters'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import type { LiveRewardsPort } from '../../src/domain/ports/live-rewards.port'
import { InMemoryLiveCourses, InMemoryLiveRepository } from '../fakes/live-in-memory'
import { InMemoryLiveWorkspaceRepository } from '../fakes/live-workspace-in-memory'

const admin: LiveActor = {
  id: randomUUID(),
  accountId: randomUUID(),
  name: 'Clara',
  staff: true,
  admin: true,
}
const ana: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Ana', staff: true }
const outsider: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Eva', staff: true }
const bia: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Bia', staff: false }
const caio: LiveActor = { id: randomUUID(), accountId: randomUUID(), name: 'Caio', staff: false }
const biaDevice = randomUUID()
const caioDevice = randomUUID()
const startsAt = '2026-11-07T17:00:00.000Z'
const endsAt = '2026-11-07T18:00:00.000Z'
const later = { startsAt: '2026-11-14T17:00:00.000Z', endsAt: '2026-11-14T18:00:00.000Z' }
const cohortInput = {
  title: 'Turma de sábado',
  timeZone: 'America/Sao_Paulo',
  capacity: 8,
  accessDays: 30,
  teacherIds: [ana.id],
  schedule: [{ startsAt, endsAt }, later],
}

async function setup(options: LiveServiceOptions = {}) {
  let now = new Date(startsAt)
  const repository = new InMemoryLiveRepository()
  const courses = new InMemoryLiveCourses()
  const { course, lessons } = courses.add({ lessons: 2, sections: 3, audience: 'kids' })
  const live = new LiveService(
    repository,
    () => now,
    {
      assertOwnership: async (_account, learnerId) => ({
        name: learnerId === bia.id ? 'Bia' : 'Caio',
      }),
    },
    { mediaReady: true, courses, ...options },
  )
  const { cohort, sessions } = await live.createCohort(admin, course.id, cohortInput)
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
    courses,
    course,
    lessons,
    cohort,
    session: sessions[0]!,
    sessions,
    setTime: (value: string) => {
      now = new Date(value)
    },
  }
}

async function enter(f: Awaited<ReturnType<typeof setup>>, child: LiveActor, device: string) {
  await f.live.join(child, f.session.id, { deviceId: device, takeover: false })
  return f.live.control(ana, f.session.id, undefined, { kind: 'admit', learnerId: child.id })
}

describe('turma de curso ao vivo', () => {
  test('um encontro por aula publicada, na ordem do curso, com o resumo do curso', async () => {
    const f = await setup()
    expect(f.cohort).toMatchObject({
      courseId: f.course.id,
      course: {
        id: f.course.id,
        slug: f.course.slug,
        title: f.course.title,
        audience: 'kids',
      },
      programId: '',
      status: 'draft',
    })
    expect(f.sessions.map((session) => [session.order, session.lessonId])).toEqual([
      [0, f.lessons[0]!.id],
      [1, f.lessons[1]!.id],
    ])
    expect(f.sessions[0]!.plan.title).toBe('Encontro 1')
  })

  test('curso gravado, arquivado, sem aulas ou com datas a mais/menos não vira turma', async () => {
    const f = await setup()
    await expect(f.live.createCohort(admin, randomUUID(), cohortInput)).rejects.toBeInstanceOf(
      LiveNotFoundError,
    )
    const recorded = f.courses.add({ modality: 'recorded' }).course
    await expect(f.live.createCohort(admin, recorded.id, cohortInput)).rejects.toBeInstanceOf(
      ValidationError,
    )
    const archived = f.courses.add({ status: 'archived' }).course
    await expect(f.live.createCohort(admin, archived.id, cohortInput)).rejects.toBeInstanceOf(
      LiveConflictError,
    )
    const empty = f.courses.add({ lessons: 0 }).course
    await expect(f.live.createCohort(admin, empty.id, cohortInput)).rejects.toBeInstanceOf(
      ValidationError,
    )
    await expect(
      f.live.createCohort(admin, f.course.id, {
        ...cohortInput,
        schedule: [cohortInput.schedule[0]!],
      }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(f.live.createCohort(bia, f.course.id, cohortInput)).rejects.toBeInstanceOf(
      LiveAccessError,
    )
    // Without the course port nothing creates a cohort (and nothing is guessed).
    const bare = new LiveService(new InMemoryLiveRepository(), () => new Date(startsAt), {
      assertOwnership: async () => ({ name: 'X' }),
    })
    await expect(bare.createCohort(admin, f.course.id, cohortInput)).rejects.toThrow(
      'cursos ao vivo',
    )
  })

  test('a sala manda o endereço da aula (não o roteiro) e só dentro do prazo', async () => {
    const f = await setup()
    const room = await f.live.room(bia, f.session.id)
    expect(room.lesson).toEqual({
      courseId: f.course.id,
      courseSlug: f.course.slug,
      lessonId: f.lessons[0]!.id,
    })
    expect(room).not.toHaveProperty('plan')
    expect(room).not.toHaveProperty('planRevision')
    expect((await f.live.room(bia, f.sessions[1]!.id)).lesson).toBeNull()
    expect((await f.live.room(ana, f.sessions[1]!.id)).lesson?.lessonId).toBe(f.lessons[1]!.id)
    f.setTime('2026-12-07T17:00:00Z')
    expect((await f.live.room(bia, f.session.id)).lesson).toBeNull()
  })

  test('turma antiga do roteiro (sem curso) é ignorada: fora do catálogo e sem sala', async () => {
    const f = await setup()
    const old = structuredClone(f.repository.cohorts.get(f.cohort.id)!)
    old.cohort.id = randomUUID()
    old.cohort.courseId = undefined
    old.cohort.course = undefined
    old.cohort.programId = randomUUID()
    old.sessions = old.sessions.map((session) => ({ ...session, id: randomUUID() }))
    f.repository.cohorts.set(old.cohort.id, old)
    expect((await f.live.catalog(admin, 'admin')).cohorts.map((item) => item.id)).toEqual([
      f.cohort.id,
    ])
    await expect(f.live.room(ana, old.sessions[0]!.id)).rejects.toBeInstanceOf(LiveNotFoundError)
  })

  test('catálogo: Admin pela plataforma; criança vê os cursos das turmas dela', async () => {
    const f = await setup()
    const adult = f.courses.add({ audience: 'adult', lessons: 1 }).course
    await f.live.createCohort(admin, adult.id, {
      ...cohortInput,
      schedule: [cohortInput.schedule[0]!],
    })
    const kids = await f.live.catalog(admin, 'admin', { audience: 'kids' })
    expect(kids.courses?.map((item) => item.id)).toEqual([f.course.id])
    expect(kids.cohorts.map((item) => item.courseId)).toEqual([f.course.id])
    expect(
      (await f.live.catalog(admin, 'admin', { audience: 'adult' })).cohorts.map((c) => c.courseId),
    ).toEqual([adult.id])
    expect((await f.live.catalog(admin, 'admin')).courses).toHaveLength(2)
    // Every live course of the platform, even without a cohort or a published lesson yet.
    const empty = f.courses.add({ lessons: 0, audience: 'kids', title: 'Ainda sem aula' }).course
    const withEmpty = await f.live.catalog(admin, 'admin', { audience: 'kids' })
    expect(withEmpty.courses?.find((item) => item.id === empty.id)?.lessons).toEqual([])
    f.courses.courses.delete(empty.id)
    const child = await f.live.catalog(bia, 'learner', { audience: 'kids' })
    expect(child.courses?.map((item) => item.id)).toEqual([f.course.id])
    expect(child.courses?.[0]?.lessons.map((lesson) => lesson.id)).toEqual(
      f.lessons.map((lesson) => lesson.id),
    )
    // The course summary of the catalog is the current one, and so are the lesson titles.
    f.courses.courses.get(f.course.id)!.title = 'Novo nome'
    f.courses.courses.get(f.course.id)!.lessons[0]!.title = 'Fase renomeada'
    const fresh = await f.live.catalog(bia)
    expect(fresh.cohorts[0]?.course?.title).toBe('Novo nome')
    expect(fresh.sessions.find((item) => item.id === f.session.id)?.title).toBe('Fase renomeada')
    await expect(f.live.catalog(bia, 'learner', { audience: 'x' as never })).rejects.toBeInstanceOf(
      ValidationError,
    )
  })
})

describe('partes conduzidas pela professora', () => {
  test('começar abre a PRIMEIRA parte e marca o capítulo; abrir torna atual; reabrir não marca', async () => {
    const f = await setup()
    const [first, second, third] = f.lessons[0]!.sectionIds as [string, string, string]
    await expect(
      f.live.control(ana, f.session.id, undefined, { kind: 'open-section', sectionId: second }),
    ).rejects.toBeInstanceOf(LiveConflictError)
    const started = await f.live.control(ana, f.session.id, undefined, { kind: 'start' })
    expect(started.occurrence?.sections).toEqual({ openedIds: [first], currentId: first })
    expect(started.occurrence?.marks).toEqual([{ sectionId: first, at: startsAt }])
    f.setTime('2026-11-07T17:10:00.000Z')
    const opened = await f.live.control(ana, f.session.id, undefined, {
      kind: 'open-section',
      sectionId: third,
    })
    expect(opened.occurrence?.sections).toEqual({ openedIds: [first, third], currentId: third })
    f.setTime('2026-11-07T17:20:00.000Z')
    const back = await f.live.control(ana, f.session.id, undefined, {
      kind: 'open-section',
      sectionId: first,
    })
    expect(back.occurrence?.sections).toEqual({ openedIds: [first, third], currentId: first })
    expect(back.occurrence?.marks).toEqual([
      { sectionId: first, at: startsAt },
      { sectionId: third, at: '2026-11-07T17:10:00.000Z' },
    ])
    // A part that is not in the published lesson, and a child conducting, are refused.
    await expect(
      f.live.control(ana, f.session.id, undefined, {
        kind: 'open-section',
        sectionId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(LiveNotFoundError)
    await expect(
      f.live.control(ana, f.session.id, undefined, {
        kind: 'open-section',
        sectionId: f.lessons[1]!.sectionIds[0]!,
      }),
    ).rejects.toBeInstanceOf(LiveNotFoundError)
    await enter(f, bia, biaDevice)
    await expect(
      f.live.control(bia, f.session.id, undefined, { kind: 'open-section', sectionId: second }),
    ).rejects.toBeInstanceOf(LiveAccessError)
    // The child sees the conducted parts in her room.
    expect((await f.live.room(bia, f.session.id)).occurrence?.sections?.currentId).toBe(first)
    await f.live.control(ana, f.session.id, undefined, { kind: 'end' })
    await expect(
      f.live.control(ana, f.session.id, undefined, { kind: 'open-section', sectionId: second }),
    ).rejects.toBeInstanceOf(LiveConflictError)
  })

  test('aula sem estrutura publicada começa sem parte aberta; a professora lê a aula como está', async () => {
    const f = await setup()
    f.courses.sections.get(f.lessons[0]!.id)!.published = false
    const started = await f.live.control(ana, f.session.id, undefined, { kind: 'start' })
    expect(started.occurrence?.sections).toEqual({ openedIds: [], currentId: null })
    expect(started.occurrence?.marks).toEqual([])
    // Published again (a new part): open-section reads it fresh, never a stale cache.
    const added = randomUUID()
    const lesson = f.courses.sections.get(f.lessons[0]!.id)!
    lesson.published = true
    lesson.sectionIds.push(added)
    const opened = await f.live.control(ana, f.session.id, undefined, {
      kind: 'open-section',
      sectionId: added,
    })
    expect(opened.occurrence?.sections).toEqual({ openedIds: [added], currentId: added })
  })

  test('o relato da criança: parte atual e concluídas, só da aula publicada, com cache curto', async () => {
    const f = await setup()
    const [first, second] = f.lessons[0]!.sectionIds as [string, string, string]
    await f.live.control(ana, f.session.id, undefined, { kind: 'start' })
    await enter(f, bia, biaDevice)
    const reads = f.courses.sectionReads
    for (let index = 0; index < 3; index++)
      await f.live.heartbeat(bia, f.session.id, biaDevice, {
        stepId: null,
        saveState: 'saved',
        sectionId: second,
        completedSectionIds: [first],
      })
    // Heartbeats every few seconds do not re-read the lesson each time.
    expect(f.courses.sectionReads - reads).toBeLessThanOrEqual(1)
    const teacherRoom = await f.live.room(ana, f.session.id)
    expect(teacherRoom.occurrence?.participants[0]?.activity).toMatchObject({
      sectionId: second,
      completedSectionIds: [first],
    })
    for (const activity of [
      { stepId: null, saveState: 'saved' as const, sectionId: 'parte' },
      { stepId: null, saveState: 'saved' as const, completedSectionIds: [first, first] },
      {
        stepId: null,
        saveState: 'saved' as const,
        completedSectionIds: Array.from({ length: 61 }, () => randomUUID()),
      },
      { stepId: null, saveState: 'saved' as const, sectionId: f.lessons[1]!.sectionIds[0]! },
    ])
      await expect(f.live.heartbeat(bia, f.session.id, biaDevice, activity)).rejects.toBeInstanceOf(
        ValidationError,
      )
    // Presence alone (no activity) never reads the lesson.
    const before = f.courses.sectionReads
    f.setTime('2026-11-07T17:05:00.000Z')
    await f.live.heartbeat(bia, f.session.id, biaDevice)
    expect(f.courses.sectionReads).toBe(before)
  })
})

describe('recompensas do encontro', () => {
  function rewards(fail = false) {
    const calls: Parameters<LiveRewardsPort['encounterAttended']>[0][] = []
    const errors: unknown[] = []
    return {
      calls,
      errors,
      options: {
        liveRewards: {
          async encounterAttended(input) {
            calls.push(input)
            if (fail) throw new Error('missão fora do ar')
          },
        } satisfies LiveRewardsPort,
        onRewardsError: (error: unknown) => errors.push(error),
      },
    }
  }

  test('quem já estava recebido na recepção conta quando o encontro começa; depois, ao receber', async () => {
    const r = rewards()
    const f = await setup(r.options)
    f.setTime('2026-11-07T16:50:00.000Z')
    await f.live.control(ana, f.session.id, undefined, { kind: 'open-lobby' })
    await enter(f, bia, biaDevice)
    // Reception is not an encounter yet.
    expect(r.calls).toEqual([])
    f.setTime(startsAt)
    await f.live.control(ana, f.session.id, undefined, { kind: 'start' })
    expect(r.calls).toEqual([
      {
        learnerId: bia.id,
        accountId: bia.accountId,
        occurrenceId: f.session.occurrenceId,
        courseId: f.course.id,
        audience: 'kids',
      },
    ])
    await enter(f, caio, caioDevice)
    expect(r.calls.map((call) => call.learnerId)).toEqual([bia.id, caio.id])
    // Admitting again (or any other command) does not repeat it.
    await f.live.control(ana, f.session.id, undefined, { kind: 'admit', learnerId: caio.id })
    await f.live.control(ana, f.session.id, undefined, { kind: 'admit-all' })
    await f.live.control(ana, f.session.id, undefined, { kind: 'chat', enabled: false })
    expect(r.calls).toHaveLength(2)
  })

  test('falha das recompensas nunca derruba o comando da professora', async () => {
    const r = rewards(true)
    const f = await setup(r.options)
    await f.live.control(ana, f.session.id, undefined, { kind: 'start' })
    await f.live.join(bia, f.session.id, { deviceId: biaDevice, takeover: false })
    const room = await f.live.control(ana, f.session.id, undefined, {
      kind: 'admit',
      learnerId: bia.id,
    })
    expect(room.occurrence?.participants[0]?.admission).toBe('admitted')
    expect(r.calls).toHaveLength(1)
    expect(r.errors).toHaveLength(1)
  })
})

describe('gravação com Vimeo e capítulos', () => {
  async function recorded(segments: LiveRecordingSegmentTime[] | null | Error) {
    const asked: string[] = []
    const f = await setup({
      recordingBucket: 'sz-gravacoes',
      async recordingTimeline(occurrenceId) {
        asked.push(occurrenceId)
        if (segments instanceof Error) throw segments
        return segments
      },
    })
    const [first, second, third] = f.lessons[0]!.sectionIds as [string, string, string]
    await f.live.control(ana, f.session.id, undefined, { kind: 'start' })
    f.setTime('2026-11-07T17:10:00.000Z')
    await f.live.control(ana, f.session.id, undefined, { kind: 'open-section', sectionId: second })
    f.setTime('2026-11-07T17:30:00.000Z')
    await f.live.control(ana, f.session.id, undefined, { kind: 'open-section', sectionId: third })
    await f.live.control(ana, f.session.id, undefined, { kind: 'end' })
    const recording = await f.live.setRecordingState(f.session.occurrenceId, {
      state: 'review',
      storageKey: `live/recordings/${f.session.occurrenceId}/replay.mp4`,
    })
    return { f, asked, first, second, third, version: recording.version }
  }

  test('publicar calcula os capítulos das partes descontando a pausa', async () => {
    // Recorded 17:00–17:12, paused, recorded again 17:25–17:40.
    const { f, asked, first, second, third, version } = await recorded([
      {
        startsAt: '2026-11-07T17:00:00.000Z',
        endsAt: '2026-11-07T17:12:00.000Z',
        durationMs: 720_000,
      },
      {
        startsAt: '2026-11-07T17:25:00.000Z',
        endsAt: '2026-11-07T17:40:00.000Z',
        durationMs: 900_000,
      },
    ])
    const published = await f.live.publishRecording(ana, f.session.id, version, true)
    expect(asked).toEqual([f.session.occurrenceId])
    expect(published.occurrence?.recording.chapters).toEqual([
      { sectionId: first, seconds: 0 },
      { sectionId: second, seconds: 600 },
      // 12 recorded minutes before the pause + 5 minutes after it resumed.
      { sectionId: third, seconds: 1020 },
    ])
  })

  test('sem linha do tempo (ou com o gravador fora) publica sem capítulos', async () => {
    for (const timeline of [null, new Error('gravador fora')]) {
      const { f, version } = await recorded(timeline)
      const published = await f.live.publishRecording(ana, f.session.id, version, true)
      expect(published.occurrence?.recording.published).toBe(true)
      expect(published.occurrence?.recording.chapters).toBeUndefined()
    }
  })

  test('origem do MP4 e Vimeo: só equipe da turma; a criança só vê o publicado dentro do prazo', async () => {
    const { f, version } = await recorded([
      { startsAt, endsAt: '2026-11-07T17:40:00.000Z', durationMs: 2_400_000 },
    ])
    const occurrenceId = f.session.occurrenceId
    // The real bucket of the recorder and the video name for Vimeo.
    expect(await f.live.recordingSource(ana, occurrenceId)).toEqual({
      storageKey: `live/recordings/${occurrenceId}/replay.mp4`,
      bucket: 'sz-gravacoes',
      title: 'Oficina de jogos · Encontro 1 · Turma de sábado · 07/11/2026',
    })
    expect((await f.live.recordingSource(admin, occurrenceId)).bucket).toBe('sz-gravacoes')
    for (const actor of [outsider, bia])
      await expect(f.live.recordingSource(actor, occurrenceId)).rejects.toBeInstanceOf(
        LiveNotFoundError,
      )
    const vimeo = {
      videoId: '76979871',
      embedUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
      status: 'processing',
    }
    // Under review (not yet published): the child never sees the Vimeo link.
    const saved = await f.live.setRecordingVimeo(ana, occurrenceId, vimeo)
    expect(saved.recording.vimeo).toEqual({ ...vimeo, status: 'processing' })
    expect(saved.recording).not.toHaveProperty('storageKey')
    await expect(f.live.setRecordingVimeo(outsider, occurrenceId, vimeo)).rejects.toBeInstanceOf(
      LiveNotFoundError,
    )
    // The same video again is idempotent; ANOTHER video never replaces one in progress.
    expect(
      (await f.live.setRecordingVimeo(ana, occurrenceId, vimeo)).recording.vimeo?.videoId,
    ).toBe('76979871')
    const other = {
      videoId: '11111',
      embedUrl: 'https://player.vimeo.com/video/11111',
      status: 'processing',
    }
    await expect(f.live.setRecordingVimeo(ana, occurrenceId, other)).rejects.toBeInstanceOf(
      LiveConflictError,
    )
    await expect(
      f.live.setRecordingVimeo(ana, occurrenceId, {
        ...vimeo,
        embedUrl: 'https://vimeo.com/76979871',
      }),
    ).rejects.toBeInstanceOf(ValidationError)
    const hidden = await f.live.room(bia, f.session.id)
    expect(hidden.occurrence?.recording.vimeo).toBeUndefined()
    expect(hidden.recordings).toEqual([])
    const teacherView = await f.live.room(ana, f.session.id)
    expect(teacherView.recordings?.[0]?.recording.vimeo?.videoId).toBe('76979871')
    // Published: version unchanged by Vimeo updates (children keep their replay position).
    const published = await f.live.publishRecording(ana, f.session.id, version, true)
    const publishedVersion = published.occurrence!.recording.version
    await f.live.setRecordingVimeo(ana, occurrenceId, { ...vimeo, status: 'ready' })
    const child = await f.live.room(bia, f.session.id)
    expect(child.access.canWatchRecording).toBe(true)
    expect(child.recordings?.[0]?.recording).toMatchObject({
      version: publishedVersion,
      vimeo: { videoId: '76979871', status: 'ready' },
      chapters: [
        { sectionId: f.lessons[0]!.sectionIds[0], seconds: 0 },
        expect.anything(),
        expect.anything(),
      ],
    })
    expect(f.repository.auditLog.map((item) => item.action)).toEqual(
      expect.arrayContaining(['recording.vimeo-processing', 'recording.vimeo-ready']),
    )
    // After the deadline the child has no recording at all.
    f.setTime('2026-12-07T17:00:00Z')
    const expired = await f.live.room(bia, f.session.id)
    expect(expired.recordings).toEqual([])
    expect(expired.occurrence).toBeNull()
  })

  test('vídeo do Vimeo só depois da revisão', async () => {
    const f = await setup()
    await expect(
      f.live.setRecordingVimeo(ana, f.session.occurrenceId, {
        videoId: '1',
        embedUrl: 'https://player.vimeo.com/video/1',
        status: 'processing',
      }),
    ).rejects.toBeInstanceOf(LiveConflictError)
    await expect(f.live.recordingSource(ana, f.session.occurrenceId)).rejects.toBeInstanceOf(
      LiveConflictError,
    )
  })
})

test('adulto: conta ativa vira vaga, catálogo, sala e projeto próprio; perfil infantil não substitui a conta', async () => {
  const repository = new InMemoryLiveRepository()
  const courses = new InMemoryLiveCourses()
  const { course, lessons } = courses.add({ audience: 'adult', lessons: 2 })
  const studio = courses.addStudioBlock(course.id, lessons[0]!.id)
  const id = randomUUID()
  const adult: LiveActor = { id, accountId: id, name: 'Conta adulta', staff: false }
  const ownership: (string | null)[] = []
  const live = new LiveService(
    repository,
    () => new Date(startsAt),
    {
      assertOwnership: async (account, learner) => {
        ownership.push(learner)
        if (account !== id || learner !== null) throw new LiveAccessError()
        return { name: 'Nome confirmado pelo Auth' }
      },
    },
    { courses },
  )
  const { cohort, sessions } = await live.createCohort(admin, course.id, cohortInput)
  await live.updateCohort(admin, cohort.id, { status: 'open' })
  const seat = await live.enroll(admin, cohort.id, {
    accountId: id,
    learnerId: id,
    learnerName: 'Nome do formulário',
  })
  expect(seat.learnerId).toBe(id)
  expect(seat.learnerName).toBe('Nome confirmado pelo Auth')
  expect(ownership).toEqual([null])
  expect((await live.catalog(adult, 'learner')).enrollments.map((e) => e.id)).toContain(seat.id)
  expect((await live.room(adult, sessions[0]!.id)).access.canOpen).toBe(true)
  const workspaces = new LiveWorkspaceService(
    new InMemoryLiveWorkspaceRepository(repository),
    live,
    () => new Date(startsAt),
  )
  const workspace = await workspaces.openForBlock(adult, sessions[0]!.id, studio.blockId)
  expect((await workspaces.listOwned(adult)).workspaces.map((w) => w.id)).toContain(workspace.id)
  for (const learnerId of [null, bia.id])
    await expect(
      live.enroll(admin, cohort.id, { accountId: id, learnerId, learnerName: 'Bia' }),
    ).rejects.toBeInstanceOf(ValidationError)
})
