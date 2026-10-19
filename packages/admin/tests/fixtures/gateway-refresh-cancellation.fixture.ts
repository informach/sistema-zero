import { afterAll, expect, mock, spyOn, test } from 'bun:test'
import { AsyncLocalStorage } from 'node:async_hooks'
import { SignJWT } from 'jose'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../src/lib/cookies'

type Scope = {
  name: string
  refresh: string
  controller: AbortController
  writes: { name: string; value: string }[]
  refreshRead: ReturnType<typeof Promise.withResolvers<void>>
  cookieReads: number
  access?: string
  pauseCookieWrite?: {
    started: ReturnType<typeof Promise.withResolvers<void>>
    release: ReturnType<typeof Promise.withResolvers<void>>
  }
}
const scopes = new AsyncLocalStorage<Scope>()
function scope() {
  const current = scopes.getStore()
  if (!current) throw new Error('Missing request scope')
  return current
}
function createScope(name: string, refresh: string): Scope {
  return {
    name,
    refresh,
    controller: new AbortController(),
    writes: [],
    refreshRead: Promise.withResolvers<void>(),
    cookieReads: 0,
  }
}
mock.module('server-only', () => ({}))
mock.module('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => {
    const current = scope()
    current.cookieReads++
    if (current.cookieReads === 3 && current.pauseCookieWrite) {
      current.pauseCookieWrite.started.resolve()
      await current.pauseCookieWrite.release.promise
    }
    return {
      get(name: string) {
        if (name === REFRESH_COOKIE) current.refreshRead.resolve()
        return {
          value: name === ACCESS_COOKIE ? (current.access ?? 'expired-access') : current.refresh,
        }
      },
      set(name: string, value: string) {
        current.writes.push({ name, value })
      },
    }
  },
}))
mock.module('@/lib/env', () => ({
  getEnv: () => ({
    GATEWAY_URL: 'https://gateway.test',
    JWT_HS256_SECRET: 'refresh-cancellation-test-secret',
  }),
  isProd: () => false,
}))
const { gatewayFetch, gatewayFetchRaw } = await import('../../src/server/gateway')
const { requireLocalAdminSession } = await import('../../src/server/local-admin-session')
type Outcome = { kind: 'resolved' } | { kind: 'rejected'; error: unknown }
const outcome = (promise: Promise<unknown>): Promise<Outcome> =>
  promise.then(
    () => ({ kind: 'resolved' }),
    (error: unknown) => ({ kind: 'rejected', error }),
  )
const tokens = {
  accessToken: 'renewed-access',
  refreshToken: 'renewed-refresh',
  tokenType: 'Bearer',
  expiresIn: 900,
  refreshExpiresIn: 2592000,
}
let reply: (url: string, init?: RequestInit) => Promise<Response>
const fetchImplementation = Object.assign(
  (...[input, init]: Parameters<typeof fetch>) => reply(String(input), init),
  { preconnect: globalThis.fetch.preconnect },
)
const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(fetchImplementation)
afterAll(() => fetchSpy.mockRestore())

for (const [name, call] of [
  ['json', gatewayFetch],
  ['raw', gatewayFetchRaw],
] as const) {
  test(`${name}: cancelling one refresh waiter preserves the other request and shared rotation`, async () => {
    const refresh = crypto.randomUUID()
    const cancelled = createScope('cancelled', refresh)
    const active = createScope('active', refresh)
    const rotation = Promise.withResolvers<Response>()
    const started = Promise.withResolvers<AbortSignal>()
    const retries: string[] = []
    let refreshCalls = 0
    reply = async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++
        if (!init?.signal) throw new Error('Missing rotation deadline')
        started.resolve(init.signal)
        return rotation.promise
      }
      if (new Headers(init?.headers).get('authorization') === 'Bearer renewed-access') {
        retries.push(scope().name)
        return Response.json({ ok: true })
      }
      return Response.json({ error: 'expired' }, { status: 401 })
    }
    const first = scopes.run(cancelled, () =>
      outcome(call('/members/studio/python-analysis', { signal: cancelled.controller.signal })),
    )
    const second = scopes.run(active, () =>
      outcome(call('/members/studio/python-analysis', { signal: active.controller.signal })),
    )
    const [rotationSignal] = await Promise.all([
      started.promise,
      cancelled.refreshRead.promise,
      active.refreshRead.promise,
    ])
    cancelled.controller.abort()
    const beforeRelease = await Promise.race([
      first,
      Bun.sleep(30).then(() => ({ kind: 'pending' })),
    ])
    const rotationAborted = rotationSignal.aborted
    rotation.resolve(Response.json({ tokens }))
    const [firstResult, secondResult] = await Promise.all([first, second])
    expect(beforeRelease.kind).toBe('rejected')
    expect(firstResult).toMatchObject({
      kind: 'rejected',
      error: cancelled.controller.signal.reason,
    })
    expect(secondResult).toEqual({ kind: 'resolved' })
    expect(rotationAborted).toBe(false)
    expect(refreshCalls).toBe(1)
    expect(retries).toEqual(['active'])
    expect(cancelled.writes).toEqual([])
    expect(active.writes.map((write) => write.value)).toEqual(['renewed-access', 'renewed-refresh'])
  })

  test(`${name}: cancellation observed with the 401 does not begin refresh`, async () => {
    const current = createScope('cancelled-before-401', crypto.randomUUID())
    let refreshCalls = 0
    reply = async (url) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++
        return Response.json({ tokens })
      }
      current.controller.abort()
      return Response.json({ error: 'expired' }, { status: 401 })
    }
    const result = await scopes.run(current, () =>
      outcome(call('/members/studio/python-analysis', { signal: current.controller.signal })),
    )
    expect(result).toMatchObject({ kind: 'rejected', error: current.controller.signal.reason })
    expect(refreshCalls).toBe(0)
    expect(current.writes).toEqual([])
  })
}

