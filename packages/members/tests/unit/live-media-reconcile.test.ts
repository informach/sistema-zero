import { describe, expect, test } from 'bun:test'
import { LiveAccessError } from '../../src/domain/live/live.errors'
import { CloudflareSfuClient } from '../../src/infrastructure/live/cloudflare-sfu.client'
import { CloudflareSfuMediaProvider } from '../../src/infrastructure/live/cloudflare-sfu.provider'
import type {
  LiveMediaAccess,
  LiveMediaActor,
  LiveMediaAuthorizationResult,
  LiveMediaConnection,
  LiveMediaRegistryPort,
  LiveMediaResource,
} from '../../src/infrastructure/live/media-registry'

class Registry implements LiveMediaRegistryPort {
  entries = new Map<string, LiveMediaConnection>()
  leases = new Map<string, { holder: string; until: number }>()
  async insert(connection: LiveMediaConnection) {
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

const occurrenceId = 'occurrence'
const actor = (id: string, name: string, staff = false): LiveMediaActor => ({
  id,
  accountId: `${id}-account`,
  name,
  staff,
})
const teacher = actor('teacher', 'Ana Souza', true)
const bia = actor('bia', 'Bia')
const caio = actor('caio', 'Caio')

function resource(
  owner: LiveMediaActor,
  mid: string,
  kind: LiveMediaResource['publication']['kind'],
  muteEpoch = 0,
): LiveMediaResource {
  return {
    mid,
    direction: 'local',
    publication: {
      id: `${owner.id}-${kind}`,
      actorId: owner.id,
      role: owner.staff ? 'teacher' : 'learner',
      kind,
      simulcast: false,
    },
    publisherSessionId: `sfu-${owner.id}`,
    trackName: `${owner.id}-${kind}`,
    state: 'active',
    muteEpoch,
  }
}
function connection(
  owner: LiveMediaActor,
  resources: LiveMediaResource[],
  pending: LiveMediaConnection['pending'] = null,
): LiveMediaConnection {
  return {
    id: `connection-${owner.id}`,
    occurrenceId,
    actor: owner,
    deviceId: `device-${owner.id}`,
    generation: 1,
    role: owner.staff ? 'teacher' : 'learner',
    sessionId: `sfu-${owner.id}`,
    status: 'active',
    createdAt: new Date().toISOString(),
    leaseEndsAt: new Date(Date.now() + 60_000).toISOString(),
    hardEndsAt: new Date(Date.now() + 3_600_000).toISOString(),
    resources,
    pending,
    cleanupPending: false,
    uncertain: false,
  }
}
const allowed = (
  owner: LiveMediaActor,
  change: Partial<LiveMediaAccess> = {},
): LiveMediaAccess => ({
  actorId: owner.id,
  role: owner.staff ? 'teacher' : 'learner',
  canPublishAudio: true,
  canPublishVideo: true,
  muteEpoch: 0,
  hardEndsAt: new Date(Date.now() + 3_600_000).toISOString(),
  displayName: owner.name.split(' ')[0],
  ...change,
})

function fixture(leaseWaitMs = 5_000) {
  const registry = new Registry()
  const closed: string[][] = []
  const policy = new Map<string, LiveMediaAuthorizationResult>()
  const calls = { many: 0, single: 0, inflight: 0, maxInflight: 0 }
  let failure: Error | null = null
  let delay = 0
  const sfu = new CloudflareSfuClient({ appId: 'app', appSecret: 'secret' }, (async (
    url: string,
    init?: RequestInit,
  ) => {
    if (url.includes('tracks/close')) {
      const body = JSON.parse(String(init?.body)) as { tracks: { mid: string }[] }
      closed.push(body.tracks.map((track) => track.mid))
      return Response.json({ tracks: body.tracks })
    }
    return Response.json({ tracks: [] })
  }) as typeof fetch)
  const provider = new CloudflareSfuMediaProvider(
    sfu,
    registry,
    {
      authorize: async (who) => {
        calls.single++
        const outcome = policy.get(who.id) ?? { ok: true as const, access: allowed(who) }
        if (!outcome.ok) throw outcome.error
        return outcome.access
      },
      authorizeMany: async (_occurrence, entries) => {
        calls.many++
        calls.inflight++
        calls.maxInflight = Math.max(calls.maxInflight, calls.inflight)
        try {
          if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
          if (failure) throw failure
          return entries.map(
            ({ actor: who }) => policy.get(who.id) ?? { ok: true as const, access: allowed(who) },
          )
        } finally {
          calls.inflight--
        }
      },
    },
    { register: async () => {}, renew: async () => {}, retire: async () => {} },
    async () => [],
    Date.now,
    12_000,
    leaseWaitMs,
  )
  return {
    provider,
    registry,
    closed,
    calls,
    policy,
    fail: (error: Error | null) => {
      failure = error
    },
    slow: (ms: number) => {
      delay = ms
    },
    seed: (...items: LiveMediaConnection[]) => {
      for (const item of items) registry.entries.set(item.id, item)
    },
    state: (owner: LiveMediaActor) => registry.entries.get(`connection-${owner.id}`)!,
  }
}
const receiver = { actor: bia, occurrenceId, deviceId: `device-${bia.id}` }

describe('mídia da sala: uma autorização por consulta e reconcile serializado', () => {
  test('a lista de publicações autoriza a sala UMA vez e leva o primeiro nome de quem publica', async () => {
    const f = fixture()
    f.seed(
      connection(teacher, [resource(teacher, '0', 'microphone'), resource(teacher, '1', 'camera')]),
      connection(bia, [resource(bia, '0', 'camera')]),
      connection(caio, [resource(caio, '0', 'camera')]),
    )
    const publications = await f.provider.publications(receiver)
    expect(f.calls).toMatchObject({ many: 1, single: 0 })
    expect(publications.map((item) => [item.actorId, item.kind, item.displayName])).toEqual([
      ['teacher', 'microphone', 'Ana'],
      ['teacher', 'camera', 'Ana'],
      ['caio', 'camera', 'Caio'],
    ])
    // A definitive denial (removed child) leaves the poll at once; the room sweep, started in
    // the background (never inside the poll), retires only that publisher.
    f.policy.set('caio', { ok: false, error: new LiveAccessError() })
    const after = await f.provider.publications(receiver)
    expect(after.map((item) => item.actorId)).toEqual(['teacher', 'teacher'])
    await f.provider.reconcile(occurrenceId)
    expect(['retired', 'closed']).toContain(f.state(caio).status)
    expect(f.state(teacher).status).toBe('active')
  })

  test('a consulta só lê: conexão vencida sai da lista e a varredura a aposenta depois', async () => {
    const f = fixture()
    const expired = connection(caio, [resource(caio, '0', 'camera')])
    expired.leaseEndsAt = new Date(Date.now() - 1_000).toISOString()
    f.seed(connection(teacher, [resource(teacher, '0', 'microphone')]), expired)
    const listed = await f.provider.publications(receiver)
    expect(listed.map((item) => item.actorId)).toEqual(['teacher'])
    await f.provider.reconcile(occurrenceId)
    expect(['retired', 'closed']).toContain(f.state(caio).status)
    expect(f.state(teacher).status).toBe('active')
  })

  test('uma falha transitória ao ler a sala não aposenta conexão de ninguém', async () => {
    const f = fixture()
    f.seed(
      connection(teacher, [resource(teacher, '0', 'microphone')]),
      connection(caio, [resource(caio, '0', 'microphone')]),
    )
    f.fail(new Error('connection terminated unexpectedly'))
    await expect(f.provider.publications(receiver)).rejects.toThrow('connection terminated')
    await f.provider.reconcile(occurrenceId)
    expect(f.state(teacher).status).toBe('active')
    expect(f.state(caio).status).toBe('active')
    expect(f.closed).toEqual([])
  })

  test('silenciar fecha só o microfone e a conexão continua recebendo a professora', async () => {
    const f = fixture()
    f.seed(
      connection(caio, [
        resource(caio, '0', 'microphone', 0),
        resource(caio, '1', 'camera'),
        { ...resource(teacher, '2', 'microphone'), direction: 'remote' },
      ]),
    )
    f.policy.set('caio', { ok: true, access: allowed(caio, { muteEpoch: 1 }) })
    await f.provider.reconcile(occurrenceId)
    expect(f.closed).toEqual([['0']])
    const state = f.state(caio)
    expect(state.status).toBe('active')
    expect(state.pending).toBeNull()
    expect(state.resources.map((item) => [item.mid, item.state])).toEqual([
      ['0', 'closed'],
      ['1', 'active'],
      ['2', 'active'],
    ])
  })

  test('negociação recente espera o próximo ciclo; negociação abandonada aposenta', async () => {
    const f = fixture()
    const startedAt = new Date().toISOString()
    f.seed(
      connection(caio, [resource(caio, '0', 'microphone')], {
        id: 'op',
        state: 'awaiting-answer',
        startedAt,
      }),
    )
    f.policy.set('caio', { ok: true, access: allowed(caio, { canPublishAudio: false }) })
    await f.provider.reconcile(occurrenceId)
    expect(f.state(caio).status).toBe('active')
    expect(f.closed).toEqual([])
    f.state(caio).pending!.startedAt = new Date(Date.now() - 60_000).toISOString()
    await f.provider.reconcile(occurrenceId)
    expect(['retired', 'closed']).toContain(f.state(caio).status)
  })

  test('reconciles simultâneos da mesma sala rodam um de cada vez e se juntam', async () => {
    const f = fixture()
    f.seed(connection(caio, [resource(caio, '0', 'camera')]))
    f.slow(20)
    await Promise.all(Array.from({ length: 6 }, () => f.provider.reconcile(occurrenceId)))
    expect(f.calls.maxInflight).toBe(1)
    // The first run plus at most one coalesced rerun for everything that arrived meanwhile.
    expect(f.calls.many).toBeLessThanOrEqual(2)
    expect(f.registry.leases.size).toBe(0)
  })

  test('com o lease de outra réplica o reconcile espera, desiste e não mexe em nada', async () => {
    const f = fixture(50)
    f.seed(connection(caio, [resource(caio, '0', 'microphone')]))
    f.policy.set('caio', { ok: false, error: new LiveAccessError() })
    f.registry.leases.set(occurrenceId, { holder: 'other-replica', until: Date.now() + 60_000 })
    await f.provider.reconcile(occurrenceId)
    expect(f.calls.many).toBe(0)
    expect(f.state(caio).status).toBe('active')
  })
})
