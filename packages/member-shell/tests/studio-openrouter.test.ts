import { afterAll, beforeEach, expect, mock, test } from 'bun:test'
import type { StudioAiAccountView } from '@sistemazero/core/ai-credits'
import type { SessionUser } from '../src/lib/types'
import type { MembersClient } from '../src/server/clients'
import type { SessionModule } from '../src/server/session'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'
const originalHeaders = { ...(await import('next/headers')) }
const jar = new Map<string, string>()
const cookieOptions: unknown[] = []
mock.module('next/headers', () => ({
  ...originalHeaders,
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    set: (name: string, value: string, options: unknown) => {
      jar.set(name, value)
      cookieOptions.push(options)
    },
  }),
}))
afterAll(() => mock.module('next/headers', () => originalHeaders))
const { createStudioOpenRouterRoutes } = await import('../src/routes/studio-openrouter')
const user: SessionUser = {
  id: 'f5f1764d-9163-46ca-bc32-0cc9d85b7016',
  email: '',
  firstName: 'Responsável',
  lastName: '',
  role: 'member',
  status: 'active',
  kids: { kind: 'parent', sessionId: 'd132cc36-3e62-4d82-b179-e8a5a4eb08b3', authenticatedAt: 1 },
}
const view: StudioAiAccountView = {
  available: true,
  connected: true,
  source: 'platform',
  connectedAt: null,
  externalDailyLimitMicroUsd: null,
  externalMonthlyLimitMicroUsd: null,
  keyManagementUrl: null,
}
beforeEach(() => {
  jar.clear()
  cookieOptions.length = 0
})
function setup(initial: SessionUser | null = user) {
  let active = initial
  const calls: Array<{ actor: unknown; action: Parameters<MembersClient['studioAiAccount']>[1] }> =
    []
  const members = {
    studioAiAccount: async (
      actor: unknown,
      action: Parameters<MembersClient['studioAiAccount']>[1],
    ) => {
      calls.push({ actor, action })
      return {
        status: 200,
        body:
          action.operation === 'start'
            ? { url: 'https://openrouter.ai/auth?state=test' }
            : { account: view },
      }
    },
    studioAiUsage: async () => ({
      status: 200,
      body: { costs: { day: '2026-10-15', month: '2026-10' } },
    }),
  } as unknown as MembersClient
  const routes = createStudioOpenRouterRoutes({
    members,
    session: { getSession: async () => active } as SessionModule,
    cookieBase: 'test_studio',
  })
  return {
    ...routes,
    calls,
    setUser(next: SessionUser | null) {
      active = next
    },
  }
}
const request = (path: string, method = 'POST', origin = 'http://kids.test', body?: string) =>
  new Request(`http://kids.test${path}`, {
    method,
    headers: { origin, 'Content-Type': 'application/json' },
    ...(body ? { body } : {}),
  })

test('all connection operations require the real parent session; support/profile/anonymous cannot access them', async () => {
  for (const session of [
    null,
    { ...user, kids: undefined },
    { ...user, act: { sub: 'support' } } as SessionUser,
    { ...user, activeProfile: { id: 'profile', accountId: user.id } } as SessionUser,
    {
      ...user,
      kids: { kind: 'student', sessionId: 's', deviceId: 'd', grantId: 'g' },
    } as SessionUser,
  ]) {
    const f = setup(session)
    expect((await f.studioOpenRouter.GET()).status).toBe(403)
    expect(
      (await f.studioOpenRouterConnect.POST(request('/api/parents/openrouter/connect'))).status,
    ).toBe(403)
    expect(
      (await f.studioOpenRouter.DELETE(request('/api/parents/openrouter', 'DELETE'))).status,
    ).toBe(403)
    expect(f.calls).toHaveLength(0)
  }
})
test('OAuth binds the authenticated account and parent session; secrets never enter the browser response', async () => {
  const f = setup()
  const start = await f.studioOpenRouterConnect.POST(request('/api/parents/openrouter/connect'))
  expect(start.status).toBe(200)
  expect(cookieOptions[0]).toMatchObject({
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  const startAction = f.calls[0]!.action
  expect(startAction.operation).toBe('start')
  expect(f.calls[0]!.actor).toEqual({ accountId: user.id, userId: user.id, parent: true })
  expect(await start.text()).not.toContain('binding')
  const callback = await f.studioOpenRouterCallback.GET(
    request('/api/parents/openrouter/callback?state=x&code=y', 'GET'),
  )
  expect(callback.headers.get('location')).toEndWith('/pais/conta?openrouter=connected')
  expect(callback.headers.get('referrer-policy')).toBe('no-referrer')
  expect(f.calls[1]!.action).toMatchObject({
    operation: 'complete',
    binding: 'binding' in startAction ? startAction.binding : '',
  })
  expect([...jar.values()]).toEqual([''])
  const before = f.calls.length
  await f.studioOpenRouterCallback.GET(
    request('/api/parents/openrouter/callback?state=x&code=y', 'GET'),
  )
  expect(f.calls).toHaveLength(before)
})
test('a new parent login changes the callback binding, and foreign origins or oversized policy cannot mutate the account', async () => {
  const f = setup()
  expect(
    (await f.studioOpenRouterConnect.POST(request('/connect', 'POST', 'https://evil.test'))).status,
  ).toBe(403)
  expect(
    (await f.studioOpenRouter.PUT(request('/account', 'PUT', 'http://kids.test', ' '.repeat(3000))))
      .status,
  ).toBe(413)
  expect(f.calls).toHaveLength(0)
  await f.studioOpenRouterConnect.POST(request('/connect'))
  const first = f.calls[0]!.action
  f.setUser({
    ...user,
    kids: { kind: 'parent', sessionId: 'new-parent-session', authenticatedAt: 2 },
  })
  await f.studioOpenRouterCallback.GET(request('/callback?state=x&code=y', 'GET'))
  const second = f.calls[1]!.action
  expect('binding' in second && second.binding).not.toBe('binding' in first && first.binding)
})
