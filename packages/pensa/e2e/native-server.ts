// Local-only integration harness: the Pensa API, worker and database are real.
// Identity and paid model/storage boundaries are supplied by the test.
import { mock } from 'bun:test'
import { PensaJsonObjectSchema } from '@sistemazero/core/pensa'
import type { SessionUser } from '../../member-shell/src/lib/types'
import type { CallOpts, GatewayResponse } from '../../member-shell/src/server/gateway'
import {
  MissionCardsReplySchema,
  OutlineReplySchema,
} from '../../member-shell/src/server/pensa/contracts'
import type { completePensaJson } from '../../member-shell/src/server/pensa-llm'
import { GetCreationDownloadService } from '../../members/src/application/creations/creations.service'
import { DrizzleCreationsRepository } from '../../members/src/infrastructure/persistence/drizzle/creations.repository'
import { nativePensa } from '../../members/tests/db/pensa-native-fixture'
import { createEmptyProject } from '../../studio/src/core/project'

mock.module('server-only', () => ({}))
const { createPensaClient } = await import('../../member-shell/src/server/pensa-client')
const { createPensaRoutes } = await import('../../member-shell/src/routes/pensa')
const { loadPensaContext } = await import('../../member-shell/src/server/pensa/context')
const { workPensa } = await import('../../member-shell/src/server/pensa/planning')

const fixture = await nativePensa('pensa_browser', true, true)
const downloads = new GetCreationDownloadService(new DrizzleCreationsRepository(fixture.conn.db))
const user: SessionUser = {
  id: fixture.actor.profileId,
  email: '',
  firstName: 'QA',
  lastName: '',
  role: 'admin',
  status: 'active',
  activeProfile: { accountId: fixture.actor.accountId },
}
const files = new Map<string, unknown>()
async function gateway<T>(path: string, opts: CallOpts = {}): Promise<GatewayResponse<T>> {
  const url = new URL(path, 'http://members.local')
  for (const [key, value] of Object.entries(opts.query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }
  const response = await fixture.app.handle(
    new Request(url, {
      method: opts.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': fixture.deps.internalToken,
        'x-consumer-id': 'member-shell',
        'x-auth-user-id': user.id,
        'x-auth-account-id': fixture.actor.accountId,
        'x-auth-user-role': user.role,
        'x-auth-user-status': 'active',
      },
      ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
    }),
  )
  return { status: response.status, body: await response.json() }
}
const members = {
  ...createPensaClient({ gatewayFetch: gateway, gatewayFetchHmac: gateway }),
  getAiCredits: async () => ({
    status: 200,
    body: await fixture.deps.credits.execute(fixture.actor.accountId, true),
  }),
  getGamification: async () => ({
    status: 200,
    body: await fixture.deps.getGamification.execute(user.id, fixture.actor.accountId, {
      audience: 'kids',
    }),
  }),
  zappyKnowledgeSearch: async () => ({ status: 200, body: { hits: [] } }),
  getMyCourseReadonly: async () => {
    throw new Error('No course is used in this scenario')
  },
}
const readGame = async (key: string) => {
  if (!files.has(key)) throw new Error('The authorized storage object is missing')
  return files.get(key)
}
const context: typeof loadPensaContext = (client, viewer, actor, projectId, query) =>
  loadPensaContext(client, viewer, actor, projectId, query, readGame)
