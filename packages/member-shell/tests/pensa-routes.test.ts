import { expect, mock, test } from 'bun:test'
import {
  PensaMissionHandoffSchema,
  PensaProjectRevisionSchema,
  PensaProjectViewSchema,
} from '@sistemazero/core/pensa'
import { createEmptyProject } from '@sistemazero/studio/project'
import type { SessionUser } from '../src/lib/types'
import {
  PENSA_ACTOR,
  PENSA_DATE,
  PENSA_USER,
  pensaContext,
  pensaContextMembers,
  pensaDefinition,
  pensaId,
} from './pensa-fixtures'

mock.module('server-only', () => ({}))
const { createPensaRoutes } = await import('../src/routes/pensa')
const { createPensaClient } = await import('../src/server/pensa-client')
const { inspectPensaGame } = await import('../src/server/pensa/inspection')

function fixture(user: SessionUser | null = PENSA_USER) {
  const context = pensaContext()
  const unexpected = async (): Promise<never> => {
    throw new Error('Unexpected upstream request')
  }
  const members = {
    ...createPensaClient({ gatewayFetch: unexpected, gatewayFetchHmac: unexpected }),
    ...pensaContextMembers(context),
    getGamification: unexpected,
    getAiCredits: unexpected,
  }
  const scheduled: Array<() => Promise<void>> = []
  const route = createPensaRoutes({
    members,
    session: { getSession: async () => user },
    loadContext: async () => context,
    worker: unexpected,
    schedule: (callback) => {
      scheduled.push(callback)
    },
  }).pensa
  const request = (
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
    path: string[],
    body?: unknown,
    viewer = PENSA_USER.id,
    extra: Record<string, string> = {},
  ) =>
    route[method](
      new Request(`https://kids.test/api/pensa/${path.join('/')}`, {
        method,
        headers: { 'x-sz-viewer': viewer, ...extra },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      { params: Promise.resolve({ path }) },
    )
  return { context, members, scheduled, request, route }
}

test('message history preserves the authenticated project and cursor without starting work', async () => {
  const f = fixture()
  let calls = 0
  f.members.pensaMessages = async (id, query) => {
    calls++
    expect(id).toBe(pensaId(1))
    expect(query).toEqual({ limit: 1, cursor: pensaId(30) })
    return { status: 200, body: { items: [], nextCursor: null } }
  }
  const get = (limit: number) =>
    f.route.GET(
      new Request(
        `https://kids.test/api/pensa/projects/${pensaId(1)}/messages?limit=${limit}&cursor=${pensaId(30)}`,
        { headers: { 'x-sz-viewer': PENSA_USER.id } },
      ),
      { params: Promise.resolve({ path: ['projects', pensaId(1), 'messages'] }) },
    )
  const response = await get(1)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ items: [], nextCursor: null })
  expect((await get(0)).status).toBe(400)
  expect(calls).toBe(1)
  expect(f.scheduled).toHaveLength(0)
})

test('the browser cannot swap actor, bypass a profile switch or mutate during read-only support', async () => {
  expect((await fixture(null).request('GET', ['projects'])).status).toBe(401)
  expect((await fixture().request('GET', ['projects'], undefined, pensaId(70))).status).toBe(409)
  const readonly = fixture({ ...PENSA_USER, act: { sub: pensaId(70), mode: 'readonly' } })
  expect(
    (
      await readonly.request('PATCH', ['projects', pensaId(1)], {
        requestId: pensaId(30),
        expectedMetadataRevision: 0,
        paused: true,
      })
    ).status,
  ).toBe(403)
  expect(
    (
      await fixture().request('PATCH', ['projects', pensaId(1)], {
        requestId: pensaId(30),
        expectedMetadataRevision: 0,
        actor: PENSA_ACTOR,
      })
    ).status,
  ).toBe(400)
})

test('project mutations normalize upstream base, team and status results into the canonical full view', async () => {
  const f = fixture()
  const { nextAction, availability, ...base } = f.context.view
  f.members.pensaUpdateProject = async () => ({ status: 200, body: base })
  f.members.pensaShareProject = async () => ({ status: 200, body: f.context.view.team })
  f.members.pensaDiscardDraft = async () => ({ status: 200, body: { discarded: true } })
  const responses = [
    await f.request('PATCH', ['projects', pensaId(1)], {
      requestId: pensaId(30),
      expectedMetadataRevision: 0,
      paused: true,
    }),
    await f.request('POST', ['projects', pensaId(1), 'share'], { requestId: pensaId(31) }),
    await f.request('DELETE', ['projects', pensaId(1), 'draft'], { requestId: pensaId(32) }),
  ]
  for (const response of responses)
    expect(PensaProjectViewSchema.parse(await response.json())).toEqual(f.context.view)
})

test('join preserves the durable request identity and rejects legacy or forged payload fields', async () => {
  const f = fixture()
  const joined: unknown[] = []
  f.members.pensaJoinProject = async (input) => {
    joined.push(input)
    return { status: 200, body: { projectId: pensaId(1) } }
  }
  const input = { requestId: pensaId(31), code: '123456' }
  expect((await f.request('POST', ['projects', 'join'], input)).status).toBe(200)
  expect(joined).toEqual([input])
  expect((await f.request('POST', ['projects', 'join'], { code: '123456' })).status).toBe(400)
  expect((await f.request('GET', ['v2', 'projects'])).status).toBe(404)
  expect(
    (await f.request('PATCH', ['projects', pensaId(1), 'extra', 'trailing'], input)).status,
  ).toBe(404)
})

