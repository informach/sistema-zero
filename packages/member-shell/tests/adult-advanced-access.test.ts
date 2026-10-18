import { describe, expect, mock, test } from 'bun:test'
import { InMemoryRateLimiter } from '@sistemazero/core/security'
import type { SessionUser } from '../src/lib/types'
import type { CallOpts, GatewayResponse } from '../src/server/gateway'

mock.module('server-only', () => ({}))
const { createMembersClient } = await import('../src/server/clients')
const { createGatewayModule } = await import('../src/server/gateway')
const { createVoiceRoutes } = await import('../src/routes/voice')
const user: SessionUser = {
  id: crypto.randomUUID(),
  email: 'qa@example.invalid',
  firstName: 'QA',
  lastName: '',
  role: 'customer',
  status: 'active',
}
const actor = { accountId: user.id, userId: user.id, privileged: false }
function client(audience: 'adult' | 'kids', supportsAdult: boolean) {
  const calls: { path: string; options: CallOpts }[] = []
  async function read<T>(path: string, options: CallOpts = {}): Promise<GatewayResponse<T>> {
    calls.push({ path, options })
    return { status: 200, body: { ...(supportsAdult ? { audience: 'adult' } : {}), ok: true } as T }
  }
  const gateway = {
    ...createGatewayModule({} as never),
    gatewayFetch: read,
    gatewayFetchReadonly: read,
    gatewayFetchHmac: read,
  }
  return { members: createMembersClient(gateway, { audience }), calls }
}
describe('adult advanced services keep Kids contracts and reject older backends before mutation', () => {
  test('an old backend receives only the read-only ledger probe, never adult dispatch', async () => {
    const { members, calls } = client('adult', false)
    expect(
      (
        await members.studioAiUsage(actor, {
          operation: 'dispatch',
          runId: crypto.randomUUID(),
          attempt: 1,
        })
      ).status,
    ).toBe(503)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.options.body).toEqual({
      actor: { ...actor, audience: 'adult' },
      action: { operation: 'costs' },
    })
  })
  test('a compatible backend receives the probe and the signed adult dispatch', async () => {
    const { members, calls } = client('adult', true)
    expect(
      (
        await members.studioAiUsage(actor, {
          operation: 'dispatch',
          runId: crypto.randomUUID(),
          attempt: 1,
        })
      ).status,
    ).toBe(200)
    expect(calls).toHaveLength(2)
    expect(calls[1]?.options.body).toMatchObject({
      actor: { ...actor, audience: 'adult' },
      action: { operation: 'dispatch' },
    })
  })
  test('Kids dispatch keeps the original single request and unmodified actor', async () => {
    const { members, calls } = client('kids', false)
    expect(
      (
        await members.studioAiUsage(actor, {
          operation: 'dispatch',
          runId: crypto.randomUUID(),
          attempt: 1,
        })
      ).status,
    ).toBe(200)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.options.body).toMatchObject({ actor })
    expect((calls[0]?.options.body as { actor: object }).actor).not.toHaveProperty('audience')
  })
  test('old builder backend cannot delete the Kids project through an adult request', async () => {
    const { members, calls } = client('adult', false)
    expect(
      (await members.studioBuilder(actor, { operation: 'remove-project', projectId: 'shared-id' }))
        .status,
    ).toBe(503)
    expect(calls.map((item) => item.path)).toEqual([
      '/members/internal/studio-ai/builder/availability?audience=adult',
    ])
  })
  test('adult tutor history uses a stable opaque project identity while Kids keeps its ID', async () => {
    const adult = client('adult', true),
      kids = client('kids', false)
    await adult.members.zappyHistory('same-project')
    await adult.members.zappyDeleteHistory('same-project')
    await kids.members.zappyHistory('same-project')
    const adultId = adult.calls[0]?.options.query?.projectId
    expect(adultId).toMatch(/^adult-[a-f0-9]{64}$/)
    expect(adult.calls[1]?.options.query?.projectId).toBe(adultId)
    expect(kids.calls[0]?.options.query?.projectId).toBe('same-project')
  })
})
test('adult voice reads own opt-in on every request and never queries a child profile', async () => {
  let enabled = true,
    advanced = true,
    transcriptions = 0
  const routes = createVoiceRoutes({
    audience: 'adult',
    session: { getSession: async () => user },
    auth: {
      getMyProfile: async () => {
        throw new Error('Adult must not use parental profile consent')
      },
    },
    members: {
      getGamification: async () =>
        ({ status: 200, body: { journey: { capabilities: advanced ? ['ai'] : [] } } }) as never,
      getAdultProfileReadonly: async () =>
        ({ status: 200, body: { voiceEnabled: enabled } }) as never,
    },
    configured: () => true,
    limits: () => ({
      minute: new InMemoryRateLimiter(6, 60000),
      hour: new InMemoryRateLimiter(40, 3600000),
      global: new InMemoryRateLimiter(600, 3600000),
      inflight: new Set(),
    }),
    transcribe: async () => {
      transcriptions++
      return { text: 'Meu jogo', model: 'qa/local' }
    },
  })
  const request = () => {
    const bytes = new Uint8Array(4096)
    bytes.set([0x1a, 0x45, 0xdf, 0xa3])
    return new Request('https://adult.test/api/voice/transcribe', {
      method: 'POST',
      headers: { 'content-type': 'audio/webm', 'x-sz-viewer': user.id },
      body: bytes,
    })
  }
  expect((await routes.voiceTranscribe.POST(request())).status).toBe(200)
  enabled = false
  expect((await routes.voiceTranscribe.POST(request())).status).toBe(403)
  enabled = true
  advanced = false
  expect((await routes.voiceTranscribe.POST(request())).status).toBe(403)
  expect(transcriptions).toBe(1)
})
