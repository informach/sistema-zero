import { describe, expect, test } from 'bun:test'
import type { CircuitBreakerConfig } from '../../src/infrastructure/config/gateway-config.schema'
import { StoreCircuitBreaker } from '../../src/infrastructure/resilience/store-circuit-breaker'
import { createInMemoryStore } from '../../src/infrastructure/store/in-memory-store'

const cfg: CircuitBreakerConfig = {
  enabled: true,
  failureRate: 0.5,
  minThroughput: 4,
  cooldownMs: 60,
}

describe('StoreCircuitBreaker', () => {
  test('closed → open → half-open → closed', async () => {
    const breaker = new StoreCircuitBreaker(createInMemoryStore(), () => cfg, 0)

    const initial = await breaker.beforeCall('svc', 'up')
    expect(initial.allow).toBe(true)
    expect(initial.state).toBe('closed')

    // Dispara falhas suficientes para abrir (total>=4 e taxa>=0.5).
    for (let i = 0; i < 4; i++) {
      const d = await breaker.beforeCall('svc', 'up')
      await breaker.onResult('svc', 'up', false, d.token)
    }

    const opened = await breaker.beforeCall('svc', 'up')
    expect(opened.allow).toBe(false)
    expect(opened.state).toBe('open')

    await Bun.sleep(80) // > cooldown (Bun.sleep é ref'd; o sleep do app é unref'd de propósito)
    const half = await breaker.beforeCall('svc', 'up')
    expect(half.state).toBe('half-open')
    expect(half.allow).toBe(true)

    await breaker.onResult('svc', 'up', true, half.token)
    const closed = await breaker.beforeCall('svc', 'up')
    expect(closed.state).toBe('closed')
  })

  test('desabilitado → sempre permite', async () => {
    const breaker = new StoreCircuitBreaker(
      createInMemoryStore(),
      () => ({ ...cfg, enabled: false }),
      0,
    )
    for (let i = 0; i < 10; i++) {
      const d = await breaker.beforeCall('svc', 'up')
      await breaker.onResult('svc', 'up', false, d.token)
    }
    expect((await breaker.beforeCall('svc', 'up')).allow).toBe(true)
  })
})
