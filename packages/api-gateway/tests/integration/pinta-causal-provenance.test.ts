import { expect, test } from 'bun:test'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { SignJWT } from 'jose'
import config from '../../gateway.config'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import { fakeForwarder } from '../helpers'

const paths = [
  'graph/page',
  'graph/item',
  'units/reserve',
  'units/status',
  'units/member',
  'units/attest',
  'units/commit',
  'units/abort',
  'backfill/ticket',
  'backfill/attest',
  'palette/head',
  'palette/reserve',
  'palette/ticket',
  'palette/commit',
  'palette/delete',
].map((path) => `/members/internal/creations/pinta/${path}`)
const trusted = 'test-private-pinta-member-shell-consumer-key'
const unrelated = 'test-different-consumer-private-scope-key'
const jwtSecret = 'test-private-pinta-jwt-at-least-32-characters'

test('private Pinta graph and palette paths forward only an authenticated member-shell body', async () => {
  const routes = config.routes.filter((route) => route.id.startsWith('members-pinta-causal-'))
  expect(routes.map((route) => route.pathPattern)).toEqual(paths)
  for (const route of routes)
    expect(route).toMatchObject({
      methods: ['POST'],
      service: 'members',
      auth: { required: true, strategies: ['hmac'], allowedConsumers: ['member-shell'] },
      rateLimit: { by: 'json-field', field: 'accountId' },
    })

  const forwarded: { path: string; body: string; consumer: string | null }[] = []
  const app = await createApplication(
    loadEnv({ JWT_HS256_SECRET: jwtSecret, TRUST_PROXY: 'true', TRUSTED_PROXY_HOPS: '1' }),
    {
      rawConfig: {
        consumers: [
          { id: 'member-shell', hmacSecret: trusted, allowedCidrs: ['203.0.113.0/24'] },
          { id: 'other-service', hmacSecret: unrelated, allowedCidrs: ['203.0.113.0/24'] },
        ],
        services: {
          members: {
            name: 'members',
            upstreamGroups: { default: [{ id: 'a', url: 'http://members.local' }] },
          },
        },
        routes,
      },
      forwarder: fakeForwarder(async (request) => {
        forwarded.push({
          path: request.path,
          consumer: request.headers.get('x-consumer-id'),
          body: await new Response(request.body).text(),
        })
        return Response.json({ accepted: true })
      }),
    },
  )
  const token = await new SignJWT({ role: 'customer', status: 'active' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('test-pinta-learner')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(jwtSecret))
  const body = JSON.stringify({
    userId: '11111111-1111-4111-8111-111111111111',
    accountId: '22222222-2222-4222-8222-222222222222',
    audience: 'kids',
    payload: { purpose: 'pinta-unit-content-v1' },
  })
  try {
    for (const path of paths) {
      const request = (headers: Record<string, string>, payload = body) =>
        app.handle(
          new Request(`http://gw.local${path}`, {
            method: 'POST',
            body: payload,
            headers: {
              'content-type': 'application/json',
              'x-forwarded-for': '203.0.113.7',
              ...headers,
            },
          }),
        )
      const sign = (consumer: string, key: string) => {
        const at = Math.floor(Date.now() / 1000)
        const signature = signHmac(key, canonicalHmacMessage({ method: 'POST', path, body }), at)
        return { 'x-consumer-id': consumer, 'x-signature': `t=${at},v1=${signature}` }
      }
      expect((await request({ authorization: `Bearer ${token}` })).status).toBe(401)
      expect((await request(sign('other-service', unrelated))).status).toBe(403)
      const auth = sign('member-shell', trusted)
      expect((await request(auth, body.replace('kids', 'adult'))).status).toBe(401)
      expect((await request(auth)).status).toBe(200)
    }
    expect(forwarded).toEqual(paths.map((path) => ({ path, body, consumer: 'member-shell' })))
  } finally {
    await app.stop()
  }
})
