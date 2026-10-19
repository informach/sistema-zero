import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { initialKidsJourneyPolicy, KIDS_CREATOR_CAPABILITIES } from '@sistemazero/core/journey'
import { Elysia } from 'elysia'
import { KidsJourneyQueryService } from '../../src/application/kids-journey/kids-journey-query.service'
import {
  KidsJourneyInitializingError,
  KidsJourneyUnavailableError,
} from '../../src/domain/kids-journey/kids-journey.errors'
import type {
  KidsJourneyOwner,
  KidsJourneySnapshot,
} from '../../src/domain/ports/kids-journey-repository.port'
import { resolveStudioFreeActor } from '../../src/interfaces/http/auth'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { kidsJourneyStaffPreviewRoutes } from '../../src/interfaces/http/routes/kids-journey-staff-preview.routes'
import { silentLogger } from '../fakes/in-memory'

const token = 'staff-preview-fixture-internal-token'
const id = randomUUID()
function app(input: { token?: string; snapshot?: KidsJourneySnapshot; failure?: Error } = {}) {
  const reads: KidsJourneyOwner[][] = []
  const query = new KidsJourneyQueryService({
    async readSnapshot(owners) {
      reads.push(owners.map((owner) => ({ ...owner })))
      if (input.failure) throw input.failure
      return (
        input.snapshot ?? {
          policy: {
            phase: 'published',
            version: 3,
            policy: initialKidsJourneyPolicy(),
            updatedAt: new Date(0),
          },
          catalog: [],
          profiles: new Map(),
        }
      )
    },
  })
  const server = new Elysia()
    .onError(({ code, error, set }) => {
      const result = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = result.status
      return result.body
    })
    .use(kidsJourneyStaffPreviewRoutes({ query, internalToken: input.token ?? token }))
  const headers: Record<string, string> = {
    'x-internal-token': token,
    'x-auth-user-id': id,
    'x-auth-user-role': 'staff',
    'x-auth-user-status': 'active',
  }
  return {
    reads,
    request(overrides: Record<string, string> = {}, method = 'GET') {
      return server.handle(
        new Request('http://localhost/members/journey/kids/staff-preview', {
          method,
          headers: { ...headers, ...overrides },
        }),
      )
    },
  }
}

test('the existing active team roles may inspect their own account, including parent context with no profile', async () => {
  const fixture = app()
  for (const role of ['staff', 'admin', 'superadmin'])
    for (const parent of [false, true]) {
      const headers: Record<string, string> = { 'x-auth-user-role': role }
      if (parent) headers['x-auth-kids-context'] = 'parent'
      const response = await fixture.request(headers)
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
      const body = await response.json()
      expect(body).toEqual({
        audience: 'kids',
        kind: 'staff-preview',
        policyVersion: 3,
        mode: 'active',
        tierAccess: initialKidsJourneyPolicy().tierAccess,
        capabilities: [...KIDS_CREATOR_CAPABILITIES],
        readiness: expect.any(Object),
      })
      expect(body).not.toHaveProperty('earned')
      expect(body).not.toHaveProperty('level')
    }
  expect(fixture.reads).toEqual(Array.from({ length: 6 }, () => []))
})

test('parent/customer roles, inactive staff and client flags cannot select the preview', async () => {
  const fixture = app()
  const cases: Record<string, string>[] = [
    { 'x-auth-user-role': 'customer', 'x-auth-kids-context': 'parent' },
    { 'x-auth-user-role': 'customer' },
    { 'x-auth-user-role': 'parent' },
    { 'x-auth-user-status': 'blocked' },
    { 'x-auth-user-role': 'arbitrary' },
  ]
  for (const headers of cases) expect((await fixture.request(headers)).status).toBe(403)
  expect(fixture.reads).toEqual([])
})

test('a profile, a third-party account, a student or either support mode is refused before reading policy', async () => {
  const fixture = app()
  const cases: Record<string, string>[] = [
    { 'x-auth-account-id': randomUUID() },
    { 'x-auth-account-id': id, 'x-auth-kids-context': 'parent' },
    { 'x-auth-kids-context': 'student' },
    { 'x-auth-profile-name': 'Perfil' },
    { 'x-auth-profile-public': 'false' },
    { 'x-auth-impersonator-id': randomUUID() },
    { 'x-auth-impersonation-mode': 'readonly' },
    { 'x-auth-impersonation-mode': 'write' },
  ]
  for (const headers of cases) expect((await fixture.request(headers)).status).toBe(403)
  expect(fixture.reads).toEqual([])
})

test('an absent/incorrect S2S configuration or identity never turns raw role headers into privilege', async () => {
  const absent = app({ token: '' })
  expect((await absent.request()).status).toBe(401)
  expect(absent.reads).toEqual([])
  const fixture = app()
  expect((await fixture.request({ 'x-internal-token': 'incorrect' })).status).toBe(401)
  expect((await fixture.request({ 'x-auth-user-id': '' })).status).toBe(401)
  expect(fixture.reads).toEqual([])
})

test('initializing/unavailable policy is explicit and the preview has no mutation method', async () => {
  for (const failure of [new KidsJourneyInitializingError(), new KidsJourneyUnavailableError()]) {
    const fixture = app({ failure })
    const response = await fixture.request()
    expect(response.status).toBe(503)
    expect(await response.json()).not.toHaveProperty('capabilities')
  }
  const fixture = app()
  expect((await fixture.request({}, 'POST')).status).toBe(404)
  expect(fixture.reads).toEqual([])
})

test('Free Studio uses the same own-account team boundary as explicit preview', () => {
  const own = { 'x-auth-user-id': id, 'x-auth-user-role': 'staff', 'x-auth-user-status': 'active' }
  for (const role of ['staff', 'admin', 'superadmin'])
    for (const parent of [false, true]) {
      const headers: Record<string, string> = { ...own, 'x-auth-user-role': role }
      if (parent) headers['x-auth-kids-context'] = 'parent'
      expect(resolveStudioFreeActor(headers, 'kids')).toMatchObject({
        userId: id,
        accountId: id,
        privileged: true,
      })
    }
  for (const headers of [
    { 'x-auth-account-id': id },
    { 'x-auth-account-id': randomUUID() },
    { 'x-auth-profile-name': 'Perfil' },
    { 'x-auth-profile-public': 'false' },
    { 'x-auth-kids-context': 'student' },
    { 'x-auth-impersonator-id': randomUUID() },
    { 'x-auth-impersonation-mode': 'readonly' },
    { 'x-auth-impersonation-mode': 'write' },
  ])
    expect(() => resolveStudioFreeActor({ ...own, ...headers }, 'kids')).toThrow('conta da equipe')
  expect(() =>
    resolveStudioFreeActor(
      { ...own, 'x-auth-user-role': 'customer', 'x-auth-kids-context': 'parent' },
      'kids',
    ),
  ).toThrow('perfil de estudante')
})