test('an invalid shared refresh clears only the still-active request cookies', async () => {
  const refresh = crypto.randomUUID()
  const cancelled = createScope('cancelled', refresh)
  const active = createScope('active', refresh)
  const rotation = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<void>()
  let refreshCalls = 0
  reply = async (url) => {
    if (url.endsWith('/auth/refresh')) {
      refreshCalls++
      started.resolve()
      return rotation.promise
    }
    return Response.json({ error: 'expired' }, { status: 401 })
  }
  const first = scopes.run(cancelled, () =>
    outcome(gatewayFetch('/members/example', { signal: cancelled.controller.signal })),
  )
  const second = scopes.run(active, () =>
    outcome(gatewayFetch('/members/example', { signal: active.controller.signal })),
  )
  await Promise.all([started.promise, cancelled.refreshRead.promise, active.refreshRead.promise])
  cancelled.controller.abort()
  rotation.resolve(Response.json({ error: 'invalid' }, { status: 401 }))
  await Promise.all([first, second])
  expect(refreshCalls).toBe(1)
  expect(cancelled.writes).toEqual([])
  expect(active.writes).toEqual([
    { name: ACCESS_COOKIE, value: '' },
    { name: REFRESH_COOKIE, value: '' },
  ])
})

for (const valid of [true, false]) {
  test(`cancellation while cookies() is pending prevents late ${valid ? 'set' : 'clear'}`, async () => {
    const current = createScope('paused-cookies', crypto.randomUUID())
    const pause = { started: Promise.withResolvers<void>(), release: Promise.withResolvers<void>() }
    current.pauseCookieWrite = pause
    reply = async (url) =>
      url.endsWith('/auth/refresh')
        ? Response.json(valid ? { tokens } : { error: 'invalid' }, { status: valid ? 200 : 401 })
        : Response.json({ error: 'expired' }, { status: 401 })
    const result = scopes.run(current, () =>
      outcome(gatewayFetch('/members/example', { signal: current.controller.signal })),
    )
    await pause.started.promise
    current.controller.abort()
    pause.release.resolve()
    expect(await result).toMatchObject({
      kind: 'rejected',
      error: current.controller.signal.reason,
    })
    expect(current.writes).toEqual([])
  })
}

test('the local Admin session gate cancels its expired-JWT refresh without disturbing another waiter', async () => {
  const refresh = crypto.randomUUID()
  const local = createScope('local-session', refresh)
  local.access = await new SignJWT({ typ: 'access', role: 'staff', status: 'active' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(crypto.randomUUID())
    .setExpirationTime(1)
    .sign(new TextEncoder().encode('refresh-cancellation-test-secret'))
  const active = createScope('active-gateway', refresh)
  const rotation = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<void>()
  let refreshCalls = 0
  reply = async (url, init) => {
    if (url.endsWith('/auth/refresh')) {
      refreshCalls++
      started.resolve()
      return rotation.promise
    }
    return Response.json(
      { ok: true },
      {
        status:
          new Headers(init?.headers).get('authorization') === 'Bearer renewed-access' ? 200 : 401,
      },
    )
  }
  const first = scopes.run(local, () =>
    outcome(
      requireLocalAdminSession(undefined, { allowStaff: true, signal: local.controller.signal }),
    ),
  )
  await started.promise
  const second = scopes.run(active, () =>
    outcome(gatewayFetch('/members/example', { signal: active.controller.signal })),
  )
  await active.refreshRead.promise
  local.controller.abort()
  const beforeRelease = await Promise.race([first, Bun.sleep(30).then(() => ({ kind: 'pending' }))])
  rotation.resolve(Response.json({ tokens }))
  const [, secondResult] = await Promise.all([first, second])
  expect(beforeRelease.kind).toBe('rejected')
  expect(secondResult).toEqual({ kind: 'resolved' })
  expect(refreshCalls).toBe(1)
  expect(local.writes).toEqual([])
  expect(active.writes.map((write) => write.value)).toEqual(['renewed-access', 'renewed-refresh'])
})
