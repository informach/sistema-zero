import { describe, expect, test } from 'bun:test'
import { createRateLimiter } from '../../src/application/rate-limit/rate-limiter'
import { createInMemoryStore } from '../../src/infrastructure/store/in-memory-store'

describe('rate limiter', () => {
  test('permite até o limite, depois nega com retry-after', async () => {
    const rl = createRateLimiter(createInMemoryStore())
    const d1 = await rl.check('k', 2, 60_000)
    const d2 = await rl.check('k', 2, 60_000)
    const d3 = await rl.check('k', 2, 60_000)
    expect(d1.allowed).toBe(true)
    expect(d1.remaining).toBe(1)
    expect(d2.allowed).toBe(true)
    expect(d2.remaining).toBe(0)
    expect(d3.allowed).toBe(false)
    expect(d3.retryAfterSeconds).toBeGreaterThan(0)
  })

  test('refund devolve uma unidade ao contador', async () => {
    const rl = createRateLimiter(createInMemoryStore())
    await rl.check('k', 2, 60_000) // count 1
    await rl.check('k', 2, 60_000) // count 2 (no limite)
    await rl.refund('k') // count 1
    const d = await rl.check('k', 2, 60_000) // count 2 → ainda permitido
    expect(d.allowed).toBe(true)
  })

  test('chaves independentes', async () => {
    const rl = createRateLimiter(createInMemoryStore())
    await rl.check('a', 1, 60_000)
    const da = await rl.check('a', 1, 60_000)
    const db = await rl.check('b', 1, 60_000)
    expect(da.allowed).toBe(false)
    expect(db.allowed).toBe(true)
  })
})
