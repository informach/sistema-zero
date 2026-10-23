import { expect, test } from 'bun:test'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { SignJWT } from 'jose'
import realConfig from '../../gateway.config'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import { fakeForwarder } from '../helpers'

const jwtSecret = 'qa-studio-jwt-secret-at-least-32-characters'
const consumerSecret = 'qa-studio-consumer-secret-at-least-32-characters'
const otherSecret = 'qa-other-consumer-secret-at-least-32-characters'
const ids = [
  'hub-showcase-create-studio',
  'hub-showcase-create-studio-standalone',
  'hub-showcase-create-studio-prepare',
  'hub-showcase-create-studio-standalone-prepare',
]

test('both actual Studio publication routes require the BFF and retain current authorization policy', () => {
  for (const id of ids) {
    const route = realConfig.routes.find((entry) => entry.id === id)
    expect(route).toMatchObject({
      methods: ['POST'],
      service: 'hub',
      auth: {
        required: true,
        mode: 'all',
        strategies: ['jwt', 'hmac'],
        allowedConsumers: ['member-shell'],
      },
      authorize: { statuses: ['active'] },
      rateLimit: { max: 30, windowMs: 60_000, by: 'principal' },
    })
  }
})

test.each([
  ['jwt', 'hmac'],
  ['hmac', 'jwt'],
] as const)('real JWT and HMAC preserve the student and restrict the consumer in order %s/%s', async (first, second) => {
  const routes = ids.map((id) => {
    const route = realConfig.routes.find((entry) => entry.id === id)
    if (!route || route.auth === 'public' || !route.auth) throw new Error('Required route missing')
    return { ...route, auth: { ...route.auth, strategies: [first, second] } }
  })
  const forwarded: Headers[] = []
  const forwardedBodies: string[] = []
  const app = await createApplication(
    loadEnv({
      JWT_HS256_SECRET: jwtSecret,
      TRUST_PROXY: 'true',
      TRUSTED_PROXY_HOPS: '1',
    }),
    {
      rawConfig: {
        consumers: [
          { id: 'member-shell', hmacSecret: consumerSecret, allowedCidrs: ['203.0.113.0/24'] },
          { id: 'other-service', hmacSecret: otherSecret, allowedCidrs: ['203.0.113.0/24'] },
        ],
        services: {
          hub: { name: 'hub', upstreamGroups: { default: [{ url: 'http://hub.local', id: 'a' }] } },
        },
        routes,
      },
      forwarder: fakeForwarder(async (request) => {
        forwarded.push(new Headers(request.headers))
        forwardedBodies.push(await new Response(request.body).text())
        return Response.json({ accepted: true })
      }),
    },
  )
  const token = (status = 'active') =>
    new SignJWT({
      role: 'customer',
      status,
      email: 'qa@example.invalid',
      firstName: 'QA',
      lastName: 'Student',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('canonical-student')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(jwtSecret))
  const bearer = await token()
  const inactive = await token('inactive')
  try {
    for (const route of routes) {
      const body = JSON.stringify({ playId: crypto.randomUUID(), coverImageUrl: null })
      const signed = (
        consumer = 'member-shell',
        secret = consumerSecret,
        timestamp = Math.floor(Date.now() / 1000),
      ) => ({
        'x-consumer-id': consumer,
        'x-signature': `t=${timestamp},v1=${signHmac(secret, canonicalHmacMessage({ method: 'POST', path: route.pathPattern, body }), timestamp)}`,
      })
      const request = (headers: Record<string, string>, payload = body) =>
        app.handle(
          new Request(`http://gw.local${route.pathPattern}`, {
            method: 'POST',
            body: payload,
            headers: {
              'content-type': 'application/json',
              'x-forwarded-for': '203.0.113.7',
              ...headers,
            },
          }),
        )
      forwarded.length = 0
      forwardedBodies.length = 0
      expect((await request({ authorization: `Bearer ${bearer}` })).status).toBe(401)
      expect((await request(signed())).status).toBe(401)
      expect((await request({ authorization: 'Bearer invalid', ...signed() })).status).toBe(401)
      expect(
        (
          await request({
            authorization: `Bearer ${bearer}`,
            ...signed('other-service', otherSecret),
          })
        ).status,
      ).toBe(403)
      expect(
        (
          await request({
            authorization: `Bearer ${bearer}`,
            ...signed('member-shell', consumerSecret, 1),
          })
        ).status,
      ).toBe(401)
      expect(
        (
          await request(
            { authorization: `Bearer ${bearer}`, ...signed() },
            JSON.stringify({ different: true }),
          )
        ).status,
      ).toBe(401)
      expect((await request({ authorization: `Bearer ${inactive}`, ...signed() })).status).toBe(403)
      expect(
        (
          await request({
            authorization: `Bearer ${bearer}`,
            ...signed(),
            'x-forwarded-for': '198.51.100.1',
          })
        ).status,
      ).toBe(403)
      expect(forwarded).toHaveLength(0)
      const allowed = await request({
        authorization: `Bearer ${bearer}`,
        ...signed(),
        'x-auth-user-id': 'forged-user',
        'x-auth-user-role': 'admin',
        'x-internal-token': 'forged-internal',
      })
      expect(allowed.status).toBe(200)
      expect(forwarded).toHaveLength(1)
      expect(forwardedBodies).toEqual([body])
      expect(forwarded[0]?.get('x-auth-user-id')).toBe('canonical-student')
      expect(forwarded[0]?.get('x-auth-user-role')).toBe('customer')
      expect(forwarded[0]?.get('x-auth-user-status')).toBe('active')
      expect(forwarded[0]?.has('authorization')).toBe(false)
      expect(forwarded[0]?.has('x-signature')).toBe(false)
      expect(forwarded[0]?.has('x-consumer-id')).toBe(false)
      expect(forwarded[0]?.get('x-internal-token')).not.toBe('forged-internal')
    }
  } finally {
    await app.stop()
  }
})
