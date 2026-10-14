import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { Elysia } from 'elysia'
import { LiveService } from '../../src/application/live/live.service'
import { LiveLearningService } from '../../src/application/live/live-learning.service'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { liveRoutes } from '../../src/interfaces/http/routes/live.routes'
import { liveLearningRoutes } from '../../src/interfaces/http/routes/live-learning.routes'
import { silentLogger } from '../fakes/in-memory'
import { InMemoryLiveRepository } from '../fakes/live-in-memory'

const adminId = randomUUID()
const admin = {
  'x-auth-user-id': adminId,
  'x-auth-user-status': 'active',
  'x-auth-user-role': 'admin',
  'x-internal-token': 'private-test-token',
}
const actor = { id: adminId, accountId: adminId, staff: true, name: 'Professora' }
function app() {
  const repository = new InMemoryLiveRepository()
  const live = new LiveService(repository, () => new Date('2026-11-07T17:00:00Z'), {
    assertOwnership: async () => ({ name: 'Criança' }),
  })
  const server = new Elysia()
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const response = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = response.status
      return response.body
    })
    .use(liveRoutes({ live, internalToken: 'private-test-token', requireAdminEnabled: true }))
    .use(
      liveLearningRoutes({
        learning: new LiveLearningService(live, repository, () => new Date('2026-11-07T17:00:00Z')),
        internalToken: 'private-test-token',
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
  return { live, send }
}
const program = {
  title: 'Oficina',
  description: 'Criar juntos',
  lessons: [
    { title: 'Cenário', instructions: 'Monte o cenário.', starterProjectId: null, materials: [] },
  ],
}

describe('HTTP das oficinas', () => {
  test('autoria preserva blocos válidos; rotas próprias de atividade avaliam sem aula de curso', async () => {
    const { send, live } = app()
    const block = {
      id: randomUUID(),
      revision: randomUUID(),
      content: {
        kind: 'interactive' as const,
        title: 'Descoberta',
        instructions: 'Experimente',
        hints: [],
        required: false,
        activity: { type: 'html' as const, html: '<p>Descubra</p>' },
      },
    }
    const definition = {
      ...program,
      lessons: [
        {
          ...program.lessons[0]!,
          steps: [{ id: randomUUID(), title: 'Etapa', instructions: 'Crie algo', blocks: [block] }],
        },
      ],
    }
    const authored = await send('/members/admin/live/programs', admin, definition)
    expect(authored.status).toBe(201)
    const created = (await authored.json()) as { id: string; lessons: typeof definition.lessons }
    expect(created.lessons[0]?.steps[0]?.blocks[0]?.content.activity).toEqual(
      block.content.activity,
    )
    const { cohort, sessions } = await live.createCohort(actor, created.id, {
      title: 'Turma',
      timeZone: 'America/Sao_Paulo',
      accessDays: 30,
      capacity: 1,
      teacherIds: [actor.id],
      schedule: [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }],
    })
    await live.updateCohort({ ...actor, admin: true }, cohort.id, { status: 'open' })
    const child = { id: randomUUID(), accountId: randomUUID() }
    await live.enroll(actor, cohort.id, {
      accountId: child.accountId,
      learnerId: child.id,
      learnerName: 'Alice',
    })
    const headers = {
      'x-internal-token': 'private-test-token',
      'x-auth-user-id': child.id,
      'x-auth-account-id': child.accountId,
    }
    const base = `/members/live/sessions/${sessions[0]!.id}`
    expect((await send(`${base}/learning-preview`, headers)).status).toBe(403)
    const result = await send(`${base}/blocks/${block.id}/learning-attempts`, headers, {
      id: randomUUID(),
      revision: block.revision,
      answers: { participated: true },
      hintsUsed: 0,
    })
    const evaluated = await result.json()
    expect({ status: result.status, evaluated }).toMatchObject({
      status: 200,
      evaluated: { attempt: { result: { passed: true } }, progress: { attemptsCount: 1 } },
    })
    expect(await (await send(`${base}/learning-progress`, headers)).json()).toMatchObject({
      blocks: [expect.objectContaining({ blockId: block.id })],
    })
    expect(
      (
        await send(`${base}/blocks/${block.id}/learning-progress`, admin, {
          revision: block.revision,
          answers: {},
          hintsUsed: 0,
          positionSeconds: null,
        })
      ).status,
    ).toBe(403)
  })
  test('headers de identidade sem origem interna não são aceitos', async () => {
    const { send } = app()
    expect((await send('/members/live/catalog', {})).status).toBe(401)
    expect((await send('/members/live/catalog', { 'x-auth-user-id': adminId })).status).toBe(401)
    expect(
      (await send('/members/live/catalog', { ...admin, 'x-auth-user-id': 'not-a-uuid' })).status,
    ).toBe(400)
  })
  test('configuração exige admin ativo; staff lê mas não cria', async () => {
    const { send } = app()
    expect(
      (
        await send(
          '/members/admin/live/programs',
          { ...admin, 'x-auth-user-role': 'staff' },
          program,
        )
      ).status,
    ).toBe(403)
    expect(
      (await send('/members/admin/live/catalog', { ...admin, 'x-auth-user-role': 'staff' })).status,
    ).toBe(200)
    expect(
      (
        await send(
          '/members/admin/live/programs',
          { ...admin, 'x-auth-user-status': 'blocked' },
          program,
        )
      ).status,
    ).toBe(403)
    expect((await send('/members/admin/live/programs', admin, program)).status).toBe(201)
  })
  test('campos de controle são validados e uma criança não se promove por payload', async () => {
    const { send, live } = app()
    const created = await live.createProgram(actor, program)
    const { cohort, sessions } = await live.createCohort(actor, created.id, {
      title: 'Turma',
      timeZone: 'America/Sao_Paulo',
      accessDays: 30,
      capacity: 8,
      teacherIds: [adminId],
      schedule: [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }],
    })
    await live.updateCohort({ ...actor, admin: true }, cohort.id, { status: 'open' })
    const childId = randomUUID(),
      parentId = randomUUID()
    await live.enroll(actor, cohort.id, {
      learnerId: childId,
      accountId: parentId,
      learnerName: 'Criança',
    })
    const headers = {
      'x-internal-token': admin['x-internal-token'],
      'x-auth-user-id': childId,
      'x-auth-account-id': parentId,
    }
    const path = `/members/live/sessions/${sessions[0]!.id}/control`
    expect(
      (await send(path, headers, { expectedVersion: 1, command: { kind: 'end' }, role: 'teacher' }))
        .status,
    ).toBe(403)
    expect(
      (await send(path, admin, { expectedVersion: 1.1, command: { kind: 'end' } })).status,
    ).toBe(400)
    expect(
      (
        await send(path, admin, {
          expectedVersion: 1,
          command: { kind: 'mute', learnerId: 'invalid' },
        })
      ).status,
    ).toBe(400)
  })
})

