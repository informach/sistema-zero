import { expect, test } from 'bun:test'
import { createAuthProfileCohortGateway } from '../../src/infrastructure/gateways/auth-profile-cohort.gateway'

const first = '10000000-0000-4000-8000-000000000000'
const second = '20000000-0000-4000-8000-000000000000'
const owner = (profileId: string) => ({
  profileId,
  accountUserId: '30000000-0000-4000-8000-000000000000',
})
const query = { kind: 'continue' as const, upperBound: second, cursor: first, limit: 200 }
const page = { upperBound: second, cursor: second, done: true, owners: [owner(second)] }
function gateway(body: unknown) {
  return createAuthProfileCohortGateway({
    baseUrl: 'http://auth.test',
    internalToken: 'fixture-internal-token',
    timeoutMs: 500,
    fetchImpl: async () => Response.json(body),
  })
}

test('cohort gateway maps minimal Auth owner pairs, never grants or identity names', async () => {
  expect(await gateway(page).readPage(query)).toEqual({
    upperBound: second,
    cursor: second,
    done: true,
    owners: [{ userId: second, accountId: owner(second).accountUserId }],
  })
})
test('cohort gateway rejects changed bounds, regressing/duplicate cursors and false progress', async () => {
  for (const invalid of [
    { ...page, upperBound: first },
    { ...page, cursor: first },
    { ...page, owners: [owner(first), owner(second)] },
    { ...page, owners: [owner(second), owner(second)] },
    { ...page, cursor: first, owners: [], done: false },
  ])
    await expect(gateway(invalid).readPage(query)).rejects.toThrow()
})
test('cohort gateway treats missing configuration and remote failure as unavailable, never empty', async () => {
  const missing = createAuthProfileCohortGateway({
    baseUrl: undefined,
    internalToken: undefined,
    timeoutMs: 500,
    fetchImpl: async () => {
      throw new Error('Must not call fetch')
    },
  })
  await expect(missing.readPage({ kind: 'start', limit: 200 })).rejects.toThrow('not configured')
  const failed = createAuthProfileCohortGateway({
    baseUrl: 'http://auth.test',
    internalToken: 'fixture-internal-token',
    timeoutMs: 500,
    fetchImpl: async () => new Response(null, { status: 503 }),
  })
  await expect(failed.readPage({ kind: 'start', limit: 200 })).rejects.toThrow('503')
})
