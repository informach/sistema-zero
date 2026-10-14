import { describe, expect, test } from 'bun:test'
import { CloudflareSfuClient } from '../../src/infrastructure/live/cloudflare-sfu.client'
import { CloudflareSfuMediaProvider } from '../../src/infrastructure/live/cloudflare-sfu.provider'
import {
  canReceiveLivePublication,
  type LiveMediaAccess,
  type LiveMediaConnection,
  type LiveMediaRegistryPort,
} from '../../src/infrastructure/live/media-registry'

class Registry implements LiveMediaRegistryPort {
  entries = new Map<string, LiveMediaConnection>()
  async insert(connection: LiveMediaConnection) {
    for (const prior of this.entries.values())
      if (prior.actor.id === connection.actor.id) prior.status = 'retired'
    connection.generation = this.entries.size + 1
    this.entries.set(connection.id, connection)
    return structuredClone(connection)
  }
  async get(id: string) {
    const value = this.entries.get(id)
    return value ? structuredClone(value) : null
  }
  async list(id: string) {
    return [...this.entries.values()]
      .filter((item) => item.occurrenceId === id)
      .map((item) => structuredClone(item))
  }
  async mutate<T>(id: string, update: (connection: LiveMediaConnection) => T): Promise<T> {
    return update(this.entries.get(id)!)
  }
  leases = new Map<string, { holder: string; until: number }>()
  async tryLease(occurrenceId: string, holder: string, ttlMs: number) {
    const current = this.leases.get(occurrenceId)
    if (current && current.holder !== holder && current.until > Date.now()) return false
    this.leases.set(occurrenceId, { holder, until: Date.now() + ttlMs })
    return true
  }
  async releaseLease(occurrenceId: string, holder: string) {
    if (this.leases.get(occurrenceId)?.holder === holder) this.leases.delete(occurrenceId)
  }
}

const context = {
  actor: { id: 'teacher', accountId: 'teacher', name: 'Teacher', staff: true },
  occurrenceId: 'occurrence',
  deviceId: 'device',
}
const offer = {
  type: 'offer' as const,
  sdp: 'v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=mid:0\r\n',
}

function fixture(options: { creation?: Promise<void>; timeoutMs?: number } = {}) {
  const registry = new Registry()
  const requests: string[] = []
  let closed!: () => void
  const closure = new Promise<void>((resolve) => {
    closed = resolve
  })
  let reply: unknown = {
    tracks: [{ mid: '0' }],
    sessionDescription: { type: 'answer', sdp: 'answer' },
  }
  const sfu = new CloudflareSfuClient(
    { appId: 'test-app', appSecret: 'secret-never-exposed' },
    (async (url: string) => {
      requests.push(url)
      if (url.includes('sessions/new')) {
        await options.creation
        return Response.json({ sessionId: `sfu-${requests.length}` })
      }
      if (url.includes('tracks/new')) return Response.json(reply)
      if (url.includes('tracks/close')) {
        closed()
        return Response.json({ tracks: [{ mid: '0' }] })
      }
      if (url.includes('renegotiate')) return Response.json({})
      return Response.json({ tracks: [{ mid: '0' }] })
    }) as typeof fetch,
  )
  let access: LiveMediaAccess = {
    actorId: 'teacher',
    role: 'teacher',
    canPublishAudio: true,
    canPublishVideo: true,
    muteEpoch: 0,
    hardEndsAt: new Date(Date.now() + 60_000).toISOString(),
  }
  const supervisor = { register: async () => {}, renew: async () => {}, retire: async () => {} }
  const provider = new CloudflareSfuMediaProvider(
    sfu,
    registry,
    {
      authorize: async () => access,
      authorizeMany: async (_occurrence, entries) =>
        entries.map(() => ({ ok: true as const, access })),
    },
    supervisor,
    async () => [{ urls: 'stun:stun.cloudflare.com:3478' }],
    Date.now,
    options.timeoutMs ?? 12_000,
  )
  return {
    provider,
    registry,
    requests,
    closure,
    setReply: (value: unknown) => {
      reply = value
    },
    setAccess: (value: Partial<LiveMediaAccess>) => {
      access = { ...access, ...value }
    },
  }
}

