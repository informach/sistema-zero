import { expect, mock, test } from 'bun:test'
import type { GatewayModule } from '../src/server/gateway'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'cover-client-test-secret-32-characters'
const { createHubClient } = await import('../src/server/clients')

test('cover reconciliation uses the signed gateway client for each audience', async () => {
  const calls: Array<{ path: string; query: unknown }> = []
  const gateway = {
    gatewayFetchHmac: async (path: string, opts: { query: unknown }) => {
      calls.push({ path, query: opts.query })
      return { status: 200, body: { status: 'hidden', coverImageUrl: null } }
    },
    gatewayFetch: () => {
      throw new Error('A user-session request cannot read hidden cover references')
    },
  } as unknown as GatewayModule
  const playId = crypto.randomUUID()
  expect(
    (await createHubClient(gateway, { audience: 'kids' }).resolveStudioCover(playId)).status,
  ).toBe(200)
  expect(
    (await createHubClient(gateway, { audience: 'adult' }).resolveStudioCover(playId)).status,
  ).toBe(200)
  expect(calls).toEqual([
    { path: `/hub/internal/studio-cover/${playId}`, query: { audience: 'kids' } },
    { path: `/hub/internal/studio-cover/${playId}`, query: { audience: 'adult' } },
  ])
})

test('moderation outbox drain uses the signed gateway client for each audience', async () => {
  const calls: Array<{ path: string; body: unknown; method: string }> = []
  const gateway = {
    gatewayFetchHmac: async (path: string, opts: { body: unknown; method: string }) => {
      calls.push({ path, body: opts.body, method: opts.method })
      return { status: 200, body: { attempted: 1 } }
    },
    gatewayFetch: () => {
      throw new Error('A user-session request cannot drain moderation cleanup')
    },
  } as unknown as GatewayModule
  expect(
    (await createHubClient(gateway, { audience: 'kids' }).drainStudioArtifactCleanups()).status,
  ).toBe(200)
  expect(
    (await createHubClient(gateway, { audience: 'adult' }).drainStudioArtifactCleanups()).status,
  ).toBe(200)
  expect(calls).toEqual([
    {
      path: '/hub/internal/studio-artifact-cleanups/drain',
      body: { audience: 'kids' },
      method: 'POST',
    },
    {
      path: '/hub/internal/studio-artifact-cleanups/drain',
      body: { audience: 'adult' },
      method: 'POST',
    },
  ])
})
