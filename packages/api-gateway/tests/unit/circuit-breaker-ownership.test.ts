import { expect, test } from 'bun:test'
import type { GatewayStore } from '../../src/domain/ports/gateway-store.port'
import { StoreCircuitBreaker } from '../../src/infrastructure/resilience/store-circuit-breaker'
import { createInMemoryStore } from '../../src/infrastructure/store/in-memory-store'

const config = { enabled: true, failureRate: 0.5, minThroughput: 4, cooldownMs: 60000 }
const stateKey = 'cb:state:svc:up'
async function open(store: GatewayStore, now: () => number) {
  const breaker = new StoreCircuitBreaker(store, () => config, 0, now)
  for (let index = 0; index < 4; index++) await breaker.onResult('svc', 'up', false)
}

test('a replica with a cached old token cannot retire the next trial', async () => {
  const store = createInMemoryStore()
  let clock = 1000000
  const now = () => clock
  await open(store, now)
  clock += 80000
  const a = new StoreCircuitBreaker(store, () => config, 250, now)
  const b = new StoreCircuitBreaker(store, () => config, 250, now)
  const c = new StoreCircuitBreaker(store, () => config, 0, now)
  const first = await a.beforeCall('svc', 'up')
  expect(first.allow).toBe(true)
  expect((await b.beforeCall('svc', 'up')).allow).toBe(false)
  await a.onCancelled('svc', 'up', first.token)
  const next = await c.beforeCall('svc', 'up')
  expect(next.allow).toBe(true)
  expect(next.token).not.toBe(first.token)
  await b.onCancelled('svc', 'up', first.token)
  expect(await store.get(stateKey)).toMatchObject({ state: 'half-open', trialToken: next.token })
  expect((await c.beforeCall('svc', 'up')).allow).toBe(false)
})

test.each([
  'cancel',
  'success',
  'failure',
] as const)('a delayed %s result cannot replace a newer trial', async (transition) => {
  const store = createInMemoryStore()
  let clock = 1000000
  const now = () => clock
  await open(store, now)
  clock += 80000
  const entered = Promise.withResolvers<void>()
  const gate = Promise.withResolvers<void>()
  const delayedStore: GatewayStore = {
    ...store,
    async settleCircuitTrial(...args) {
      entered.resolve()
      await gate.promise
      return store.settleCircuitTrial(...args)
    },
  }
  const a = new StoreCircuitBreaker(delayedStore, () => config, 0, now)
  const b = new StoreCircuitBreaker(store, () => config, 0, now)
  const first = await a.beforeCall('svc', 'up')
  const delayed =
    transition === 'cancel'
      ? a.onCancelled('svc', 'up', first.token)
      : a.onResult('svc', 'up', transition === 'success', first.token)
  try {
    await entered.promise
    await b.onCancelled('svc', 'up', first.token)
    const next = await b.beforeCall('svc', 'up')
    expect(next.allow).toBe(true)
    gate.resolve()
    await delayed
    expect(await store.get(stateKey)).toMatchObject({ state: 'half-open', trialToken: next.token })
    expect((await b.beforeCall('svc', 'up')).allow).toBe(false)
  } finally {
    gate.resolve()
    await delayed
    await store.kill()
  }
})