test('oversized draft bodies are rejected before forwarding a partial candidate', async () => {
  const f = fixture()
  const response = await f.request('PATCH', ['projects', pensaId(1), 'draft'], {}, PENSA_USER.id, {
    'content-length': String(512 * 1024 + 1),
  })
  expect(response.status).toBe(413)
})

test('setup completion forwards facts from the validated saved game, never a browser verification flag', async () => {
  const f = fixture()
  const gameId = `pensa-${f.context.view.project.id.replaceAll('-', '')}`
  const project = createEmptyProject(gameId, 'Cartas')
  project.installedExtensions = [{ id: 'game-2d-advanced', version: '1.0.0', installedAt: 1 }]
  const inspected = await inspectPensaGame(
    {
      storageKey: 'private/authorized/saved.json',
      revision: 7,
      bytes: 100,
      summary: {
        tool: 'studio',
        itemId: gameId,
        name: 'Cartas',
        kind: 'studio',
        revision: 7,
        bytes: 100,
        itemUpdatedAt: PENSA_DATE,
        syncedAt: PENSA_DATE,
        thumb: null,
      },
    },
    gameId,
    async () => project,
  )
  const creation = {
    tool: 'studio' as const,
    profileId: PENSA_USER.id,
    creationId: gameId,
    saveRevision: inspected.saveRevision,
    contentFingerprint: inspected.contentFingerprint,
  }
  f.context.capabilities.observedGame = {
    creation,
    authoring: inspected.authoring,
    runtimeExtensionId: inspected.runtimeExtensionId,
    installedExtensionIds: inspected.installedExtensionIds,
    dimension: '2d',
  }
  f.context.view.revision = PensaProjectRevisionSchema.parse({
    id: pensaId(40),
    projectId: pensaId(1),
    number: 1,
    previousRevisionId: null,
    acceptedByProfileId: PENSA_USER.id,
    acceptedAt: PENSA_DATE,
    definition: pensaDefinition(),
    plan: {
      stages: [{ id: pensaId(41), title: 'Preparar', position: 0 }],
      missions: [
        {
          id: pensaId(42),
          stageId: pensaId(41),
          position: 0,
          contentRevision: 1,
          kind: 'setup',
          destination: 'studio',
          title: 'Prepare o jogo',
          objective: 'Instale a extensão do jogo.',
          requirementIds: [],
          dependencyIds: [],
          rules: [],
          checks: [
            {
              id: 'ready',
              action: 'Confira a extensão instalada.',
              expected: 'O jogo usa a extensão recomendada.',
            },
          ],
          setup: {
            type: 'extensions',
            authoring: 'blocks',
            runtimeExtensionId: 'game-2d-advanced',
            requiredAuxiliaryExtensionIds: [],
            recommendation: 'Use Jogo 2D Avançado.',
          },
        },
      ],
    },
    technical: {
      capabilitiesFingerprint: f.context.capabilities.fingerprint,
      catalogVersion: f.context.capabilities.catalogVersion,
      authoring: 'blocks',
      runtimeExtensionId: 'game-2d-advanced',
      extensions: [],
      missionResources: [],
      references: [],
    },
  })
  const handoff = PensaMissionHandoffSchema.parse({
    project: f.context.view.project,
    projectRevisionId: pensaId(40),
    mission: f.context.view.revision.plan.missions[0],
    progress: {
      missionId: pensaId(42),
      progressRevision: 0,
      status: 'planned',
      validity: 'current',
      assigneeProfileId: null,
      completedByProfileId: null,
      deliveries: [],
      verification: null,
      resumeNote: null,
      startedAt: null,
      completedAt: null,
    },
    availability: {
      missionId: pensaId(42),
      available: true,
      mode: 'build',
      reason: null,
      message: null,
      eligibleProfileIds: [PENSA_USER.id],
    },
    nextAction: { type: 'completed' },
    studioProjectId: gameId,
    studioAuthoring: 'blocks',
    team: f.context.view.team,
    assetSlots: [],
    extensions: [],
    references: [],
    gameCreation: creation,
    restoredSaveRevision: null,
  })
  const facts: unknown[] = []
  f.members.pensaMissionContext = async () => ({ status: 200, body: { projectId: pensaId(1) } })
  f.members.pensaCompleteMission = async (actor, id, input, capabilities, inspection) => {
    facts.push({ actor, id, input, capabilities, inspection })
    return { status: 200, body: handoff }
  }
  const input = {
    requestId: pensaId(50),
    baseRevisionId: pensaId(40),
    contentRevision: 1,
    expectedProgressRevision: 0,
    deliveries: [{ assetSlotId: null, creation }],
    confirmed: true,
    note: '',
  }
  expect((await f.request('POST', ['missions', pensaId(42), 'complete'], input)).status).toBe(200)
  expect(facts[0]).toMatchObject({
    actor: PENSA_ACTOR,
    inspection: { creation, installedExtensionIds: ['game-2d-advanced'] },
  })
  expect(
    (
      await f.request('POST', ['missions', pensaId(42), 'complete'], {
        ...input,
        configurationVerified: true,
      })
    ).status,
  ).toBe(400)
})
