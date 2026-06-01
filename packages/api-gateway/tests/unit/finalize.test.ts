import { describe, expect, test } from 'bun:test'
import { createFinalizeStage } from '../../src/application/pipeline/stages/finalize.stage'
import type { RateLimiter } from '../../src/application/rate-limit/rate-limiter'
import { makeContext, recordingLogger } from '../helpers'

const noopRateLimiter: RateLimiter = {
  check: async () => ({ allowed: true, limit: 0, remaining: 0, retryAfterSeconds: 0, resetMs: 0 }),
  refund: async () => {},
}

describe('finalize stage / access log', () => {
  test('gateway.access inclui clientIp + userAgent e é info em 2xx', async () => {
    const rec = recordingLogger()
    const ctx = makeContext({
      clientIp: '203.0.113.7',
      headers: { 'user-agent': 'curl/8.0' },
      logger: rec.logger,
    })
    ctx.response = new Response('ok', { status: 200 })

    await createFinalizeStage(noopRateLimiter).run(ctx)

    const access = rec.entries.find((e) => e.message === 'gateway.access')
    expect(access).toBeDefined()
    expect(access?.level).toBe('info')
    expect(access?.context?.clientIp).toBe('203.0.113.7')
    expect(access?.context?.userAgent).toBe('curl/8.0')
  })

  test('gateway.access é nível error em 5xx (aflora em queries level>=error)', async () => {
    const rec = recordingLogger()
    const ctx = makeContext({ logger: rec.logger })
    ctx.response = new Response('boom', { status: 502 })

    await createFinalizeStage(noopRateLimiter).run(ctx)

    expect(rec.entries.find((e) => e.message === 'gateway.access')?.level).toBe('error')
  })

  test('debugHeaders=true emite gateway.headers (debug) com sensíveis redigidos', async () => {
    const rec = recordingLogger()
    const ctx = makeContext({
      headers: { authorization: 'Bearer xyz', cookie: 'sid=abc', 'x-trace': 'keep-me' },
      logger: rec.logger,
    })
    ctx.response = new Response('ok', { status: 200 })

    await createFinalizeStage(noopRateLimiter, undefined, true).run(ctx)

    const dbg = rec.entries.find((e) => e.message === 'gateway.headers')
    expect(dbg?.level).toBe('debug')
    const request = dbg?.context?.request as Record<string, string>
    expect(request.authorization).toBe('[REDACTED]')
    expect(request.cookie).toBe('[REDACTED]')
    expect(request['x-trace']).toBe('keep-me')
  })

  test('sem debugHeaders, nenhum gateway.headers é emitido', async () => {
    const rec = recordingLogger()
    const ctx = makeContext({ logger: rec.logger })
    ctx.response = new Response('ok', { status: 200 })

    await createFinalizeStage(noopRateLimiter).run(ctx)

    expect(rec.entries.some((e) => e.message === 'gateway.headers')).toBe(false)
  })
})
