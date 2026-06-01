import { describe, expect, test } from 'bun:test'
import { createGlobalRateLimitStage } from '../../src/application/pipeline/stages/global-rate-limit.stage'
import type { RateLimiter } from '../../src/application/rate-limit/rate-limiter'
import { createRateLimiter } from '../../src/application/rate-limit/rate-limiter'
import { createInMemoryStore } from '../../src/infrastructure/store/in-memory-store'
import { makeContext } from '../helpers'

describe('global rate-limit stage (safety-net por IP)', () => {
  test('limita IP anônimo ao exceder o teto → 429 + Retry-After', async () => {
    const rateLimiter = createRateLimiter(createInMemoryStore())
    const stage = createGlobalRateLimitStage({ rateLimiter, max: 2, windowMs: 60_000 })
    const hit = () => stage.run(makeContext({ clientIp: '198.51.100.9' }))

    expect(await hit()).toBeUndefined()
    expect(await hit()).toBeUndefined()
    const blocked = await hit()
    expect(blocked).toBeInstanceOf(Response)
    expect((blocked as Response).status).toBe(429)
    expect((blocked as Response).headers.get('retry-after')).toBeTruthy()
  })

  test('isenta cliente autenticado (principal) — nunca limita', async () => {
    const rateLimiter = createRateLimiter(createInMemoryStore())
    const stage = createGlobalRateLimitStage({ rateLimiter, max: 1, windowMs: 60_000 })
    const ctx = makeContext({ clientIp: '198.51.100.10' })
    ctx.principal = { kind: 'hmac', subject: 'funnel' }

    expect(await stage.run(ctx)).toBeUndefined()
    expect(await stage.run(ctx)).toBeUndefined()
    expect(await stage.run(ctx)).toBeUndefined()
  })

  test('fail-open: store que lança libera a request e conta a métrica', async () => {
    const throwing: RateLimiter = {
      check: async () => {
        throw new Error('redis indisponível')
      },
      refund: async () => {},
    }
    let failOpen = 0
    const stage = createGlobalRateLimitStage({
      rateLimiter: throwing,
      max: 1,
      windowMs: 1_000,
      metrics: { recordRateLimitFailOpen: () => failOpen++ },
    })

    const out = await stage.run(makeContext({ clientIp: '198.51.100.11' }))
    expect(out).toBeUndefined() // liberou
    expect(failOpen).toBe(1)
  })
})
