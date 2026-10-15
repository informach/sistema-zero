import { expect, test } from 'bun:test'
import { type CredentialVault, StaffClient } from '../src/sistemazero/auth'

test('staff client serializes refresh, never exposes credentials and disconnects on revocation', async () => {
  const secrets = new Map<string, string>()
  const vault: CredentialVault = {
    async get(key) {
      return secrets.get(key) ?? null
    },
    async set(key, value) {
      secrets.set(key, value)
    },
    async delete(key) {
      secrets.delete(key)
    },
  }
  let refreshes = 0,
    revoked = false
  const user = {
    id: crypto.randomUUID(),
    email: 'fixture@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    status: 'active',
  }
  const access = 'fixture-access-secret',
    refresh = 'fixture-refresh-secret-of-length'
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname
      if (path === '/auth/otp/verify')
        return Response.json({
          user,
          tokens: {
            accessToken: access,
            refreshToken: refresh,
            tokenType: 'Bearer',
            expiresIn: 1,
            refreshExpiresIn: 3600,
          },
        })
      if (path === '/auth/refresh') {
        refreshes++
        expect(await request.json()).toEqual({ refreshToken: refresh })
        await Bun.sleep(20)
        return Response.json({
          tokens: {
            accessToken: `${access}-new`,
            refreshToken: `${refresh}-new`,
            tokenType: 'Bearer',
            expiresIn: 3600,
            refreshExpiresIn: 3600,
          },
        })
      }
      if (path === '/auth/staff/operations') {
        if (revoked) return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
        const body = await request.json()
        expect(body.refreshToken).toBe(`${refresh}-new`)
        expect(request.headers.get('authorization')).toBe(`Bearer ${access}-new`)
        return Response.json({ user })
      }
      return Response.json({ user })
    },
  })
  const client = new StaffClient(server.url.origin, vault)
  try {
    const login = await client.verifyCode(user.email, '123456')
    expect(JSON.stringify(login)).not.toContain(refresh)
    const results = await Promise.all([
      client.operation({ action: 'identity' }),
      client.operation({ action: 'identity' }),
    ])
    expect(refreshes).toBe(1)
    expect(JSON.stringify(results)).not.toContain(refresh)
    revoked = true
    expect(await client.status()).toMatchObject({ connected: false })
    expect(secrets.size).toBe(0)
    await expect(client.operation({ action: 'identity' })).rejects.toThrow('LOGIN_REQUIRED')
  } finally {
    await server.stop(true)
  }
})
