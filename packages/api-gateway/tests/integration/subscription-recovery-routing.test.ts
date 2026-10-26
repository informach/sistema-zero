import { expect, test } from 'bun:test'
import { SignJWT } from 'jose'
import config from '../../gateway.config'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import { fakeForwarder } from '../helpers'

const secret = 'qa-financial-route-jwt-secret-longer-than-32-characters'
const routes = config.routes.filter(
  (route) =>
    route.id.startsWith('payments-admin-recovery-') || route.id.startsWith('payments-my-retry-'),
)
test('actual financial routes enforce JWT, role, active status and bounded writes before the service', async () => {
  const seen: { path: string; actor: string | null; role: string | null }[] = []
  const app = await createApplication(
    loadEnv({ JWT_HS256_SECRET: secret, TRUST_PROXY: 'true', TRUSTED_PROXY_HOPS: '1' }),
    {
      rawConfig: {
        services: {
          payments: {
            name: 'payments',
            upstreamGroups: { default: [{ url: 'http://payments.qa.invalid', id: 'qa' }] },
          },
        },
        routes,
      },
      forwarder: fakeForwarder((request) => {
        const h = new Headers(request.headers)
        seen.push({
          path: request.path,
          actor: h.get('x-auth-user-id'),
          role: h.get('x-auth-user-role'),
        })
        return Response.json({ verified: true })
      }),
    },
  )
  const token = async (role: string, status = 'active') =>
    new SignJWT({
      role,
      status,
      email: 'qa@example.invalid',
      firstName: 'QA',
      lastName: 'Operator',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(`qa-${role}`)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(secret))
  try {
    expect(routes.length).toBe(11) // policy read/write plus nine previously missing endpoints
    for (const route of routes) {
      const method = route.methods[0]
      if (!method) throw Error('Missing method')
      const path = route.pathPattern
        .replaceAll(':id', '00000000-0000-4000-8000-000000000001')
        .replaceAll(':intentId', '00000000-0000-4000-8000-000000000002')
      const call = async (role?: string, status = 'active', body = '{}') =>
        app.handle(
          new Request(`http://gateway.qa.invalid${path}`, {
            method,
            headers: {
              'x-forwarded-for': '203.0.113.40',
              ...(role ? { authorization: `Bearer ${await token(role, status)}` } : {}),
              'content-type': 'application/json',
              ...(method === 'GET'
                ? {}
                : { 'content-length': String(new TextEncoder().encode(body).length) }),
              'x-auth-user-id': 'forged-actor',
            },
            ...(method === 'GET' ? {} : { body }),
          }),
        )
      const before = seen.length
      expect((await call()).status).toBe(401)
      expect((await call('admin', 'inactive')).status).toBe(403)
      const own = route.id.startsWith('payments-my-')
      expect((await call('customer')).status).toBe(own ? 200 : 403)
      expect((await call('staff')).status).toBe(own || method === 'GET' ? 200 : 403)
      expect((await call('admin')).status).toBe(200)
      expect(seen.at(-1)).toMatchObject({ actor: 'qa-admin', role: 'admin' })
      if (method !== 'GET') {
        const forwarded = seen.length
        expect((await call('admin', 'active', 'x'.repeat(1025))).status).toBe(413)
        expect(seen.length).toBe(forwarded)
      }
      expect(seen.length).toBeGreaterThan(before)
    }
  } finally {
    await app.stop()
  }
})
