import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createBlankProjectSnapshot } from '@sistemazero/studio/blank-project'
import { Elysia } from 'elysia'
import { LiveService } from '../../src/application/live/live.service'
import { LiveWorkspaceService } from '../../src/application/live/live-workspace.service'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { liveRoutes } from '../../src/interfaces/http/routes/live.routes'
import { liveWorkspaceRoutes } from '../../src/interfaces/http/routes/live-workspaces.routes'
import { silentLogger } from '../fakes/in-memory'
import { InMemoryLiveCourses, InMemoryLiveRepository } from '../fakes/live-in-memory'
import { InMemoryLiveWorkspaceRepository } from '../fakes/live-workspace-in-memory'

const adminId = randomUUID()
const admin = {
  'x-auth-user-id': adminId,
  'x-auth-user-status': 'active',
  'x-auth-user-role': 'admin',
  'x-internal-token': 'private-test-token',
}
const actor = { id: adminId, accountId: adminId, staff: true, name: 'Professora' }
const schedule = [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }]
function app() {
  const repository = new InMemoryLiveRepository()
  const courses = new InMemoryLiveCourses()
  const { course, lessons } = courses.add({ lessons: 1, sections: 3 })
  const clock = () => new Date('2026-11-07T17:00:00Z')
  const live = new LiveService(
    repository,
    clock,
    { assertOwnership: async () => ({ name: 'Criança' }) },
    { mediaReady: true, courses, recordingBucket: 'sz-gravacoes' },
  )
  const workspace = new LiveWorkspaceService(
    new InMemoryLiveWorkspaceRepository(repository),
    live,
    clock,
  )
  const server = new Elysia()
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const response = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = response.status
      return response.body
    })
    .use(liveRoutes({ live, internalToken: 'private-test-token', requireAdminEnabled: true }))
    .use(
      liveWorkspaceRoutes({
        workspace,
        internalToken: 'private-test-token',
        requireAdminEnabled: true,
      }),
    )
  const send = (
    path: string,
    headers: Record<string, string>,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
  ) =>
    server.handle(
      new Request(`http://localhost${path}`, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )
  return { live, send, courses, course, lesson: lessons[0]! }
}
const cohortBody = {
  title: 'Turma',
  timeZone: 'America/Sao_Paulo',
  accessDays: 30,
  capacity: 8,
  teacherIds: [adminId],
  schedule,
}
async function openCohort(f: ReturnType<typeof app>) {
  const { cohort, sessions } = await f.live.createCohort(actor, f.course.id, cohortBody)
  await f.live.updateCohort({ ...actor, admin: true }, cohort.id, { status: 'open' })
  const childId = randomUUID(),
    parentId = randomUUID()
  const enrollment = await f.live.enroll(actor, cohort.id, {
    learnerId: childId,
    accountId: parentId,
    learnerName: 'Criança',
  })
  const child = {
    'x-internal-token': admin['x-internal-token'],
    'x-auth-user-id': childId,
    'x-auth-account-id': parentId,
  }
  return { cohort, session: sessions[0]!, enrollment, child, childId }
}

