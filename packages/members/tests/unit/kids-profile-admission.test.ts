import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import { Elysia } from 'elysia'
import { KidsProfileAdmissionService } from '../../src/application/kids-journey/kids-profile-admission.service'
import type {
  KidsJourneyOwner,
  KidsJourneyPolicyRecord,
} from '../../src/domain/ports/kids-journey-repository.port'
import { loadEnv } from '../../src/infrastructure/config/env'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { kidsProfileAdmissionRoutes } from '../../src/interfaces/http/routes/kids-profile-admission.routes'
import { silentLogger } from '../fakes/in-memory'

const token = 'profile-admission-test-credential'
const owner = { userId: randomUUID(), accountId: randomUUID() }
function app(expected: string | undefined = token, published = true) {
  const calls: KidsJourneyOwner[] = []
  const service = new KidsProfileAdmissionService({
    async initializeProfile(input): Promise<KidsJourneyPolicyRecord | null> {
      calls.push({ ...input })
      return published
        ? {
            phase: 'published',
            version: 1,
            policy: initialKidsJourneyPolicy(),
            updatedAt: new Date(),
          }
        : null
    },
  })
  const server = new Elysia()
    .onError(({ code, error, set }) => {
      const response = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = response.status
      return response.body
    })
    .use(kidsProfileAdmissionRoutes({ service, admissionToken: expected }))
  return {
    calls,
    request(body: unknown = owner, headers: Record<string, string> = {}) {
      return server.handle(
        new Request('http://localhost/members/internal/kids-journey/admission', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: JSON.stringify(body),
        }),
      )
    },
  }
}

test('admission denies absent, incorrect and general internal credentials before initialization', async () => {
  const f = app()
  for (const provided of [undefined, 'wrong-credential', 'general-members-token']) {
    const response = await f.request(owner, provided ? { 'x-internal-token': provided } : {})
    expect(response.status).toBe(401)
  }
  expect(f.calls).toEqual([])
  const unconfigured = app('')
  expect((await unconfigured.request(owner, { 'x-internal-token': token })).status).toBe(401)
  expect(unconfigured.calls).toEqual([])
})

test('initializer accepts only canonical ownership and returns the materialized version', async () => {
  const f = app()
  const response = await f.request(owner, { 'x-internal-token': token })
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(await response.json()).toEqual({ ...owner, policyVersion: 1 })
  expect(f.calls).toEqual([owner])
})

test('human context is denied and caller-authored conquests are removed from the owner-only input', async () => {
  const f = app()
  expect(
    (await f.request(owner, { 'x-internal-token': token, 'x-auth-user-id': randomUUID() })).status,
  ).toBe(401)
  expect(f.calls).toEqual([])
  expect(
    (
      await f.request(
        { ...owner, capabilities: ['pro'], actorId: randomUUID() },
        { 'x-internal-token': token },
      )
    ).status,
  ).toBe(200)
  expect(f.calls).toEqual([owner])
})

test('initializing or fenced owner receives no admission ACK', async () => {
  const f = app(token, false)
  const response = await f.request(owner, { 'x-internal-token': token })
  expect(response.status).toBe(202)
  expect(await response.json()).toEqual({ status: 'not_ready' })
})

test('Members production boot requires the separate admission binding', () => {
  const base = {
    NODE_ENV: 'production',
    DATABASE_URL: 'unused-local-contract',
    INTERNAL_API_TOKEN: 'internal-members-test-token',
    GATEWAY_HMAC_SECRET: 'gateway-hmac-secret-for-tests',
    CATALOG_INTERNAL_TOKEN: 'internal-catalog-test-token',
    CATALOG_BASE_URL: 'http://catalog.railway.internal:3003',
    AVATAR_PHOTO_URL_PREFIXES: 'https://cdn.example.test/avatars/',
  }
  expect(() => loadEnv(base)).toThrow(/MEMBERS_PROFILE_ADMISSION_TOKEN/)
  expect(() => loadEnv({ ...base, MEMBERS_PROFILE_ADMISSION_TOKEN: token })).not.toThrow()
})
