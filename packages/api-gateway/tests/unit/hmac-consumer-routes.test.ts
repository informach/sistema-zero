import { describe, expect, test } from 'bun:test'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { createHmacStrategy } from '../../src/application/auth/hmac.strategy'
import {
  consumerConfigSchema,
  routeConfigSchema,
} from '../../src/infrastructure/config/gateway-config.schema'
import { createStaticConsumerRepository } from '../../src/infrastructure/routing/consumer-registry'
import { makeContext } from '../helpers'

const secret = 'qa-only-payments-route-secret'
function subject(allowedRouteIds?: string[]) {
  return consumerConfigSchema.parse({ id: 'payments', hmacSecret: secret, allowedRouteIds })
}
async function authenticate(allowedRouteIds: string[] | undefined, routeId?: string, valid = true) {
  const timestamp = Math.floor(Date.now() / 1000)
  const path = '/messaging/send'
  const signature = signHmac(
    secret,
    canonicalHmacMessage({ method: 'POST', path, body: '{}' }),
    timestamp,
  )
  const ctx = makeContext({
    method: 'POST',
    url: `http://gw.local${path}`,
    body: '{}',
    headers: {
      'x-consumer-id': 'payments',
      'x-signature': `t=${timestamp},v1=${valid ? signature : 'invalid'}`,
    },
  })
  if (routeId)
    ctx.route = {
      route: routeConfigSchema.parse({
        id: routeId,
        methods: ['POST'],
        pathPattern: path,
        service: 'messaging',
      }),
      params: {},
      version: 'v1',
    }
  return createHmacStrategy({
    consumers: createStaticConsumerRepository([subject(allowedRouteIds)]),
    toleranceSeconds: 300,
  }).authenticate(ctx)
}

describe('HMAC consumer route capabilities', () => {
  test('valid signature grants only the declared route, including empty and unresolved denial', async () => {
    expect(await authenticate(['messaging-send'], 'messaging-send')).toEqual({
      ok: true,
      principal: { kind: 'hmac', subject: 'payments' },
    })
    for (const [routes, route] of [
      [['messaging-send'], 'auth-internal-ensure-buyer'],
      [[], 'messaging-send'],
      [['messaging-send'], undefined],
    ] as const) {
      expect(await authenticate([...routes], route)).toMatchObject({
        ok: false,
        status: 403,
        code: 'HMAC_ROUTE_FORBIDDEN',
      })
    }
  })
  test('existing consumers without capabilities keep their route behavior; invalid signature never authorizes', async () => {
    expect(await authenticate(undefined, 'auth-internal-ensure-buyer')).toMatchObject({ ok: true })
    expect(await authenticate(['messaging-send'], 'messaging-send', false)).toMatchObject({
      ok: false,
      status: 401,
    })
  })
  test('registry detaches and freezes capability lists from mutable configuration', async () => {
    const configured = subject(['messaging-send'])
    const repository = createStaticConsumerRepository([configured])
    configured.allowedRouteIds?.push('auth-internal-ensure-buyer')
    const stored = await repository.findById('payments')
    expect(stored?.allowedRouteIds).toEqual(['messaging-send'])
    expect(Object.isFrozen(stored?.allowedRouteIds)).toBe(true)
  })
  test('schema preserves an explicit deny-all and rejects invalid route identifiers', () => {
    expect(subject([]).allowedRouteIds).toEqual([])
    expect(subject().allowedRouteIds).toBeUndefined()
    expect(
      consumerConfigSchema.safeParse({ id: 'payments', hmacSecret: secret, allowedRouteIds: [''] })
        .success,
    ).toBe(false)
  })
})
