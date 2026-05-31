import { describe, expect, test } from 'bun:test'
import { createRateLimiter } from '../../src/application/rate-limit/rate-limiter'
import { createInMemoryStore } from '../../src/infrastructure/store/in-memory-store'

describe('sliding-window store', () => {
  test('dentro da janela: conta 1,2,3…', async () => {
    const store = createInMemoryStore()
    expect((await store.slidingWindow('k', 1000, 0)).count).toBe(1)
    expect((await store.slidingWindow('k', 1000, 100)).count).toBe(2)
    expect((await store.slidingWindow('k', 1000, 200)).count).toBe(3)
  })

  test('na virada da janela a contagem anterior DECAI (sem burst de 2x)', async () => {
    const store = createInMemoryStore()
    // 4 hits na janela [0,1000)
    for (let i = 0; i < 4; i++) await store.slidingWindow('k', 1000, 10 * i)
    // Logo no início da próxima janela (t=1000): prev=4 com peso ~1 → ~5
    const atBoundary = await store.slidingWindow('k', 1000, 1000)
    expect(atBoundary.count).toBeGreaterThan(4)
    // No meio da nova janela (t=1500): prev=4 × 0.5 + curr=2 = 4
    const midway = await store.slidingWindow('k', 1000, 1500)
    expect(midway.count).toBeLessThan(atBoundary.count)
  })

  test('refund devolve 1 à janela atual', async () => {
    const store = createInMemoryStore()
    await store.slidingWindow('k', 1000, 0)
    await store.slidingWindow('k', 1000, 1)
    await store.slidingWindowRefund('k')
    expect((await store.slidingWindow('k', 1000, 2)).count).toBe(2)
  })

  test('refund com token de janela antiga NÃO credita a janela nova (pós-rollover)', async () => {
    const store = createInMemoryStore()
    // 1º hit ancora a janela em t=10 → resetMs = 10 + 1000 = 1010.
    const hit = await store.slidingWindow('k', 1000, 10)
    expect(hit.resetMs).toBe(1010)
    // Rola para a janela seguinte (t=1500) e conta 1 nela (curr=1).
    await store.slidingWindow('k', 1000, 1500)
    // Refund tardio carregando o resetMs da janela ANTIGA → no-op (janela diferente).
    await store.slidingWindowRefund('k', hit.resetMs)
    // O curr da janela nova segue intacto: este hit em t=1600 vê curr=2 (count ≥ 2).
    expect((await store.slidingWindow('k', 1000, 1600)).count).toBeGreaterThanOrEqual(2)
  })

  test('refund com o resetMs da janela ATUAL debita normalmente', async () => {
    const store = createInMemoryStore()
    const hit = await store.slidingWindow('k', 1000, 0)
    await store.slidingWindow('k', 1000, 1)
    await store.slidingWindowRefund('k', hit.resetMs) // mesma janela → debita
    expect((await store.slidingWindow('k', 1000, 2)).count).toBe(2)
  })
})

describe('rate limiter (sliding)', () => {
  test('permite até o limite e depois nega com retry-after', async () => {
    const rl = createRateLimiter(createInMemoryStore())
    const d1 = await rl.check('k', 2, 60_000)
    const d2 = await rl.check('k', 2, 60_000)
    const d3 = await rl.check('k', 2, 60_000)
    expect(d1.allowed).toBe(true)
    expect(d2.allowed).toBe(true)
    expect(d3.allowed).toBe(false)
    expect(d3.retryAfterSeconds).toBeGreaterThan(0)
  })
})
