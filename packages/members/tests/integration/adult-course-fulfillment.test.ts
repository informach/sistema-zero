import { expect, test } from 'bun:test'
import {
  buildApp,
  grantLifetime,
  offerWithCourse,
  seedSampleCourse,
  signedWebhookHeaders,
} from '../helpers'

const readLicenses = (response: Response) =>
  response.json() as Promise<{ access: Record<string, boolean> }>

test('paid adult course delivery is idempotent, uses adult licenses and revokes without changing Kids', async () => {
  const ctx = buildApp()
  const userId = crypto.randomUUID()
  const course = seedSampleCourse(ctx.courses, 'adult-paid-qa', 'published', 'adult')
  grantLifetime(ctx.entitlements, { userId, courseRef: 'estudio-completo' })
  const offer = offerWithCourse('adult-paid-qa-offer', course.slug)
  offer.items.push({
    productId: crypto.randomUUID(),
    sku: 'adult-estudio-completo',
    name: 'Estúdio adulto',
    kind: 'course',
    isPrimary: false,
    fulfillment: { accessType: 'course', courseRef: 'adult-estudio-completo' },
  })
  offer.items.push({
    productId: crypto.randomUUID(),
    sku: 'adult-mural-dos-criadores',
    name: 'Mostra adulta',
    kind: 'community',
    isPrimary: false,
    fulfillment: { accessType: 'community', courseRef: 'adult-mural-dos-criadores' },
  })
  ctx.catalog.set(offer.offerSlug, offer)
  const get = (path: string) =>
    ctx.app.handle(
      new Request(`http://localhost/members${path}`, {
        headers: { 'x-auth-user-id': userId, 'x-auth-user-status': 'active' },
      }),
    )
  const webhook = (path: string, body: unknown, deliveryId: string) => {
    const raw = JSON.stringify(body)
    return ctx.app.handle(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: signedWebhookHeaders(path, raw, deliveryId),
        body: raw,
      }),
    )
  }
  expect((await get(`/courses/${course.slug}?audience=adult`)).status).toBe(403)
  const paid = {
    userId,
    offerRef: offer.offerSlug,
    paymentId: 'adult-qa-payment',
    subscription: { subscriptionId: 'adult-qa-subscription', intervalMonths: 1 },
  }
  expect((await webhook('/members/webhooks/grant', paid, 'adult-grant-1')).status).toBe(200)
  expect((await webhook('/members/webhooks/grant', paid, 'adult-grant-1')).status).toBe(200)
  expect((await webhook('/members/webhooks/grant', paid, 'adult-grant-2')).status).toBe(200)
  expect(await ctx.entitlements.listByUserId(userId)).toHaveLength(4)
  expect((await get(`/courses/${course.slug}?audience=adult`)).status).toBe(200)
  const licenses = await readLicenses(
    await get('/access?audience=adult&refs=estudio-completo,pinta'),
  )
  expect(licenses.access).toEqual({ 'estudio-completo': true, pinta: false })
  const progress = (await (await get('/gamification/me?audience=adult')).json()) as {
    journey: { capabilities: string[] }
  }
  expect(progress.journey.capabilities).toEqual([])
  const cancel = { event: 'canceled', subscriptionId: 'adult-qa-subscription' }
  expect((await webhook('/members/webhooks/subscription', cancel, 'adult-cancel-1')).status).toBe(
    200,
  )
  expect((await webhook('/members/webhooks/subscription', cancel, 'adult-cancel-1')).status).toBe(
    200,
  )
  expect((await get(`/courses/${course.slug}?audience=adult`)).status).toBe(403)
  expect(
    (await readLicenses(await get('/access?audience=adult&refs=estudio-completo'))).access[
      'estudio-completo'
    ],
  ).toBe(false)
  expect(
    (await readLicenses(await get('/access?audience=kids&refs=estudio-completo'))).access[
      'estudio-completo'
    ],
  ).toBe(true)
})