describe('HTTP das oficinas', () => {
  test('a turma é de um curso ao vivo: uma data por aula publicada, só admin cria', async () => {
    const f = app()
    const path = `/members/admin/live/courses/${f.course.id}/cohorts`
    expect((await send(f, path, { ...admin, 'x-auth-user-role': 'staff' })).status).toBe(403)
    expect(
      (await send(f, path, { ...admin, 'x-auth-user-status': 'blocked' })).status,
    ).toBeGreaterThanOrEqual(400)
    const created = await send(f, path, admin)
    expect(created.status).toBe(201)
    const body = (await created.json()) as {
      cohort: { courseId: string; course: { slug: string }; programId: string }
      sessions: { lessonId: string; order: number }[]
    }
    expect(body.cohort).toMatchObject({ courseId: f.course.id, course: { slug: f.course.slug } })
    expect(body.sessions.map((item) => [item.order, item.lessonId])).toEqual([[0, f.lesson.id]])
    // One interval per published lesson, never more or less.
    expect(
      (
        await f.send(path, admin, {
          ...cohortBody,
          schedule: [
            ...schedule,
            { startsAt: '2026-11-14T17:00:00Z', endsAt: '2026-11-14T18:00:00Z' },
          ],
        })
      ).status,
    ).toBe(400)
    // A recorded course never gets a cohort; an unknown course is not found.
    const recorded = f.courses.add({ modality: 'recorded' }).course
    expect(
      (await f.send(`/members/admin/live/courses/${recorded.id}/cohorts`, admin, cohortBody))
        .status,
    ).toBe(400)
    expect(
      (await f.send(`/members/admin/live/courses/${randomUUID()}/cohorts`, admin, cohortBody))
        .status,
    ).toBe(404)
    // The old script routes are gone.
    expect(
      (await f.send('/members/admin/live/programs', admin, { title: 'x', lessons: [] })).status,
    ).toBe(404)
  })

  test('catálogo do Admin filtra pela plataforma do curso e lista os cursos ao vivo', async () => {
    const f = app()
    await f.live.createCohort(actor, f.course.id, cohortBody)
    const adult = f.courses.add({ audience: 'adult', title: 'Oficina adulta' }).course
    await f.live.createCohort(actor, adult.id, {
      ...cohortBody,
      schedule: [...schedule, { startsAt: '2026-11-14T17:00:00Z', endsAt: '2026-11-14T18:00:00Z' }],
    })
    const kids = (await (
      await f.send('/members/admin/live/catalog?audience=kids', admin)
    ).json()) as { courses: { id: string }[]; cohorts: { courseId: string }[] }
    expect(kids.courses.map((item) => item.id)).toEqual([f.course.id])
    expect(kids.cohorts.map((item) => item.courseId)).toEqual([f.course.id])
    const adults = (await (
      await f.send('/members/admin/live/catalog?audience=adult', admin)
    ).json()) as { courses: { id: string }[]; cohorts: { courseId: string }[] }
    expect(adults.cohorts.map((item) => item.courseId)).toEqual([adult.id])
    expect((await f.send('/members/admin/live/catalog?audience=x', admin)).status).toBe(400)
  })

  test('headers de identidade sem origem interna não são aceitos', async () => {
    const { send } = app()
    expect((await send('/members/live/catalog', {})).status).toBe(401)
    expect((await send('/members/live/catalog', { 'x-auth-user-id': adminId })).status).toBe(401)
    expect(
      (await send('/members/live/catalog', { ...admin, 'x-auth-user-id': 'not-a-uuid' })).status,
    ).toBe(400)
  })

  test('campos de controle são validados e uma criança não se promove por payload', async () => {
    const f = app()
    const { session, child } = await openCohort(f)
    const path = `/members/live/sessions/${session.id}/control`
    expect(
      (await f.send(path, child, { expectedVersion: 1, command: { kind: 'end' }, role: 'teacher' }))
        .status,
    ).toBe(403)
    expect(
      (await f.send(path, admin, { expectedVersion: 1.1, command: { kind: 'end' } })).status,
    ).toBe(400)
    expect(
      (
        await f.send(path, admin, {
          expectedVersion: 1,
          command: { kind: 'mute', learnerId: 'invalid' },
        })
      ).status,
    ).toBe(400)
    // The old script step suggestion no longer exists; a part id must be a uuid.
    expect(
      (await f.send(path, admin, { command: { kind: 'suggest-step', stepId: null } })).status,
    ).toBe(400)
    expect(
      (await f.send(path, admin, { command: { kind: 'open-section', sectionId: 'parte' } })).status,
    ).toBe(400)
  })

  test('partes conduzidas e relato da parte atravessam o DTO', async () => {
    const f = app()
    const { session, child, childId } = await openCohort(f)
    const control = `/members/live/sessions/${session.id}/control`
    const [first, second, third] = f.lesson.sectionIds as [string, string, string]
    const started = (await (
      await f.send(control, admin, { command: { kind: 'start' } })
    ).json()) as {
      occurrence: { sections: unknown; marks: { sectionId: string }[] }
    }
    expect(started.occurrence.sections).toEqual({ openedIds: [first], currentId: first })
    const deviceId = randomUUID()
    expect(
      (
        await f.send(`/members/live/sessions/${session.id}/join`, child, {
          deviceId,
          takeover: false,
        })
      ).status,
    ).toBe(200)
    await f.send(control, admin, { command: { kind: 'admit', learnerId: childId } })
    const opened = (await (
      await f.send(control, admin, { command: { kind: 'open-section', sectionId: second } })
    ).json()) as { occurrence: { sections: unknown; marks: { sectionId: string }[] } }
    expect(opened.occurrence.sections).toEqual({ openedIds: [first, second], currentId: second })
    expect(opened.occurrence.marks.map((item) => item.sectionId)).toEqual([first, second])
    const heartbeat = `/members/live/sessions/${session.id}/heartbeat`
    const reported = await f.send(heartbeat, child, {
      deviceId,
      activity: { saveState: 'saved', sectionId: second, completedSectionIds: [first] },
    })
    expect(reported.status).toBe(200)
    expect(
      ((await reported.json()) as { occurrence: { participants: { activity: unknown }[] } })
        .occurrence.participants[0]?.activity,
    ).toMatchObject({ stepId: null, sectionId: second, completedSectionIds: [first] })
    // Up to 60 parts, no repetition, only parts of the published lesson.
    for (const activity of [
      { saveState: 'saved', completedSectionIds: [first, first] },
      { saveState: 'saved', completedSectionIds: Array.from({ length: 61 }, () => randomUUID()) },
      { saveState: 'saved', sectionId: randomUUID() },
      { saveState: 'saved', sectionId: third, completedSectionIds: [randomUUID()] },
    ])
      expect((await f.send(heartbeat, child, { deviceId, activity })).status).toBe(400)
  })

  test('projeto ao vivo por bloco: GET com encontro e bloco abre ou cria; sem bloco lista', async () => {
    const f = app()
    const { session, child, childId } = await openCohort(f)
    const seed = createBlankProjectSnapshot(randomUUID(), 'Fase do cenário')
    const block = f.courses.addStudioBlock(f.course.id, f.lesson.id, {
      initialProject: seed,
      studio: { level: 'iniciante', allowedModes: ['blocks'] },
    })
    const path = `/members/live/workspaces?sessionId=${session.id}&blockId=${block.blockId}`
    const opened = await f.send(path, child)
    expect(opened.status).toBe(200)
    const view = (await opened.json()) as {
      id: string
      project: { id: string; name: string }
      studio: unknown
    }
    expect(view.project).toMatchObject({ id: view.id, name: 'Fase do cenário' })
    expect(view.studio).toEqual({ level: 'iniciante', allowedModes: ['blocks'] })
    expect(((await (await f.send(path, child)).json()) as { id: string }).id).toBe(view.id)
    // The teacher opens the child's project with `learnerId`.
    expect(
      ((await (await f.send(`${path}&learnerId=${childId}`, admin)).json()) as { id: string }).id,
    ).toBe(view.id)
    const list = (await (await f.send('/members/live/workspaces', child)).json()) as {
      workspaces: { id: string }[]
    }
    expect(list.workspaces.map((item) => item.id)).toEqual([view.id])
    expect((await f.send(`/members/live/workspaces?blockId=${block.blockId}`, child)).status).toBe(
      400,
    )
    expect(
      (
        await f.send(
          `/members/live/workspaces?sessionId=${session.id}&blockId=${randomUUID()}`,
          child,
        )
      ).status,
    ).toBe(404)
    // The old routes (template, demonstration, project by encounter) are gone.
    expect((await f.send(`/members/live/sessions/${session.id}/workspace`, child, {})).status).toBe(
      404,
    )
    expect((await f.send('/members/admin/live/templates', admin)).status).toBe(404)
  })
})