const outline = OutlineReplySchema.parse({
  runtimeExtensionId: 'game-2d-advanced',
  stages: [{ key: 's1', title: 'Construir e conferir' }],
  missions: [
    {
      key: 'm1',
      kind: 'setup',
      title: 'Prepare o jogo',
      objective: 'Instale a extensão para este jogo.',
      requirementKeys: [],
      dependencyKeys: [],
      scope: null,
    },
    {
      key: 'm2',
      kind: 'feature',
      title: 'Crie a partida',
      objective: 'Encontre quatro pares e jogue novamente.',
      requirementKeys: ['r1'],
      dependencyKeys: ['m1'],
      scope: null,
    },
    {
      key: 'm3',
      kind: 'playtest',
      title: 'Teste seu jogo',
      objective: 'Confira a partida inteira e o recomeço.',
      requirementKeys: [],
      dependencyKeys: ['m2'],
      scope: 'project',
    },
  ].map((mission) => ({
    ...mission,
    stageKey: 's1',
    destination: 'studio',
    assetKeys: [],
    blockIds: [],
    extensionIds: ['game-2d-advanced'],
    moldaToolIds: [],
    manualIds: ['game-2d-advanced'],
  })),
})
let providerCalls = 0
let failFirstProviderCall = true
const complete: typeof completePensaJson = async (options) => {
  providerCalls++
  if (failFirstProviderCall) {
    failFirstProviderCall = false
    throw new Error('The provider connection failed before returning the first reply')
  }
  const data = PensaJsonObjectSchema.parse(
    PensaJsonObjectSchema.parse(JSON.parse(options.user)).data,
  )
  const value =
    options.schemaName === 'pensa_definition'
      ? {
          title: fixture.definition.title,
          summary: fixture.definition.summary,
          playerExperience: fixture.definition.playerExperience,
          dimension: '2d',
          requirements: [
            {
              key: 'r1',
              text: fixture.definition.requirements[0]?.text,
              origin: 'child',
              category: 'gameplay',
            },
          ],
          removedRequirements: [],
          assetSlots: [],
          openChoices: [],
          futureIdeas: [],
          adaptations: [],
          pendingChoices: [],
        }
      : options.schemaName === 'pensa_outline'
        ? outline
        : options.schemaName === 'pensa_missions'
          ? {
              missions: OutlineReplySchema.shape.missions.parse(data.missions).map((mission) =>
                MissionCardsReplySchema.shape.missions.element.parse({
                  key: mission.key,
                  title: mission.title,
                  objective: mission.objective,
                  rules: [],
                  checks: [
                    {
                      key: 'works',
                      action: 'Experimente esta parte do jogo.',
                      expected: mission.objective,
                    },
                  ],
                  recommendation:
                    mission.kind === 'setup'
                      ? 'Use Jogo 2D Avançado para criar suas cartas.'
                      : null,
                }),
              ),
            }
          : {
              approved: true,
              issues: [],
              corrections: [],
              summary: 'O jogo inteiro está organizado.',
            }
  return options.schema.parse(value)
}
const pending = new Set<Promise<void>>()
const routes = createPensaRoutes({
  members,
  session: { getSession: async () => user },
  loadContext: context,
  worker: (input) => workPensa({ ...input, complete, loadContext: context }),
  schedule: (callback) => {
    const work = callback().finally(() => pending.delete(work))
    pending.add(work)
  },
}).pensa
let saveRevision = 0
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 5202,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/health') return Response.json({ ready: true })
    if (url.pathname === '/fixture')
      return Response.json({ viewerId: user.id, projectId: fixture.projectId })
    if (url.pathname === '/fixture/state')
      return Response.json({
        ...(await fixture.repo.get(fixture.actor, fixture.projectId)),
        providerCalls,
      })
    if (url.pathname === '/fixture/saved') {
      if (!saveRevision) return Response.json({ error: 'Save the game first' }, { status: 409 })
      const ticket = await downloads.execute(
        user.id,
        'studio',
        `pensa-${fixture.projectId.replaceAll('-', '')}`,
      )
      return Response.json({
        summary: {
          ...ticket.summary,
          itemUpdatedAt: ticket.summary.itemUpdatedAt.getTime(),
          syncedAt: ticket.summary.syncedAt.getTime(),
        },
        serverNow: Date.now(),
        json: JSON.stringify(files.get(ticket.storageKey)),
      })
    }
    if (url.pathname === '/fixture/save' && request.method === 'POST') {
      const ref = await fixture.savedGame(++saveRevision)
      const ticket = await downloads.execute(user.id, 'studio', ref.creationId)
      const project = createEmptyProject(ref.creationId, fixture.definition.title)
      project.installedExtensions = [
        { id: 'game-2d-advanced', version: '1.0.0', installedAt: Date.now() },
      ]
      files.set(ticket.storageKey, project)
      return Response.json({ ref, summary: ticket.summary })
    }
    if (!url.pathname.startsWith('/api/pensa/')) return new Response('Not found', { status: 404 })
    const method = request.method
    if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(method))
      return new Response(null, { status: 405 })
    const path = url.pathname.slice('/api/pensa/'.length).split('/')
    switch (method) {
      case 'GET':
        return routes.GET(request, { params: Promise.resolve({ path }) })
      case 'POST':
        return routes.POST(request, { params: Promise.resolve({ path }) })
      case 'PATCH':
        return routes.PATCH(request, { params: Promise.resolve({ path }) })
      case 'PUT':
        return routes.PUT(request, { params: Promise.resolve({ path }) })
      default:
        return routes.DELETE(request, { params: Promise.resolve({ path }) })
    }
  },
})
async function stop() {
  server.stop(true)
  await Promise.allSettled([...pending])
  await fixture.conn.close()
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
console.info('Native Pensa integration ready on 127.0.0.1:5202')
