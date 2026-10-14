import { expect, mock, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { Elysia } from 'elysia'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import {
  type PensaJourneyRoutesDeps,
  pensaJourneyRoutes,
} from '../../src/interfaces/http/routes/pensa-journey.routes'
import { silentLogger } from '../fakes/in-memory'

function app() {
  const calls = {
    get: mock(async () => ({ ok: true })),
    claim: mock(async () => null),
    create: mock(async () => ({ ok: true })),
    start: mock(async () => ({ ok: true })),
    publish: mock(async () => {}),
    fail: mock(async () => {}),
    protect: mock(async () => ({ ok: true })),
    voice: mock(async () => ({ status: 'generate', key: 'k' })),
  }
  const routes = pensaJourneyRoutes({
    service: calls,
    internalToken: 'trusted-gateway',
    accessCheck: { execute: async () => ({ grants: ['pensa'], communities: [] }) },
    getGamification: { execute: async () => ({ level: { slug: 'hacker' } }) },
  } as unknown as PensaJourneyRoutesDeps)
  // O mesmo mapeamento de erro do `server.ts`: o status que o member-shell recebe de verdade.
  const handler = new Elysia()
    .onError({ as: 'global' }, ({ code, error, set }) => {
      const { status, body } = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = status
      return body
    })
    .use(routes)
  return { handler, calls }
}

/**
 * Os headers que o gateway REALMENTE manda numa rota `hmac` sem `resign`/`passthrough`
 * (`request-transform.stage`): ele tira as credenciais de borda e reinjeta o consumer
 * autenticado como `x-consumer-id`, mais o `x-internal-token` do `membersInternalTransforms`.
 * Nenhum `x-auth-*` chega aqui: o worker não tem JWT.
 */
function gatewayHeaders(consumer = 'member-shell'): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-internal-token': 'trusted-gateway',
    'x-consumer-id': consumer,
  }
}

const internal = (path: string, body: unknown, headers = gatewayHeaders()) =>
  new Request(`http://localhost/members/internal/pensa/v2${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

test('leitura usa o perfil autenticado e não a identidade inventada na URL', async () => {
  const { handler, calls } = app(),
    profileId = randomUUID(),
    accountId = randomUUID(),
    projectId = randomUUID()
  const response = await handler.handle(
    new Request(
      `http://localhost/members/pensa/v2/projects/${projectId}?profileId=${randomUUID()}`,
      {
        headers: {
          'x-internal-token': 'trusted-gateway',
          'x-auth-user-id': profileId,
          'x-auth-account-id': accountId,
          'x-auth-user-role': 'student',
          'x-auth-user-status': 'active',
        },
      },
    ),
  )
  expect(response.status).toBe(200)
  expect(calls.get).toHaveBeenCalledWith({ profileId, accountId, privileged: false }, projectId)
})
test('worker recusa consumidor diferente e chamada pública sem o gateway', async () => {
  const { handler, calls } = app(),
    projectId = randomUUID(),
    operationId = randomUUID()
  const response = await handler.handle(
    internal(
      `/projects/${projectId}/operations/${operationId}/claim`,
      {
        actor: { profileId: randomUUID(), accountId: randomUUID(), privileged: true },
        leaseId: randomUUID(),
      },
      gatewayHeaders('another-service'),
    ),
  )
  expect(response.status).toBeGreaterThanOrEqual(400)
  expect(calls.claim).not.toHaveBeenCalled()
  const read = await handler.handle(
    new Request(`http://localhost/members/pensa/v2/projects/${projectId}`, {
      headers: { 'x-auth-user-id': randomUUID() },
    }),
  )
  expect(read.status).toBeGreaterThanOrEqual(400)
  expect(calls.get).not.toHaveBeenCalled()
})
test('o nome antigo do header (`x-auth-consumer-id`) não autentica o worker', async () => {
  // Regressão: a rota lia um header que o gateway nunca manda, então em staging/prod TODA
  // chamada do member-shell caía em 401 e só o teste (que injetava o header à mão) passava.
  const { handler, calls } = app(),
    projectId = randomUUID(),
    operationId = randomUUID()
  const response = await handler.handle(
    internal(
      `/projects/${projectId}/operations/${operationId}/claim`,
      {
        actor: { profileId: randomUUID(), accountId: randomUUID(), privileged: false },
        leaseId: randomUUID(),
      },
      {
        'content-type': 'application/json',
        'x-internal-token': 'trusted-gateway',
        'x-auth-consumer-id': 'member-shell',
      },
    ),
  )
  expect(response.status).toBe(401)
  expect(calls.claim).not.toHaveBeenCalled()
})
test('claim recebe ator do corpo assinado, sem exigir um JWT no worker', async () => {
  const { handler, calls } = app(),
    projectId = randomUUID(),
    operationId = randomUUID(),
    leaseId = randomUUID(),
    actor = { profileId: randomUUID(), accountId: randomUUID(), privileged: false }
  const response = await handler.handle(
    internal(`/projects/${projectId}/operations/${operationId}/claim`, { actor, leaseId }),
  )
  expect(response.status).toBe(200)
  expect(calls.claim).toHaveBeenCalledWith(actor, projectId, operationId, leaseId)
})
test('todas as rotas internas aceitam o member-shell com os headers do gateway', async () => {
  const { handler, calls } = app(),
    projectId = randomUUID(),
    operationId = randomUUID(),
    leaseId = randomUUID(),
    actor = { profileId: randomUUID(), accountId: randomUUID(), privileged: false }
  const operation = `/projects/${projectId}/operations/${operationId}`
  const requests: Array<[string, unknown]> = [
    [
      `/projects/${projectId}/start`,
      {
        actor,
        input: {
          id: randomUUID(),
          expectedRevision: 0,
          message: 'Um gato na lua',
          kind: 'planning',
          context: {},
        },
      },
    ],
    [`${operation}/claim`, { actor, leaseId }],
    [`${operation}/publish`, { actor, leaseId, result: { type: 'answer', text: 'Pronto!' } }],
    [`${operation}/fail`, { actor, leaseId, message: 'falhou' }],
    [`/projects/${projectId}/protect`, { actor, action: { type: 'commit', id: randomUUID() } }],
    ['/narrations', { actor, input: { type: 'claim', id: 'a'.repeat(64), chars: 10, leaseId } }],
  ]
  for (const [path, body] of requests) {
    const response = await handler.handle(internal(path, body))
    expect({ path, status: response.status }).toEqual({ path, status: 200 })
  }
  for (const call of [calls.start, calls.claim, calls.publish, calls.fail, calls.protect])
    expect(call).toHaveBeenCalledTimes(1)
  expect(calls.voice).toHaveBeenCalledTimes(1)
})
