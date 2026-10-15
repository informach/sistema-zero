import { expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import type { StudioAiAccountService } from '../../src/application/ai-usage/studio-ai-account.service'
import { studioAiAccountRoutes } from '../../src/interfaces/http/routes/studio-ai-account.routes'

test('OAuth state management only accepts the signed member-shell parent actor', async () => {
  let calls = 0
  const service = {
    view: async () => {
      calls++
      return { connected: false, source: 'platform' }
    },
  } as unknown as StudioAiAccountService
  const app = new Elysia().use(
    studioAiAccountRoutes({ service, internalToken: 'internal-test-token' }),
  )
  const accountId = '568c5501-2c2f-4dfb-a4ef-24c2ff751d48'
  const request = (consumer: string, userId = accountId) =>
    new Request('http://localhost/members/internal/studio-ai/account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': 'internal-test-token',
        'x-consumer-id': consumer,
      },
      body: JSON.stringify({
        actor: { accountId, userId, parent: true },
        action: { operation: 'view' },
      }),
    })
  expect((await app.handle(request('other-consumer'))).status).not.toBe(200)
  const wrongOwner = await app.handle(
    request('member-shell', '568c5501-2c2f-4dfb-a4ef-24c2ff751d49'),
  )
  expect(wrongOwner.status).not.toBe(200)
  expect(calls).toBe(0)
  const response = await app.handle(request('member-shell'))
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(calls).toBe(1)
})
