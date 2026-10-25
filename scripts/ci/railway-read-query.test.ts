import { expect, test } from 'bun:test'
import { railwayReadQuery, retryAfterMs } from './railway-read-query.mjs'

function fixture(replies: Array<Response | Error>, budget = 600_000) {
  let elapsed = 0
  const calls: Array<{ at: number; init: RequestInit }> = []
  const logs: unknown[] = []
  return {
    calls,
    logs,
    elapsed: () => elapsed,
    run: (query = 'query{deployment(id:"fixed"){status}}') =>
      railwayReadQuery(
        query,
        {},
        {
          token: 'secret-synthetic-token',
          deadline: budget,
          now: () => elapsed,
          wallNow: () => Date.UTC(2026, 9, 24) + elapsed,
          sleep: async (ms: number) => {
            elapsed += ms
          },
          log: (value: unknown) => logs.push(value),
          fetch: async (_url: string, init: RequestInit) => {
            calls.push({ at: elapsed, init })
            const response = replies.shift()
            if (response instanceof Error) throw response
            if (!response) throw new Error('Missing synthetic reply')
            return response
          },
        },
      ),
  }
}
const success = () => Response.json({ data: { deployment: { status: 'SUCCESS' } } })

test('read transport refuses mutations before any request', async () => {
  const qa = fixture([success()])
  await expect(qa.run('mutation{serviceInstanceDeployV2}')).rejects.toThrow('read-query-required')
  expect(qa.calls).toHaveLength(0)
})

test('429 honors Retry-After greater than ordinary retry cap without secrets in logs', async () => {
  const qa = fixture([
    new Response('private body', { status: 429, headers: { 'retry-after': '180' } }),
    success(),
  ])
  await qa.run()
  expect(qa.calls.map((c) => c.at)).toEqual([0, 180_000])
  expect(qa.calls[0]!.init.redirect).toBe('error')
  expect(qa.calls[0]!.init.signal).toBeInstanceOf(AbortSignal)
  expect(JSON.stringify(qa.logs)).not.toContain('private body')
  expect(JSON.stringify(qa.logs)).not.toContain('secret-synthetic-token')
})

test('HTTP-date Retry-After and malformed hints are bounded', () => {
  const at = Date.UTC(2026, 9, 24)
  expect(retryAfterMs(new Date(at + 90_000).toUTCString(), at)).toBe(90_000)
  expect(retryAfterMs('bad', at)).toBe(0)
  expect(retryAfterMs(null, at)).toBe(0)
})

test('429 beyond wave deadline never performs an early retry', async () => {
  const qa = fixture([new Response('', { status: 429, headers: { 'retry-after': '900' } })], 60_000)
  await expect(qa.run()).rejects.toThrow('read-deadline')
  expect(qa.calls).toHaveLength(1)
  expect(qa.elapsed()).toBe(60_000)
})

test.each([401, 403, 400])('HTTP %i fails without retries', async (status) => {
  const qa = fixture([new Response('sensitive body', { status })])
  await expect(qa.run()).rejects.toThrow()
  expect(qa.calls).toHaveLength(1)
})

test('GraphQL errors reject partial data without retry', async () => {
  const qa = fixture([
    Response.json({
      data: { deployment: { status: 'SUCCESS' } },
      errors: [{ message: 'Not Authorized' }],
    }),
  ])
  await expect(qa.run()).rejects.toThrow('api-authorization-rejected')
  expect(qa.calls).toHaveLength(1)
})

test('transient reads back off and stop after five invalid responses', async () => {
  const qa = fixture(Array.from({ length: 5 }, () => new Response('private-not-json')))
  await expect(qa.run()).rejects.toThrow('api-response-invalid')
  expect(qa.calls.map((c) => c.at)).toEqual([0, 5000, 15_000, 35_000, 75_000])
  expect(JSON.stringify(qa.logs)).not.toContain('private-not-json')
})

test.each([
  new Error('secret-network-body'),
  new Response('', { status: 502 }),
])('transient reads can recover', async (failure) => {
  const qa = fixture([failure, success()])
  expect(await qa.run()).toEqual({ deployment: { status: 'SUCCESS' } })
  expect(qa.calls).toHaveLength(2)
})
