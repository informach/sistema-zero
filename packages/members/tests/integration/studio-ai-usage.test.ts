import { expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { studioAiUsageRoutes } from '../../src/interfaces/http/routes/studio-ai-usage.routes'

test('private usage API gates consumers and new calls by entitlement; settlement stays available after expiry', async () => {
  let entitled = false,
    calls = 0
  const app = new Elysia().use(
    studioAiUsageRoutes({
      internalToken: 'internal-test-only',
      accessCheck: {
        execute: async () => ({ grants: entitled ? ['estudio-completo'] : [], communities: [] }),
      } as never,
      service: {
        dispatch: async () => {
          calls++
          return { source: 'openrouter', apiKey: 'server-test-only' }
        },
        settle: async () => {
          calls++
        },
        claimReconciliation: async () => {
          calls++
          return []
        },
      } as never,
    }),
  )
  const actor = { accountId: crypto.randomUUID(), userId: crypto.randomUUID(), privileged: false }
  const runId = crypto.randomUUID()
  const send = (action: unknown, consumer = 'member-shell', path = 'usage') =>
    app.handle(
      new Request(`http://localhost/members/internal/studio-ai/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': 'internal-test-only',
          'x-consumer-id': consumer,
        },
        body: JSON.stringify(path === 'usage' ? { actor, action } : action),
      }),
    )
  expect((await send({ operation: 'dispatch', runId, attempt: 1 }, 'browser')).status).not.toBe(200)
  expect((await send({ operation: 'claim' }, 'browser', 'reconcile')).status).not.toBe(200)
  expect((await send({ operation: 'dispatch', runId, attempt: 1 })).status).not.toBe(200)
  expect(calls).toBe(0)
  expect(
    (await send({ operation: 'settle', runId, settlement: { attempt: 1, status: 'uncertain' } }))
      .status,
  ).toBe(200)
  entitled = true
  const dispatched = await send({ operation: 'dispatch', runId, attempt: 1 })
  expect(dispatched.status).toBe(200)
  expect(dispatched.headers.get('Cache-Control')).toBe('no-store')
  expect((await send({ operation: 'dispatch', runId, attempt: 7 })).status).toBe(422)
  expect(calls).toBe(2)
})