test('gravação: professora atribuída revisa, publica e manda ao Vimeo; equipe de fora não', async () => {
  const f = app()
  const { live } = f
  const { sessions } = await live.createCohort(actor, f.course.id, { ...cohortBody, capacity: 2 })
  const session = sessions[0]!
  const recording = await live.setRecordingState(session.occurrenceId, {
    state: 'review',
    storageKey: `live/recordings/${session.occurrenceId}/review.mp4`,
  })
  const staff = { ...admin, 'x-auth-user-role': 'staff' }
  const outsider = { ...staff, 'x-auth-user-id': randomUUID() }
  const source = `/members/admin/live/occurrences/${session.occurrenceId}/recording/source`
  expect((await f.send(source, outsider)).status).toBe(404)
  const found = await f.send(source, staff)
  expect(found.status).toBe(200)
  expect(await found.json()).toMatchObject({
    storageKey: `live/recordings/${session.occurrenceId}/review.mp4`,
    bucket: 'sz-gravacoes',
  })
  const body = {
    expectedVersion: recording.version,
    published: true,
    occurrenceId: session.occurrenceId,
  }
  expect(
    (await f.send(`/members/admin/live/sessions/${session.id}/recording/publish`, outsider, body))
      .status,
  ).not.toBe(200)
  expect(
    (await f.send(`/members/admin/live/sessions/${session.id}/recording/publish`, staff, body))
      .status,
  ).toBe(200)
  const vimeo = `/members/admin/live/occurrences/${session.occurrenceId}/recording/vimeo`
  const valid = {
    videoId: '123456',
    embedUrl: 'https://player.vimeo.com/video/123456?h=abc123',
    status: 'processing',
  }
  // The assigned teacher (staff) may send it; an unassigned one may not.
  expect((await f.send(vimeo, outsider, valid, 'PUT')).status).toBe(404)
  const saved = await f.send(vimeo, staff, valid, 'PUT')
  expect(saved.status).toBe(200)
  expect(await saved.json()).toMatchObject({
    occurrenceId: session.occurrenceId,
    recording: { vimeo: valid, published: true },
  })
  for (const embedUrl of [
    'https://player.vimeo.com/video/999999',
    'http://player.vimeo.com/video/123456',
    'https://evil.example/video/123456',
    'https://player.vimeo.com/video/123456?h=abc&autoplay=1',
    'https://player.vimeo.com/video/123456#t=1',
  ])
    expect((await f.send(vimeo, staff, { ...valid, embedUrl }, 'PUT')).status).toBe(400)
  expect((await f.send(vimeo, staff, { ...valid, videoId: 'abc' }, 'PUT')).status).toBe(400)
  expect((await f.send(vimeo, staff, { ...valid, status: 'done' }, 'PUT')).status).toBe(400)
  // Configuration writes stay admin-only.
  expect(
    (await f.send(`/members/admin/live/courses/${f.course.id}/cohorts`, staff, cohortBody)).status,
  ).toBe(403)
})

