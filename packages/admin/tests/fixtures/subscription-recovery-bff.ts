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
