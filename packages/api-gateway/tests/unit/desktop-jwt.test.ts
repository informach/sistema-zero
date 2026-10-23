import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { SignJWT } from 'jose'
import { createJwtStrategy } from '../../src/application/auth/jwt.strategy'
import {
  injectIdentityHeaders,
  stripIdentityHeaders,
} from '../../src/infrastructure/proxy/header-rules'
import { makeContext } from '../helpers'

const secret = 'desktop-marketing-isolated-test-secret'
const desktop = { app: 'marketing', deviceId: randomUUID(), sessionId: randomUUID() }
async function context(path: string, extra: Record<string, unknown> = {}) {
  const token = await new SignJWT({ typ: 'access', desktop, ...extra })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(randomUUID())
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret))
  return makeContext({
    url: `http://gateway.test${path}`,
    headers: { authorization: `Bearer ${token}` },
  })
}
test('revogação e indisponibilidade rejeitam JWT desktop ainda vigente', async () => {
  let valid = true
  const strategy = createJwtStrategy({
    hs256Secret: secret,
    validateDesktopSession: async () => valid,
  })
  const ctx = await context('/marketing/workspace/projects')
  expect((await strategy.authenticate(ctx)).ok).toBe(true)
  valid = false
  expect(await strategy.authenticate(ctx)).toMatchObject({
    ok: false,
    status: 401,
    code: 'DEVICE_REVOKED',
  })
  const offline = createJwtStrategy({
    hs256Secret: secret,
    validateDesktopSession: async () => {
      throw new Error('offline')
    },
  })
  expect(await offline.authenticate(ctx)).toMatchObject({ ok: false, status: 503 })
})
test('escopo e claim desktop não podem acessar outro produto ou misturar contexto', async () => {
  let checks = 0
  const strategy = createJwtStrategy({
    hs256Secret: secret,
    validateDesktopSession: async () => {
      checks++
      return true
    },
  })
  for (const path of [
    '/payments/my/orders',
    '/members/admin/courses',
    '/marketing/%2e%2e/payments',
    '/marketing%2fworkspace/projects',
  ]) {
    expect((await strategy.authenticate(await context(path))).ok).toBe(false)
  }
  expect(checks).toBe(0)
  expect(
    await strategy.authenticate(await context('/marketing/workspace/projects', { typ: 'reset' })),
  ).toMatchObject({ status: 401 })
  expect(
    await strategy.authenticate(
      await context('/marketing/workspace/projects', {
        desktop: { ...desktop, deviceId: 'invalid' },
      }),
    ),
  ).toMatchObject({ status: 401 })
  expect(
    await strategy.authenticate(
      await context('/marketing/workspace/projects', { act: { sub: randomUUID() } }),
    ),
  ).toMatchObject({ status: 401 })
})
test('identidade do computador é removida da entrada e injetada só pelo gateway', () => {
  const headers = new Headers({ 'x-auth-desktop-device-id': randomUUID() })
  stripIdentityHeaders(headers)
  expect(headers.has('x-auth-desktop-device-id')).toBe(false)
  injectIdentityHeaders(headers, {
    id: randomUUID(),
    email: 'test@example.test',
    firstName: 'Test',
    lastName: 'User',
    role: 'staff',
    status: 'active',
    desktopDeviceId: desktop.deviceId,
  })
  expect(headers.get('x-auth-desktop-device-id')).toBe(desktop.deviceId)
})
