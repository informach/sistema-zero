import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { Elysia } from 'elysia'
import { ReadProfileCohortService } from '../../src/application/internal/read-profile-cohort.service'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { profileCohortRoutes } from '../../src/interfaces/http/routes/profile-cohort.routes'
import { InMemoryProfileRepository, silentLogger } from '../fakes/in-memory'
import { InMemoryProfileCohortRepository } from '../fakes/profile-cohort'

const token = 'dedicated-fixture-internal-token'
function setup(internalToken: string | undefined = token) {
  const profiles = new InMemoryProfileRepository()
  const app = new Elysia()
    .onError(({ code, error, set }) => {
      const response = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = response.status
      return response.body
    })
    .use(
      profileCohortRoutes({
        read: new ReadProfileCohortService(new InMemoryProfileCohortRepository(profiles)),
        internalToken,
      }),
    )
  return { profiles, app }
}
function request(body: unknown, headers: Record<string, string> = { 'x-internal-token': token }) {
  return new Request('http://localhost/auth/internal/kids-journey/profile-cohort', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

test('cohort requires a configured/correct internal token and rejects human identity', async () => {
  const { app } = setup()
  const headerCases: Record<string, string>[] = [
    {},
    { 'x-internal-token': 'incorrect' },
    { 'x-internal-token': token, 'x-auth-user-id': randomUUID() },
  ]
  for (const headers of headerCases) {
    expect((await app.handle(request({ kind: 'start', limit: 200 }, headers))).status).toBe(401)
  }
  // Explicit undefined exercises missing configuration (not the setup default parameter).
  const absent = new Elysia()
    .onError(({ set }) => {
      set.status = 401
    })
    .use(
      profileCohortRoutes({
        read: new ReadProfileCohortService(
          new InMemoryProfileCohortRepository(new InMemoryProfileRepository()),
        ),
        internalToken: undefined,
      }),
    )
  expect((await absent.handle(request({ kind: 'start', limit: 200 }))).status).toBe(401)
})

test('cohort exports minimal pairs for archived and pending profiles without XP', async () => {
  const { app, profiles } = setup()
  const pending = ProfileAggregate.create({
    birthDate: '2016-05-10',
    id: randomUUID(),
    accountUserId: randomUUID(),
    name: 'Pendente',
  })
  const archived = ProfileAggregate.create({
    birthDate: '2016-05-10',
    id: randomUUID(),
    accountUserId: randomUUID(),
    name: 'Arquivado',
  })
  archived.archive()
  profiles.seed(pending)
  profiles.seedReady(archived)
  const response = await app.handle(request({ kind: 'start', limit: 200 }))
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  const body = (await response.json()) as { done: boolean; owners: unknown[] }
  expect(body.done).toBe(true)
  expect(body.owners).toEqual(
    [pending, archived]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((profile) => ({ profileId: profile.id, accountUserId: profile.accountUserId })),
  )
})

test('cohort refuses oversized pages and a cursor beyond its bound', async () => {
  const { app } = setup()
  expect((await app.handle(request({ kind: 'start', limit: 201 }))).status).toBe(400)
  expect(
    (
      await app.handle(
        request({
          kind: 'continue',
          upperBound: '10000000-0000-4000-8000-000000000000',
          cursor: '20000000-0000-4000-8000-000000000000',
          limit: 1,
        }),
      )
    ).status,
  ).toBe(400)
})

test('cohort continuation preserves existing hex-format profile IDs and normalizes the work bound', async () => {
  const { app, profiles } = setup()
  const profileId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    accountUserId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  profiles.seedReady(
    ProfileAggregate.create({
      birthDate: '2016-05-10',
      id: profileId,
      accountUserId,
      name: 'Perfil existente',
    }),
  )
  const response = await app.handle(
    request({ kind: 'continue', upperBound: profileId.toUpperCase(), cursor: null, limit: 1 }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    upperBound: profileId,
    cursor: profileId,
    done: true,
    owners: [{ profileId, accountUserId }],
  })
})
