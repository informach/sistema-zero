import { beforeEach, expect, mock, test } from 'bun:test'
import { NextResponse } from 'next/server'
import type { CallOpts } from '../../src/server/gateway'

mock.module('server-only', () => ({}))
let allowed = true
const guards: boolean[] = []
const calls: { path: string; options: CallOpts }[] = []
mock.module('../../src/server/local-admin-session', () => ({
  requireLocalAdminSession: async (_message: string, options?: { allowStaff?: boolean }) => {
    guards.push(options?.allowStaff ?? false)
    return allowed
      ? { id: 'qa-admin', role: 'admin' }
      : NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Denied QA' } }, { status: 403 })
  },
}))
mock.module('../../src/server/gateway', () => ({
  gatewayFetch: async (path: string, options: CallOpts = {}) => {
    calls.push({ path, options })
    return { status: 200, body: { configuration: null, configurationReady: false } }
  },
}))
const route = await import('../../src/app/api/payments/recovery/policy/route')
const reviewRoute = await import('../../src/app/api/payments/recovery/review/route')
const confirmRoute = await import(
  '../../src/app/api/payments/recovery/payments/[id]/confirm-period/route'
)
const confirmPaymentRoute = await import(
  '../../src/app/api/payments/recovery/operations/[id]/confirm-payment/route'
)
const admitRoute = await import('../../src/app/api/payments/recovery/payments/[id]/admit/route')
const resolveRoute = await import(
  '../../src/app/api/payments/recovery/cases/[id]/resolve-subsequent-payment/route'
)
beforeEach(() => {
  allowed = true
  guards.length = 0
  calls.length = 0
})
function request(body: string, contentType = 'application/json') {
  return new Request('https://admin.example.invalid/api/payments/recovery/policy', {
    method: 'PUT',
    headers: { 'content-type': contentType },
    body,
  })
}
test('fixed transport and local guards preserve read/write separation and no-store', async () => {
  const read = await route.GET()
  expect(read.status).toBe(200)
  expect(read.headers.get('cache-control')).toBe('private, no-store')
  const value = { expectedVersion: 1, windowDays: 7, reminderDays: [3, 6], enabled: false }
  expect((await route.PUT(request(JSON.stringify(value)))).status).toBe(200)
  expect(guards).toEqual([true, false])
  expect(calls).toEqual([
    { path: '/payments/admin/subscription-recovery/policy', options: {} },
    {
      path: '/payments/admin/subscription-recovery/policy',
      options: { method: 'PUT', body: value },
    },
  ])
})
test('denial, oversized body, malformed JSON and wrong media type never reach upstream', async () => {
  allowed = false
  expect((await route.PUT(request('{}'))).status).toBe(403)
  expect((await route.GET()).status).toBe(403)
  allowed = true
  expect((await route.PUT(request(JSON.stringify({ padding: 'x'.repeat(2_000) })))).status).toBe(
    413,
  )
  expect((await route.PUT(request('{'))).status).toBe(400)
  expect((await route.PUT(request('{}', 'text/plain'))).status).toBe(400)
  expect(calls).toHaveLength(0)
})

test('review query is read-only, guarded and bounded before forwarding', async () => {
  const request = new Request(
    'https://admin.example.invalid/api/payments/recovery/review?audience=unknown&kind=PERIOD&q=qa%40example.invalid',
  )
  const response = await reviewRoute.GET(request)
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(guards).toEqual([true])
  expect(calls[0]).toMatchObject({
    path: '/payments/admin/subscription-recovery/review',
    options: {
      query: { audience: 'unknown', kind: 'PERIOD', q: 'qa@example.invalid', limit: 25, offset: 0 },
    },
  })
  calls.length = 0
  for (const query of [
    'limit=101',
    'offset=-1',
    'audience=wrong',
    'kind=PERIOD&kind=CASE',
    'extra=raw',
    'subscriptionId=wrong',
  ])
    expect(
      (
        await reviewRoute.GET(
          new Request(`https://admin.example.invalid/api/payments/recovery/review?${query}`),
        )
      ).status,
    ).toBe(400)
  expect(calls).toHaveLength(0)
  allowed = false
  expect((await reviewRoute.GET(request)).status).toBe(403)
  expect(calls).toHaveLength(0)
})

test.each([
  'period',
  'payment',
  'admission',
  'resolution',
] as const)('confirmation %s requires write guard, bounded JSON and no arbitrary period or actor', async (kind) => {
  const confirmationRoute =
    kind === 'resolution'
      ? resolveRoute
      : kind === 'admission'
        ? admitRoute
        : kind === 'period'
          ? confirmRoute
          : confirmPaymentRoute
  const id = crypto.randomUUID()
  const context = { params: Promise.resolve({ id }) }
  const body = {
    ...(kind === 'payment' ? { expectedAttempt: 1 } : { expectedVersion: 2 }),
    ...(kind === 'admission' ? { audience: 'adult' } : {}),
    requestId: crypto.randomUUID(),
  }
  const post = (value: string) =>
    new Request('https://admin.example.invalid/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: value,
    })
  const response = await confirmationRoute.POST(post(JSON.stringify(body)), context)
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(guards).toEqual([false])
  expect(calls[0]).toMatchObject({
    path:
      kind === 'resolution'
        ? `/payments/admin/subscription-recovery/cases/${id}/resolve-subsequent-payment`
        : kind === 'admission'
          ? `/payments/admin/subscription-recovery/payments/${id}/admit`
          : kind === 'period'
            ? `/payments/admin/subscription-recovery/payments/${id}/confirm-period`
            : `/payments/admin/subscription-recovery/operations/${id}/confirm-payment`,
    options: { method: 'POST', body },
  })
  calls.length = 0
  for (const extra of [
    { period: { startsAt: '2030-01-01', endsAt: '2031-01-01' } },
    { actorId: 'forged' },
  ])
    expect(
      (await confirmationRoute.POST(post(JSON.stringify({ ...body, ...extra })), context)).status,
    ).toBe(400)
  expect(
    (await confirmationRoute.POST(post(JSON.stringify({ padding: 'x'.repeat(2000) })), context))
      .status,
  ).toBe(413)
  expect((await confirmationRoute.POST(post('{'), context)).status).toBe(400)
  allowed = false
  expect((await confirmationRoute.POST(post(JSON.stringify(body)), context)).status).toBe(403)
  expect(calls).toHaveLength(0)
})
