import { expect, test } from 'bun:test'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import { KidsJourneyConfigurationService } from '../../src/application/kids-journey/kids-journey-configuration.service'
import type {
  KidsJourneyPreparation,
  KidsJourneySnapshot,
} from '../../src/domain/ports/kids-journey-repository.port'
import { buildApp } from '../helpers'

const actorId = '11111111-1111-4111-8111-111111111111'
const preparationId = '22222222-2222-4222-8222-222222222222'
const token = 'kids-composition-fixture-token'
const policy = initialKidsJourneyPolicy()

function fixture(initializing = false) {
  const writes: unknown[] = []
  const preparation: KidsJourneyPreparation = {
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
  const snapshot: KidsJourneySnapshot = {
    policy: initializing
      ? { phase: 'initializing', version: 0, policy, updatedAt: new Date(0) }
      : { phase: 'published', version: 1, policy, updatedAt: new Date(0) },
    catalog: [],
    profiles: new Map(),
  }
  const configuration = new KidsJourneyConfigurationService({
    async readSnapshot() {
      return snapshot
    },
    async createPreparation(input) {
      writes.push(input)
      return preparation
    },
    async getPreparation() {
      return preparation
    },
    async advanceCapture() {
      throw new Error('Unexpected capture')
    },
    async advancePreparation() {
      throw new Error('Unexpected materialization')
    },
    async publishPrepared(input) {
      writes.push(input)
      return { phase: 'published', version: 2, policy, updatedAt: new Date(0) }
    },
    async listHistory() {
      return []
    },
  })
  const options = {
    internalToken: token,
    requireAdmin: true,
    kidsJourneyConfiguration: configuration,
  }
  const { app } = buildApp(options)
  return {
    writes,
    request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
      return app.handle(
        new Request(`http://localhost/members/admin/journey/kids${path}`, {
          method,
          headers: {
            'content-type': 'application/json',
            'x-internal-token': token,
            'x-auth-user-id': actorId,
            'x-auth-user-role': 'admin',
            'x-auth-user-status': 'active',
            ...headers,
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      )
    },
  }
}

test('the composed Members server exposes the seven configuration actions and preserves trusted publication actor', async () => {
  const current = fixture()
  const response = await current.request('')
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ phase: 'published', version: 1, policy })
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect((await current.request('/history')).status).toBe(200)
  expect((await current.request('/preview', 'POST', { expectedVersion: 1, policy })).status).toBe(
    200,
  )
  expect(current.writes).toEqual([])
  expect(
    (
      await current.request('/preparations', 'POST', {
        expectedVersion: 1,
        policy,
        reason: 'Ajuste',
      })
    ).status,
  ).toBe(200)
  expect((await current.request(`/preparations/${preparationId}`)).status).toBe(200)
  expect((await current.request(`/preparations/${preparationId}/advance`, 'POST')).status).toBe(200)
  expect(
    (
      await current.request(`/preparations/${preparationId}/publish`, 'POST', {
        expectedVersion: 1,
        draftHash: 'a'.repeat(64),
        catalogHash: 'b'.repeat(64),
        cohortHash: 'c'.repeat(64),
      })
    ).status,
  ).toBe(200)
  expect(current.writes).toHaveLength(2)
  expect(current.writes[1]).toMatchObject({ actor: { kind: 'user', id: actorId } })
})

test('composed configuration denies untrusted origin and non-own mutation identities before writing', async () => {
  const current = fixture()
  expect(
    (await current.request('', 'GET', undefined, { 'x-internal-token': 'wrong' })).status,
  ).toBe(401)
  const identities: Record<string, string>[] = [
    { 'x-auth-user-role': 'staff' },
    { 'x-auth-user-role': 'customer' },
    { 'x-auth-user-status': 'blocked' },
    { 'x-auth-account-id': actorId },
    { 'x-auth-profile-name': 'Criança' },
    { 'x-auth-impersonator-id': preparationId },
    { 'x-auth-kids-context': 'parent' },
  ]
  for (const headers of identities)
    expect(
      (
        await current.request(
          '/preparations',
          'POST',
          {
            expectedVersion: 1,
            policy,
            reason: 'Ajuste',
          },
          headers,
        )
      ).status,
    ).toBe(403)
  expect(
    (await current.request('', 'GET', undefined, { 'x-auth-user-role': 'staff' })).status,
  ).toBe(200)
  expect(current.writes).toEqual([])
})

test('composed initializing policy remains explicit and cannot preview or prepare a published replacement', async () => {
  const current = fixture(true)
  const response = await current.request('')
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ phase: 'initializing', version: 0 })
  expect((await current.request('/preview', 'POST', { expectedVersion: 1, policy })).status).toBe(
    503,
  )
  expect(
    (
      await current.request('/preparations', 'POST', {
        expectedVersion: 1,
        policy,
        reason: 'Ajuste',
      })
    ).status,
  ).toBe(503)
  expect(current.writes).toEqual([])
})
