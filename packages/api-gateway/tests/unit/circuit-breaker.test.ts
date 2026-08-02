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
    // Relógio injetado: dirige as transições por um clock controlado em vez do tempo
    // real (Bun.sleep), que era racy sob carga do CI — ver o `now` do StoreCircuitBreaker.
    let clock = 1_000_000
    const now = () => clock
    const breaker = new StoreCircuitBreaker(createInMemoryStore(), () => cfg, 0, now)

    const initial = await breaker.beforeCall('svc', 'up')
    expect(initial.allow).toBe(true)
    expect(initial.state).toBe('closed')

    // Dispara falhas suficientes para abrir (total>=4 e taxa>=0.5). Com o relógio
    // PARADO, as 4 falhas caem na MESMA janela de contagem (cooldownMs) — não depende
    // de o loop rodar em menos de cooldownMs de tempo real.
    for (let i = 0; i < 4; i++) {
      const d = await breaker.beforeCall('svc', 'up')
      await breaker.onResult('svc', 'up', false, d.token)
    }

    const opened = await breaker.beforeCall('svc', 'up')
    expect(opened.allow).toBe(false)
    expect(opened.state).toBe('open')

    clock += 80 // > cooldownMs: avança o relógio injetado (determinístico, sem sleep)
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
