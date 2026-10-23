import { expect, test } from 'bun:test'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import realConfig from '../../gateway.config'
import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import { routeConfigSchema } from '../../src/infrastructure/config/gateway-config.schema'
import { fakeForwarder } from '../helpers'

test('hidden cover references cross the gateway only for signed member-shell calls', async () => {
  const route = realConfig.routes.find((entry) => entry.id === 'hub-studio-cover-reference')
  if (!route) throw new Error('Gateway route missing')
  const config = {
    consumers: [
      {
        id: 'member-shell',
        hmacSecret: 'cover-reference-secret-32-characters',
        allowedCidrs: ['203.0.113.0/24'],
      },
      {
        id: 'other-service',
        hmacSecret: 'other-reference-secret-32-characters',
        allowedCidrs: ['203.0.113.0/24'],
      },
    ],
    services: {
      hub: { name: 'hub', upstreamGroups: { default: [{ url: 'http://hub.local', id: 'a' }] } },
    },
    routes: [routeConfigSchema.parse(route)],
  }
  let forwarded = 0
  const app = await createApplication(loadEnv({ TRUST_PROXY: 'true', TRUSTED_PROXY_HOPS: '1' }), {
    rawConfig: config,
    forwarder: fakeForwarder(() => {
      forwarded++
      return Response.json({ status: 'hidden', coverImageUrl: 'https://art.test/cover.webp' })
    }),
  })
  const path = `/hub/internal/studio-cover/${crypto.randomUUID()}`
  const request = (headers: Record<string, string>) =>
    app.handle(
      new Request(`http://gw.local${path}?audience=adult`, {
        headers: { 'x-forwarded-for': '203.0.113.7', ...headers },
      }),
    )
  const signed = (consumer: 'member-shell' | 'other-service', secret: string) => {
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = signHmac(
      secret,
      canonicalHmacMessage({ method: 'GET', path, body: '' }),
      timestamp,
    )
    return {
      'x-consumer-id': consumer,
      'x-signature': `t=${timestamp},v1=${signature}`,
    }
  }
  try {
    expect((await request({})).status).toBe(401)
    expect((await request({ authorization: 'Bearer browser-token' })).status).toBe(401)
    expect(
      (await request(signed('other-service', 'other-reference-secret-32-characters'))).status,
    ).toBe(403)
    expect(forwarded).toBe(0)
    const allowed = await request(signed('member-shell', 'cover-reference-secret-32-characters'))
    expect(allowed.status).toBe(200)
    expect(await allowed.json()).toMatchObject({ status: 'hidden' })
    expect(forwarded).toBe(1)
  } finally {
    await app.stop()
  }
})

for (const kind of ['artifact', 'reservation'])
  test(`${kind} outbox drain is never reachable by a browser or another signed service`, async () => {
    const route = realConfig.routes.find(
      (entry) => entry.id === `hub-studio-${kind}-cleanups-drain`,
    )
    if (!route) throw new Error('Gateway route missing')
    const config = {
      consumers: [
        {
          id: 'member-shell',
          hmacSecret: 'cover-reference-secret-32-characters',
          allowedCidrs: ['203.0.113.0/24'],
        },
        {
          id: 'other-service',
          hmacSecret: 'other-reference-secret-32-characters',
          allowedCidrs: ['203.0.113.0/24'],
        },
      ],
      services: {
        hub: { name: 'hub', upstreamGroups: { default: [{ url: 'http://hub.local', id: 'a' }] } },
      },
      routes: [routeConfigSchema.parse(route)],
    }
    let forwarded = 0
    const app = await createApplication(loadEnv({ TRUST_PROXY: 'true', TRUSTED_PROXY_HOPS: '1' }), {
      rawConfig: config,
      forwarder: fakeForwarder(() => {
        forwarded++
        return Response.json({ attempted: 1 })
      }),
    })
    const path = `/hub/internal/studio-${kind}-cleanups/drain`
    const body = JSON.stringify({ audience: 'adult' })
    const signed = (consumer: 'member-shell' | 'other-service', secret: string) => {
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = signHmac(
        secret,
        canonicalHmacMessage({ method: 'POST', path, body }),
        timestamp,
      )
      return { 'x-consumer-id': consumer, 'x-signature': `t=${timestamp},v1=${signature}` }
    }
    const request = (headers: Record<string, string>) =>
      app.handle(
        new Request(`http://gw.local${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': '203.0.113.7',
            ...headers,
          },
          body,
        }),
      )
    try {
      expect((await request({})).status).toBe(401)
      expect((await request({ authorization: 'Bearer browser-token' })).status).toBe(401)
      expect(
        (await request(signed('other-service', 'other-reference-secret-32-characters'))).status,
      ).toBe(403)
      expect(forwarded).toBe(0)
      const allowed = await request(signed('member-shell', 'cover-reference-secret-32-characters'))
      expect(allowed.status).toBe(200)
      expect(await allowed.json()).toEqual({ attempted: 1 })
      expect(forwarded).toBe(1)
    } finally {
      await app.stop()
    }
  })
