import { expect, test } from 'bun:test'
import { awaitWithSignal } from '@sistemazero/core/http'
import { createLogger } from '@sistemazero/core/logging'
import type { Forwarder } from '../../src/domain/proxy/forwarder.port'
import type { CircuitBreaker } from '../../src/domain/resilience/circuit-breaker.port'
import { RoundRobinLoadBalancer } from '../../src/infrastructure/load-balancing/round-robin.lb'
import { UpstreamStats } from '../../src/infrastructure/load-balancing/upstream-stats'
import { ProxyEngine, type ProxyInput } from '../../src/infrastructure/proxy/proxy-engine'
import { InMemoryHealthRegistry } from '../../src/infrastructure/resilience/health-registry'
import { StoreCircuitBreaker } from '../../src/infrastructure/resilience/store-circuit-breaker'
import { createInMemoryStore } from '../../src/infrastructure/store/in-memory-store'

function harness(forwarder: Forwarder, breaker?: CircuitBreaker) {
  const health = new InMemoryHealthRegistry()
  const stats = new UpstreamStats()
  const store = createInMemoryStore()
  const actualBreaker = breaker ?? new StoreCircuitBreaker(store, () => undefined)
  const engine = new ProxyEngine({
    forwarder,
    health,
    stats,
    breaker: actualBreaker,
    logger: createLogger({ level: 'error' }),
  })
  const controller = new AbortController()
  const input: ProxyInput = {
    signal: controller.signal,
    serviceId: 'svc',
    targets: [{ id: 'up', baseUrl: 'http://up.local', weight: 1 }],
    lb: new RoundRobinLoadBalancer(),
    method: 'GET',
    path: '/work',
    headers: new Headers(),
    body: null,
    timeoutMs: 2000,
    retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 },
    requestId: 'cancel-proof',
  }
  return { engine, controller, input, health, stats, store }
}

const bounded = <T>(promise: Promise<T>) =>
  awaitWithSignal(() => promise, AbortSignal.timeout(1500))

test('a pre-aborted request never admits a transport operation', async () => {
  let calls = 0
  const h = harness({
    forward: async () => {
      calls++
      return new Response('unexpected')
    },
  })
  h.controller.abort()
  const result = await h.engine.proxy(h.input)
  expect(result.response.status).toBe(499)
  expect(result.attempts).toBe(0)
  expect(calls).toBe(0)
  expect(h.stats.inFlight('up')).toBe(0)
  expect(h.health.snapshot()).toEqual({})
})

test('withdrawal settles a noncooperative forwarder, releases capacity and cancels its late body', async () => {
  const entered = Promise.withResolvers<AbortSignal>()
  const response = Promise.withResolvers<Response>()
  const cancelled = Promise.withResolvers<void>()
  let calls = 0
  const h = harness({
    forward: async (request) => {
      calls++
      entered.resolve(request.signal)
      return response.promise
    },
  })
  const resultPromise = h.engine.proxy(h.input)
  const forwardedSignal = await bounded(entered.promise)
  expect(h.stats.inFlight('up')).toBe(1)
  h.controller.abort()
  const result = await bounded(resultPromise)
  expect(result.response.status).toBe(499)
  expect(forwardedSignal.aborted).toBe(true)
  expect(result.attempts).toBe(1)
  expect(h.stats.inFlight('up')).toBe(0)
  expect(h.stats.ewmaLatencyMs('up')).toBe(0)
  response.resolve(
    new Response(
      new ReadableStream({
        cancel() {
          cancelled.resolve()
        },
      }),
    ),
  )
  await bounded(cancelled.promise)
  expect(calls).toBe(1)
  expect(h.health.snapshot()).toEqual({})
  expect(h.stats.inFlight('up')).toBe(0)
})

test('cooperative abort is neutral and never retries an idempotent request', async () => {
  const entered = Promise.withResolvers<void>()
  let calls = 0
  const h = harness({
    forward: async ({ signal }) => {
      calls++
      entered.resolve()
      return awaitWithSignal(() => new Promise<Response>(() => {}), signal)
    },
  })
  const pending = h.engine.proxy(h.input)
  await bounded(entered.promise)
  h.controller.abort()
  expect((await bounded(pending)).response.status).toBe(499)
  expect(calls).toBe(1)
  expect(h.health.snapshot()).toEqual({})
  expect(h.stats.ewmaLatencyMs('up')).toBe(0)
})

test('a late breaker admission after withdrawal is retired without forwarding', async () => {
  const entered = Promise.withResolvers<void>()
  const decision = Promise.withResolvers<Awaited<ReturnType<CircuitBreaker['beforeCall']>>>()
  const cancelled = Promise.withResolvers<string | undefined>()
  let calls = 0
  const h = harness(
    {
      forward: async () => {
        calls++
        return new Response('unexpected')
      },
    },
    {
      beforeCall: async () => {
        entered.resolve()
        return decision.promise
      },
      onResult: async () => {
        throw new Error('No outcome was observed')
      },
      onCancelled: async (_service, _upstream, token) => {
        cancelled.resolve(token)
      },
    },
  )
  const pending = h.engine.proxy(h.input)
  await bounded(entered.promise)
  h.controller.abort()
  expect((await bounded(pending)).response.status).toBe(499)
  decision.resolve({ allow: true, state: 'half-open', token: 'owned-trial' })
  expect(await bounded(cancelled.promise)).toBe('owned-trial')
  expect(calls).toBe(0)
})

test('withdrawing a half-open trial allows a new trial and ignores the old cancellation', async () => {
  const store = createInMemoryStore()
  let clock = 1000000
  const breaker = new StoreCircuitBreaker(
    store,
    () => ({ enabled: true, failureRate: 0.5, minThroughput: 4, cooldownMs: 60000 }),
    0,
    () => clock,
  )
  for (let i = 0; i < 4; i++) await breaker.onResult('svc', 'up', false)
  clock += 80000
  const first = await breaker.beforeCall('svc', 'up')
  expect(first.state).toBe('half-open')
  expect(first.allow).toBe(true)
  await breaker.onCancelled('svc', 'up', first.token)
  const next = await breaker.beforeCall('svc', 'up')
  expect(next.allow).toBe(true)
  expect(next.token).not.toBe(first.token)
  await breaker.onCancelled('svc', 'up', first.token)
  expect((await breaker.beforeCall('svc', 'up')).allow).toBe(false)
  expect(await store.recordOutcome('cb:counts:svc:up', true, 60000, clock)).toEqual({
    total: 1,
    fail: 0,
  })
  await breaker.onResult('svc', 'up', true, next.token)
  expect((await breaker.beforeCall('svc', 'up')).state).toBe('closed')
})
