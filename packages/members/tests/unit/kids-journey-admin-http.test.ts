import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import { Elysia } from 'elysia'
import { KidsJourneyConfigurationService } from '../../src/application/kids-journey/kids-journey-configuration.service'
import type { KidsJourneyPreparation } from '../../src/domain/ports/kids-journey-repository.port'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { kidsJourneyRoutes } from '../../src/interfaces/http/routes/kids-journey.routes'
import { silentLogger } from '../fakes/in-memory'

const actorId = randomUUID(),
  preparationId = randomUUID()
const token = 'kids-policy-admin-fixture-token'
const policy = initialKidsJourneyPolicy()
function app(options: { token?: string; conflict?: boolean } = {}) {
  const writes: unknown[] = []
  let reads = 0
  const current: KidsJourneyPreparation = {
    id: preparationId,
    expectedVersion: 1,
    sourcePolicy: policy,
    candidatePolicy: policy,
    draftHash: 'a'.repeat(64),
    catalogHash: 'b'.repeat(64),
    cohortHash: 'c'.repeat(64),
    origin: 'configuration',
    captureStage: 'done',
    captureCursor: null,
    authCapture: null,
    catalog: [],
    cursor: null,
    upperBound: null,
    processed: 0,
    status: 'ready',
    actorKind: 'user',
    actorId,
    reason: 'Ajuste pedagógico',
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }
  type Port = ConstructorParameters<typeof KidsJourneyConfigurationService>[0]
  const repository: Port = {
    async readSnapshot() {
      reads++
      return {
        policy: { phase: 'published', version: 1, policy, updatedAt: new Date(0) },
        catalog: [],
        profiles: new Map(),
      }
    },
    async createPreparation(input) {
      writes.push(input)
      return { ...current, actorId: input.actor.kind === 'user' ? input.actor.id : null }
    },
    async getPreparation() {
      return current
    },
    async advanceCapture() {
      throw new Error('Unexpected capture')
    },
    async advancePreparation() {
      throw new Error('Unexpected baseline')
    },
    async publishPrepared(input) {
      writes.push(input)
      return options.conflict
        ? null
        : { phase: 'published', version: 2, policy, updatedAt: new Date(0) }
    },
    async listHistory() {
      return []
    },
  }
  const service = new KidsJourneyConfigurationService(repository)
  const server = new Elysia()
    .onError(({ code, error, set }) => {
      const result = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = result.status
      return result.body
    })
    .use(kidsJourneyRoutes({ service, internalToken: options.token ?? token }))
  return {
    writes,
    reads: () => reads,
    request(path: string, method = 'GET', body?: unknown, overrides: Record<string, string> = {}) {
      return server.handle(
        new Request(`http://localhost/members/admin/journey/kids${path}`, {
          method,
          headers: {
            'content-type': 'application/json',
            'x-internal-token': token,
            'x-auth-user-id': actorId,
            'x-auth-user-role': 'admin',
            'x-auth-user-status': 'active',
            ...overrides,
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      )
    },
  }
}
const draft = { expectedVersion: 1, policy, reason: 'Ajuste pedagógico' }
const publication = {
  expectedVersion: 1,
  draftHash: 'a'.repeat(64),
  catalogHash: 'b'.repeat(64),
  cohortHash: 'c'.repeat(64),
}

test('policy edit permission is derived from the same trusted own-account guard as mutations', async () => {
  const fixture = app()
  for (const role of ['admin', 'superadmin']) {
    const response = await fixture.request('', 'GET', undefined, { 'x-auth-user-role': role })
    expect(response.status).toBe(200)
    expect(await response.json()).toHaveProperty('permissions.canEdit', true)
  }
  const readonly: Record<string, string>[] = [
    { 'x-auth-user-role': 'staff' },
    { 'x-auth-account-id': actorId },
    { 'x-auth-profile-name': 'Perfil' },
    { 'x-auth-kids-context': 'parent' },
    { 'x-auth-kids-context': 'student' },
    { 'x-auth-impersonator-id': actorId },
    { 'x-auth-impersonation-mode': 'write' },
  ]
  for (const headers of readonly) {
    const response = await fixture.request('', 'GET', undefined, headers)
    expect(response.status).toBe(200)
    expect(await response.json()).toHaveProperty('permissions.canEdit', false)
  }
  expect(fixture.writes).toEqual([])
})

test('global mutations reject staff/customer, inactive accounts, profiles and support before persistence', async () => {
  const fixture = app()
  const cases: Record<string, string>[] = [
    { 'x-auth-user-role': 'staff' },
    { 'x-auth-user-role': 'customer' },
    { 'x-auth-user-status': 'blocked' },
    { 'x-auth-account-id': randomUUID() },
    { 'x-auth-account-id': actorId },
    { 'x-auth-profile-public': 'false' },
    { 'x-auth-profile-name': 'Perfil' },
    { 'x-auth-kids-context': 'parent' },
    { 'x-auth-kids-context': 'student' },
    { 'x-auth-impersonator-id': randomUUID() },
    { 'x-auth-impersonation-mode': 'write' },
  ]
  for (const headers of cases) {
    expect((await fixture.request('/preparations', 'POST', draft, headers)).status).toBe(403)
    expect(
      (
        await fixture.request(
          `/preparations/${preparationId}/publish`,
          'POST',
          publication,
          headers,
        )
      ).status,
    ).toBe(403)
  }
  expect(fixture.writes).toEqual([])
  expect(fixture.reads()).toBe(0)
})

test('staff can read policy/history and preview without publishing or freezing a child', async () => {
  const fixture = app()
  const headers = { 'x-auth-user-role': 'staff' }
  expect((await fixture.request('', 'GET', undefined, headers)).status).toBe(200)
  expect((await fixture.request('/history', 'GET', undefined, headers)).status).toBe(200)
  const response = await fixture.request(
    '/preview',
    'POST',
    { expectedVersion: 1, policy },
    headers,
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(fixture.writes).toEqual([])
})

test('admin/superadmin publication records only the actor from trusted identity, ignoring caller actor fields', async () => {
  for (const role of ['admin', 'superadmin']) {
    const fixture = app()
    const response = await fixture.request(
      `/preparations/${preparationId}/publish`,
      'POST',
      {
        ...publication,
        actorId: randomUUID(),
        actor: { kind: 'system' },
      },
      { 'x-auth-user-role': role },
    )
    expect(response.status).toBe(200)
    expect(fixture.writes).toEqual([
      {
        preparationId,
        ...publication,
        actor: { kind: 'user', id: actorId },
      },
    ])
  }
})

test('missing configuration/wrong S2S origin fail closed and a stale CAS reports409', async () => {
  expect((await app({ token: '' }).request('')).status).toBe(401)
  const fixture = app()
  expect(
    (await fixture.request('', 'GET', undefined, { 'x-internal-token': 'incorrect' })).status,
  ).toBe(401)
  expect(fixture.reads()).toBe(0)
  const conflicted = app({ conflict: true })
  expect(
    (await conflicted.request(`/preparations/${preparationId}/publish`, 'POST', publication))
      .status,
  ).toBe(409)
})