test('assigned staff can review a replay while unrelated staff and configuration writes remain forbidden', async () => {
  const { send, live } = app()
  const created = await live.createProgram(actor, program)
  const { sessions } = await live.createCohort(actor, created.id, {
    title: 'Turma',
    capacity: 2,
    accessDays: 30,
    teacherIds: [actor.id],
    timeZone: 'America/Sao_Paulo',
    schedule: [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }],
  })
  const session = sessions[0]!
  const recording = await live.setRecordingState(session.occurrenceId, {
    state: 'review',
    storageKey: `live/recordings/${session.occurrenceId}/review.mp4`,
  })
  const body = {
    expectedVersion: recording.version,
    published: true,
    occurrenceId: session.occurrenceId,
  }
  const staff = { ...admin, 'x-auth-user-role': 'staff' }
  expect(
    (
      await send(
        `/members/admin/live/sessions/${session.id}/recording/publish`,
        { ...staff, 'x-auth-user-id': randomUUID() },
        body,
      )
    ).status,
  ).not.toBe(200)
  expect(
    (await send(`/members/admin/live/sessions/${session.id}/recording/publish`, staff, body))
      .status,
  ).toBe(200)
  expect((await send('/members/admin/live/programs', staff, program)).status).toBe(403)
})

describe('HTTP do contrato de 14/10', () => {
  test('curadoria do Estúdio, nomes das professoras e controles sem versão atravessam o DTO', async () => {
    const { send, live } = app()
    const studio = {
      level: 'iniciante',
      allowBlocks: ['when_flag_clicked'],
      allowCategories: ['eventos'],
      allowedModes: ['blocks', 'bridge'],
      allowLevelReveal: false,
    }
    const authored = await send('/members/admin/live/programs', admin, {
      ...program,
      lessons: [{ ...program.lessons[0]!, studio }],
    })
    expect(authored.status).toBe(201)
    const created = (await authored.json()) as { id: string; lessons: { studio?: unknown }[] }
    expect(created.lessons[0]?.studio).toEqual(studio)
    expect(
      (
        await send('/members/admin/live/programs', admin, {
          ...program,
          lessons: [{ ...program.lessons[0]!, studio: { allowedModes: ['code', 'code'] } }],
        })
      ).status,
    ).toBeGreaterThanOrEqual(400)
    const other = randomUUID()
    const cohortResponse = await send(`/members/admin/live/programs/${created.id}/cohorts`, admin, {
      title: 'Turma',
      timeZone: 'America/Sao_Paulo',
      accessDays: 30,
      capacity: 8,
      teacherIds: [adminId],
      teacherNames: { [adminId]: 'Ana', [other]: 'Fora' },
      schedule: [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }],
    })
    expect(cohortResponse.status).toBe(201)
    const { cohort, sessions } = (await cohortResponse.json()) as {
      cohort: { id: string; teacherNames: Record<string, string> }
      sessions: { id: string }[]
    }
    expect(cohort.teacherNames).toEqual({ [adminId]: 'Ana' })
    // Cohort PATCH: admin only, teacherIds validated (unique uuids, 1..4).
    const patch = `/members/admin/live/cohorts/${cohort.id}`
    expect(
      (await send(patch, { ...admin, 'x-auth-user-role': 'staff' }, { status: 'open' }, 'PATCH'))
        .status,
    ).toBe(403)
    expect(
      (await send(patch, admin, { teacherIds: [adminId, adminId] }, 'PATCH')).status,
    ).toBeGreaterThanOrEqual(400)
    expect((await send(patch, admin, { teacherIds: [] }, 'PATCH')).status).toBeGreaterThanOrEqual(
      400,
    )
    const opened = await send(
      patch,
      admin,
      { status: 'open', teacherIds: [adminId, other], teacherNames: { [other]: 'Dora' } },
      'PATCH',
    )
    expect(opened.status).toBe(200)
    expect(await opened.json()).toMatchObject({
      status: 'open',
      teacherIds: [adminId, other],
      teacherNames: { [adminId]: 'Ana', [other]: 'Dora' },
    })
    const childId = randomUUID(),
      parentId = randomUUID()
    await live.enroll(actor, cohort.id, {
      learnerId: childId,
      accountId: parentId,
      learnerName: 'Criança',
    })
    const path = `/members/live/sessions/${sessions[0]!.id}/control`
    expect((await send(path, admin, { command: { kind: 'admit-all' } })).status).toBe(200)
    const lowered = await send(path, admin, {
      command: { kind: 'lower-hands', learnerId: null, before: '2026-11-07T17:00:00.000Z' },
    })
    expect(lowered.status).toBe(200)
    expect(
      (await send(path, admin, { command: { kind: 'lower-hands', learnerId: null, before: 'x' } }))
        .status,
    ).toBeGreaterThanOrEqual(400)
    expect(
      (await send(path, admin, { expectedVersion: 99, command: { kind: 'cancel' } })).status,
    ).toBe(409)
    const cancelled = await send(path, admin, { command: { kind: 'cancel' } })
    expect(cancelled.status).toBe(200)
    expect(await cancelled.json()).toMatchObject({ occurrence: { state: 'cancelled' } })
  })
})

