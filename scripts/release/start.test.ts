import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { AddressInfo } from 'node:net'
import { createMaintenanceServer } from './start.mjs'

const server = createMaintenanceServer()
let base: string
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => server.close())

test('blocks old tabs, public games, uploads and cleanup with retryable 503', async () => {
  for (const path of [
    '/api/studio/play/test',
    '/api/studio/publish',
    '/api/internal/creation-cleanups',
    '/members/webhooks/grant',
    '/hub/internal/account-deletion',
  ]) {
    for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
      const result = await fetch(base + path, { method })
      expect(result.status).toBe(503)
      expect(result.headers.get('retry-after')).toBe('60')
      expect((await result.json()).error.code).toBe('RELEASE_MAINTENANCE')
    }
  }
})

test('the platform healthcheck explicitly reports maintenance', async () => {
  for (const path of ['/readyz', '/api/healthz']) {
    const result = await fetch(base + path)
    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({ status: 'maintenance' })
    expect(result.headers.get('x-release-maintenance')).toBe('full')
  }
})

test('navigation explains the pause and keeps the work tab open', async () => {
  const result = await fetch(base, { headers: { Accept: 'text/html' } })
  expect(result.status).toBe(503)
  expect(await result.text()).toContain('mantenha a aba aberta')
  expect(result.headers.get('cache-control')).toBe('no-store')
})

test('invalid configuration fails before importing the application', async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      new URL('./start.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'),
      'missing-app.ts',
    ],
    {
      env: { ...process.env, RELEASE_MAINTENANCE_MODE: 'typo' },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const error = await new Response(child.stderr).text()
  expect(await child.exited).not.toBe(0)
  expect(error).toContain('RELEASE_MAINTENANCE_MODE must be off or full')
  expect(error).not.toContain('Cannot find module')
})