test('S4: sessão de suporte lê a sala, mas não age nela em nenhuma rota de escrita', async () => {
  const f = app()
  const { cohort, session, enrollment, child } = await openCohort(f)
  const parentId = child['x-auth-account-id']
  const childId = child['x-auth-user-id']
  const impersonated = { ...child, 'x-auth-impersonator-id': randomUUID() }
  const base = `/members/live/sessions/${session.id}`
  expect((await f.send(base, impersonated)).status).toBe(200)
  const join = { deviceId: randomUUID(), takeover: false }
  expect((await f.send(`${base}/join`, impersonated, join)).status).toBe(403)
  expect(
    (await f.send(`${base}/requests`, impersonated, { ...join, kind: 'hand', raised: true }))
      .status,
  ).toBe(403)
  expect(
    (
      await f.send(
        `/members/parents/live/enrollments/${enrollment.id}/assign`,
        { ...impersonated, 'x-auth-user-id': parentId },
        { learnerId: childId },
      )
    ).status,
  ).toBe(403)
  const supportAdmin = { ...admin, 'x-auth-impersonator-id': randomUUID() }
  expect(
    (
      await f.send(
        `/members/admin/live/cohorts/${cohort.id}`,
        supportAdmin,
        { status: 'closed' },
        'PATCH',
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await f.send(
        `/members/admin/live/occurrences/${session.occurrenceId}/recording/vimeo`,
        supportAdmin,
        { videoId: '1', embedUrl: 'https://player.vimeo.com/video/1', status: 'ready' },
        'PUT',
      )
    ).status,
  ).toBe(403)
  // Without the support marker the same child joins the open reception normally.
  await f.live.control(actor, session.id, undefined, { kind: 'open-lobby' })
  expect((await f.send(`${base}/join`, child, join)).status).toBe(200)
})

function send(f: ReturnType<typeof app>, path: string, headers: Record<string, string>) {
  return f.send(path, headers, cohortBody)
}
