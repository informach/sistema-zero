import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { StoreCircuitBreaker } from '../../src/infrastructure/resilience/store-circuit-breaker'
import { createRedisStore } from '../../src/infrastructure/store/redis-store'

const redisUrl = process.env.GATEWAY_TEST_REDIS_URL
const config = { enabled: true, failureRate: 0.5, minThroughput: 4, cooldownMs: 60000 }

test.skipIf(!redisUrl)(
  'real Redis settles trial ownership across replicas atomically',
  async () => {
    if (!redisUrl) throw new Error('Dedicated Redis test URL required')
    const stores = Array.from({ length: 3 }, () => createRedisStore(redisUrl))
    const [primary, replica, nextReplica] = stores
    if (!primary || !replica || !nextReplica) throw new Error('Missing replicas')
    const serviceId = `qa-${randomUUID()}`
    const keys = {
      state: `cb:state:${serviceId}:up`,
      gate: `cb:trial:${serviceId}:up`,
      counts: `cb:counts:${serviceId}:up`,
    }
    const openedAt = Date.now() - 80000
    try {
      await Promise.all(stores.map((store) => store.init()))
      await primary.set(keys.state, { state: 'open', openedAt }, 120000)
      const a = new StoreCircuitBreaker(primary, () => config, 250)
      const b = new StoreCircuitBreaker(replica, () => config, 250)
      const c = new StoreCircuitBreaker(nextReplica, () => config, 0)
      const first = await a.beforeCall(serviceId, 'up')
      expect(first.allow).toBe(true)
      expect((await b.beforeCall(serviceId, 'up')).allow).toBe(false)
      await a.onCancelled(serviceId, 'up', first.token)
      expect(await primary.get(keys.state)).toEqual({ state: 'open', openedAt })
      const next = await c.beforeCall(serviceId, 'up')
      expect(next.allow).toBe(true)
      expect(next.token).not.toBe(first.token)
      await Promise.all([
        b.onCancelled(serviceId, 'up', first.token),
        a.onResult(serviceId, 'up', true, first.token),
        b.onResult(serviceId, 'up', false, first.token),
      ])
      expect(await primary.get(keys.state)).toMatchObject({
        state: 'half-open',
        trialToken: next.token,
      })
      expect((await c.beforeCall(serviceId, 'up')).allow).toBe(false)
      await c.onResult(serviceId, 'up', true, next.token)
      expect(await primary.get(keys.state)).toBeNull()
      expect((await c.beforeCall(serviceId, 'up')).state).toBe('closed')
    } finally {
      await Promise.all(Object.values(keys).map((key) => primary.reset(key)))
      await Promise.all(stores.map((store) => store.kill()))
    }
  },
)

test.skipIf(!redisUrl)(
  'real Redis cancellation preserves counts and only one concurrent settlement wins',
  async () => {
    if (!redisUrl) throw new Error('Dedicated Redis test URL required')
    const store = createRedisStore(redisUrl)
    const serviceId = `qa-${randomUUID()}`
    const keys = {
      state: `cb:state:${serviceId}:up`,
      gate: `cb:trial:${serviceId}:up`,
      counts: `cb:counts:${serviceId}:up`,
    }
    const openedAt = Date.now() - 80000
    try {
      await store.init()
      await store.set(keys.state, { state: 'half-open', openedAt, trialToken: 'owned' }, 120000)
      await store.increment(keys.gate, 60000)
      await store.recordOutcome(keys.counts, false, 60000)
      expect(await store.settleCircuitTrial(keys, 'foreign', 'success', Date.now(), 120000)).toBe(
        false,
      )
      expect(await store.settleCircuitTrial(keys, 'owned', 'cancel', Date.now(), 120000)).toBe(true)
      expect(await store.get(keys.state)).toEqual({ state: 'open', openedAt })
      expect((await store.increment(keys.gate, 60000)).count).toBe(1)
      expect(await store.recordOutcome(keys.counts, true, 60000)).toEqual({ total: 2, fail: 1 })
      await store.set(keys.state, { state: 'half-open', openedAt, trialToken: 'next' }, 120000)
      const winners = await Promise.all(
        (['cancel', 'success', 'failure'] as const).map((outcome) =>
          store.settleCircuitTrial(keys, 'next', outcome, Date.now(), 120000),
        ),
      )
      expect(winners.filter(Boolean)).toHaveLength(1)
      expect((await store.increment(keys.gate, 60000)).count).toBe(1)
    } finally {
      await Promise.all(Object.values(keys).map((key) => store.reset(key)))
      await store.kill()
    }
  },
)
