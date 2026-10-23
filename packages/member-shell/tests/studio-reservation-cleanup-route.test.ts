import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { reservationFixture } from './fixtures/studio-reservation'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'reservation-test-secret-with-32-characters'
const env = await import('../src/lib/env')
const cleanup = await import('../src/server/studio-reservation-cleanup')
const { createStudioRoutes } = await import('../src/routes/studio')
afterEach(() => mock.restore())
const secret = 'reservation-hmac-test-with-32-characters'
const path = '/api/studio/reservation-cleanup'

function fixture(audience: 'kids' | 'adult' = 'kids') {
  spyOn(env, 'getEnv').mockReturnValue({ ...env.getEnv(), GATEWAY_HMAC_SECRET: secret })
  const retire = spyOn(cleanup, 'retireStudioReservation').mockResolvedValue(undefined)
  const routes = createStudioRoutes({ audience, media: {}, members: {}, hub: {} } as never)
  const value = reservationFixture({ audience })
  const request = (
    payload: unknown = value,
    changes: { signedPath?: string; headerDelivery?: string; tampered?: boolean } = {},
  ) => {
    const body = JSON.stringify(payload)
    const ts = Math.floor(Date.now() / 1000)
    const digest = signHmac(
      secret,
      canonicalHmacMessage({
        method: 'POST',
        path: changes.signedPath ?? path,
        deliveryId: value.deliveryId,
        body,
      }),
      ts,
    )
    return new Request(`https://test.invalid${path}`, {
      method: 'POST',
      body: changes.tampered ? `${body} ` : body,
      headers: {
        'x-signature': `t=${ts},v1=${digest}`,
        'x-delivery-id': changes.headerDelivery ?? value.deliveryId,
      },
    })
  }
  return { retire, value, request, route: routes.studioReservationCleanup.POST }
}

test('Hub canonical delivery signature receives ACK only after confirmed retirement, for both audiences', async () => {
  for (const audience of ['kids', 'adult'] as const) {
    const f = fixture(audience)
    expect((await f.route(f.request())).status).toBe(204)
    expect(f.retire).toHaveBeenCalledWith(f.value, expect.any(AbortSignal))
    f.retire.mockRejectedValueOnce(new Error('Runtime unavailable'))
    expect((await f.route(f.request())).status).toBe(503)
    mock.restore()
  }
})

test('cross-path, altered body, delivery header and wrong audience never touch storage', async () => {
  const f = fixture()
  for (const options of [
    { signedPath: '/api/studio/cleanup' },
    { tampered: true },
    { headerDelivery: 'forged' },
  ])
    expect((await f.route(f.request(f.value, options))).status).toBe(401)
  const adult = {
    ...f.value,
    audience: 'adult',
    accountId: f.value.authorId,
    context: { kind: 'free', audience: 'adult' },
  }
  expect((await f.route(f.request(adult))).status).toBe(400)
  expect(f.retire).not.toHaveBeenCalled()
})