describe('live media authorization and negotiation', () => {
  test('child screens are private to teachers, including the recorder', () => {
    const screen = {
      id: 's',
      actorId: 'child',
      role: 'learner' as const,
      kind: 'screen' as const,
      simulcast: false,
    }
    expect(canReceiveLivePublication('learner', screen)).toBe(false)
    expect(canReceiveLivePublication('recorder', screen)).toBe(false)
    expect(canReceiveLivePublication('teacher', screen)).toBe(true)
    expect(
      canReceiveLivePublication('recorder', { ...screen, role: 'teacher', kind: 'demo' }),
    ).toBe(true)
  })

  test('join exposes no SFU credentials or provider session identifiers', async () => {
    const f = fixture()
    const joined = await f.provider.join(context, 'attempt')
    expect(joined.connectionId).toBe('attempt')
    expect(JSON.stringify(joined)).not.toContain('secret')
    expect(JSON.stringify(joined)).not.toContain('sfu-')
    await expect(f.provider.join(context, 'attempt')).rejects.toMatchObject({
      code: 'MEDIA_ATTEMPT_USED',
    })
    expect(f.requests.filter((request) => request.includes('sessions/new'))).toHaveLength(1)
  })

  test('the lock lasts until application of the answer is acknowledged', async () => {
    const f = fixture()
    await f.provider.join(context, 'attempt')
    await f.provider.publish(context, {
      connectionId: 'attempt',
      operationId: 'op1',
      kind: 'camera',
      mid: '0',
      sessionDescription: offer,
    })
    await expect(
      f.provider.publish(context, {
        connectionId: 'attempt',
        operationId: 'op2',
        kind: 'demo',
        mid: '0',
        sessionDescription: offer,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_NEGOTIATION_PENDING' })
    expect((await f.registry.get('attempt'))?.resources[0]?.state).toBe('negotiating')
    await f.provider.complete(context, { connectionId: 'attempt', operationId: 'op1' })
    expect((await f.registry.get('attempt'))?.pending).toBeNull()
    expect((await f.registry.get('attempt'))?.resources[0]?.state).toBe('active')
  })

  test('HTTP 200 with a failed track retires the connection', async () => {
    const f = fixture()
    await f.provider.join(context, 'attempt')
    f.setReply({ tracks: [{ mid: '0', errorCode: 'TRACK_FAILED' }] })
    await expect(
      f.provider.publish(context, {
        connectionId: 'attempt',
        operationId: 'op1',
        kind: 'camera',
        mid: '0',
        sessionDescription: offer,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_TRACK_FAILED' })
    expect((await f.registry.get('attempt'))?.status).toBe('retired')
    expect((await f.registry.get('attempt'))?.cleanupPending).toBe(true)
  })

  test('mute policy denies audio before making a provider request', async () => {
    const f = fixture()
    await f.provider.join(context, 'attempt')
    f.setAccess({ canPublishAudio: false })
    await expect(
      f.provider.publish(context, {
        connectionId: 'attempt',
        operationId: 'op1',
        kind: 'microphone',
        mid: '0',
        sessionDescription: { ...offer, sdp: offer.sdp.replace('m=video', 'm=audio') },
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_FORBIDDEN' })
    expect(f.requests.filter((url) => url.includes('tracks/new'))).toHaveLength(0)
  })

  test('audio cannot be disguised as screen sharing', async () => {
    const f = fixture()
    await f.provider.join(context, 'attempt')
    f.setAccess({ role: 'learner' })
    await expect(
      f.provider.publish(context, {
        connectionId: 'attempt',
        operationId: 'op1',
        kind: 'screen',
        mid: '0',
        sessionDescription: { ...offer, sdp: offer.sdp.replace('m=video', 'm=audio') },
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_INVALID_TRACK' })
  })

  test('a session allocated after timeout is retained and cleaned without reviving its generation', async () => {
    let respond!: () => void
    const creation = new Promise<void>((resolve) => {
      respond = resolve
    })
    const f = fixture({ creation, timeoutMs: 2 })
    await expect(f.provider.join(context, 'late-attempt')).rejects.toMatchObject({
      code: 'MEDIA_UNCERTAIN',
    })
    expect((await f.registry.get('late-attempt'))?.status).toBe('retired')
    respond()
    await f.closure
    const record = await f.registry.get('late-attempt')
    expect(record?.sessionId).toBeTruthy()
    expect(record?.status).toBe('retired')
    expect(f.requests.filter((url) => url.includes('sessions/new'))).toHaveLength(1)
  })
})
