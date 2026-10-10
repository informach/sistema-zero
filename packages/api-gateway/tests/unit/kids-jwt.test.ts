import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { SignJWT } from 'jose'
import { createJwtStrategy } from '../../src/application/auth/jwt.strategy'
import { makeContext } from '../helpers'

const secret = 'isolated-kids-gateway-test-secret-32'
const student = {
  kind: 'student',
  sessionId: randomUUID(),
  deviceId: randomUUID(),
  grantId: randomUUID(),
}
async function context(path: string, claims: Record<string, unknown>) {
  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(randomUUID())
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret))
  return makeContext({
    url: `http://gateway.test${path}`,
    headers: { authorization: `Bearer ${token}` },
  })
}
test('revogação canônica barra JWT ainda válido; indisponibilidade também falha fechada', async () => {
  let valid = true
  const strategy = createJwtStrategy({
    hs256Secret: secret,
    validateKidsSession: async () => valid,
  })
  const ctx = await context('/members/me', { kids: student, pfl: { accountId: randomUUID() } })
  expect((await strategy.authenticate(ctx)).ok).toBe(true)
  valid = false
  expect(await strategy.authenticate(ctx)).toMatchObject({ ok: false, status: 401 })
  const offline = createJwtStrategy({
    hs256Secret: secret,
    validateKidsSession: async () => {
      throw new Error('offline')
    },
  })
  expect(await offline.authenticate(ctx)).toMatchObject({ ok: false, status: 503 })
})
test('aluno não usa finanças nem área adulta e responsável não usa área infantil', async () => {
  const strategy = createJwtStrategy({ hs256Secret: secret, validateKidsSession: async () => true })
  expect(
    (
      await strategy.authenticate(
        await context(`/auth/internal/profiles/${randomUUID()}/public`, { kids: student }),
      )
    ).ok,
  ).toBe(true)
  for (const path of [
    '/payments/my/orders',
    '/members/parents/dashboard',
    '/auth/profiles/abc/select',
  ]) {
    expect(await strategy.authenticate(await context(path, { kids: student }))).toMatchObject({
      ok: false,
      status: 403,
    })
  }
  const parent = {
    kind: 'parent',
    sessionId: randomUUID(),
    authenticatedAt: Math.floor(Date.now() / 1000),
  }
  expect(await strategy.authenticate(await context('/members/me', { kids: parent }))).toMatchObject(
    { ok: false, status: 403 },
  )
  expect(
    (await strategy.authenticate(await context('/payments/my/orders', { kids: parent }))).ok,
  ).toBe(true)
})
test('perfil legado precisa do novo login; conta adulta de outro produto continua válida', async () => {
  const strategy = createJwtStrategy({ hs256Secret: secret })
  expect(
    await strategy.authenticate(await context('/members/me', { pfl: { accountId: randomUUID() } })),
  ).toMatchObject({ ok: false, status: 401 })
  expect((await strategy.authenticate(await context('/members/me', {}))).ok).toBe(true)
})