test('S4: sessão de suporte lê a sala, mas não age nela em nenhuma rota de escrita', async () => {
  const { send, live } = app()
  const created = await live.createProgram(actor, program)
  const { cohort, sessions } = await live.createCohort(actor, created.id, {
    title: 'Turma',
    timeZone: 'America/Sao_Paulo',
    accessDays: 30,
    capacity: 8,
    teacherIds: [adminId],
    schedule: [{ startsAt: '2026-11-07T17:00:00Z', endsAt: '2026-11-07T18:00:00Z' }],
  })
  await live.updateCohort({ ...actor, admin: true }, cohort.id, { status: 'open' })
  const childId = randomUUID(),
    parentId = randomUUID()
  const enrollment = await live.enroll(actor, cohort.id, {
    learnerId: childId,
    accountId: parentId,
    learnerName: 'Criança',
  })
  const child = {
    'x-internal-token': admin['x-internal-token'],
    'x-auth-user-id': childId,
    'x-auth-account-id': parentId,
  }
  const impersonated = { ...child, 'x-auth-impersonator-id': randomUUID() }
  const base = `/members/live/sessions/${sessions[0]!.id}`
  expect((await send(base, impersonated)).status).toBe(200)
  const join = { deviceId: randomUUID(), takeover: false }
  expect((await send(`${base}/join`, impersonated, join)).status).toBe(403)
  expect(
    (await send(`${base}/requests`, impersonated, { ...join, kind: 'hand', raised: true })).status,
  ).toBe(403)
  expect(
    (
      await send(
        `/members/parents/live/enrollments/${enrollment.id}/assign`,
        {
          ...impersonated,
          'x-auth-user-id': parentId,
        },
        { learnerId: childId },
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await send(
        `/members/admin/live/cohorts/${cohort.id}`,
        { ...admin, 'x-auth-impersonator-id': randomUUID() },
        { status: 'closed' },
        'PATCH',
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await send(`${base}/blocks/${randomUUID()}/learning-progress`, impersonated, {
        revision: randomUUID(),
        answers: {},
        hintsUsed: 0,
        positionSeconds: null,
      })
    ).status,
  ).toBe(403)
  // Without the support marker the same child joins the open reception normally.
  await live.control(actor, sessions[0]!.id, undefined, { kind: 'open-lobby' })
  expect((await send(`${base}/join`, child, join)).status).toBe(200)
})
