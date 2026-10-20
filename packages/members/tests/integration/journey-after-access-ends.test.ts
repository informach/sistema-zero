import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { AdultCreatorCapability, AdultJourneyView } from '@sistemazero/core/journey'
import {
  buildApp,
  grantCommunityProduct,
  offerWithCourse,
  seedSampleCourse,
  signedWebhookHeaders,
} from '../helpers'

/**
 * Fim do acesso (assinatura vencida ou expirada pelo provedor) não leva embora o que a pessoa
 * conquistou: a etapa da jornada, as capacidades congeladas e a paleta do Estúdio ficam. O que
 * para de abrir são as ferramentas, que continuam exigindo a licença.
 */

const NOW = new Date('2026-10-20T12:00:00Z')
type Context = ReturnType<typeof buildApp>

function webhook(ctx: Context, path: string, body: unknown, deliveryId: string) {
  const raw = JSON.stringify(body)
  return ctx.app.handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: signedWebhookHeaders(path, raw, deliveryId),
      body: raw,
    }),
  )
}

async function adultSetup() {
  const ctx = buildApp({ now: NOW })
  const userId = randomUUID()
  const course = seedSampleCourse(ctx.courses, `adulto-fim-${userId.slice(0, 6)}`)
  const row = ctx.courses.courses.find((item) => item.id === course.courseId)
  if (!row) throw new Error('curso ausente')
  row.metadata = { studioUnlockBlocks: ['sz_bloco_do_curso'] }
  const next = seedSampleCourse(ctx.courses, `adulto-fim-2-${userId.slice(0, 6)}`)
  await ctx.adultJourney.configure(
    {
      schemaVersion: 1,
      stages: [
        {
          id: 'aprendiz',
          title: 'Aprendiz',
          requirements: [{ courseId: course.courseId, milestone: 'showcase' }],
          capabilities: ['studio', 'pinta'],
        },
        {
          id: 'construtor',
          title: 'Construtor(a)',
          requirements: [{ courseId: next.courseId, milestone: 'complete' }],
          capabilities: [],
        },
      ],
    },
    0,
  )
  // A Comunidade adulta por assinatura mensal: curso + Estúdio adulto.
  const offer = offerWithCourse(`oferta-${userId.slice(0, 6)}`, course.slug)
  offer.items.push({
    productId: randomUUID(),
    sku: 'adult-estudio-completo',
    name: 'Estúdio adulto',
    kind: 'course',
    isPrimary: false,
    fulfillment: { accessType: 'course', courseRef: 'adult-estudio-completo' },
  })
  ctx.catalog.set(offer.offerSlug, offer)
  const subscriptionId = `sub-${userId}`
  const paid = {
    userId,
    offerRef: offer.offerSlug,
    paymentId: `pay-${userId}`,
    subscription: { subscriptionId, intervalMonths: 1 },
  }
  expect((await webhook(ctx, '/members/webhooks/grant', paid, `grant-${userId}`)).status).toBe(200)
  await ctx.gamification.award({
    userId,
    accountId: userId,
    audience: 'adult',
    privileged: false,
    events: [
      { sourceType: 'course_complete', sourceId: course.courseId, amount: 0 },
      { sourceType: 'course_showcased', sourceId: course.courseId, amount: 0 },
    ],
    today: '2026-10-20',
    now: NOW,
  })
  const request = (path: string, method = 'GET', body?: unknown) =>
    ctx.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: {
          'x-auth-user-id': userId,
          'x-auth-user-status': 'active',
          'content-type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const upload = () =>
    request('/creations/studio/meu-jogo/upload?audience=adult', 'POST', {
      name: 'Jogo',
      kind: 'classic',
      formatVersion: 2,
      itemUpdatedAt: '2026-10-20T12:00:00Z',
      bytes: 100,
    })
  const state = async () => {
    const me = (await (await request('/gamification/me?audience=adult')).json()) as {
      journey: AdultJourneyView
    }
    const unlocks = (await (await request('/studio/unlocks?audience=adult')).json()) as {
      blocks: string[]
    }
    return {
      capabilities: me.journey.capabilities,
      stages: me.journey.stages.map((stage) => stage.completed),
      position: (await ctx.adultJourney.positions([userId])).get(userId)?.position,
      blocks: unlocks.blocks,
      frozen: await ctx.adultJourneyRepository.listGranted(userId),
      reached: await ctx.adultJourneyRepository.getReached(userId),
    }
  }
  return { ctx, userId, subscriptionId, upload, state }
}

const earnedCapabilities: AdultCreatorCapability[] = ['studio', 'pinta']
const expectedAdult = {
  capabilities: earnedCapabilities,
  stages: [true, false],
  position: 2,
  blocks: ['sz_bloco_do_curso'],
  frozen: earnedCapabilities,
  reached: 2,
}

test('adulto: assinatura vencida pela varredura (expireLapsed) mantém etapa, capacidades e paleta; ferramenta volta a exigir licença', async () => {
  const f = await adultSetup()
  expect((await f.upload()).status).toBe(200)
  expect(await f.state()).toEqual(expectedAdult)

  // Passa o fim do período pago (mês + carência) e roda a mesma varredura do ciclo de retenção.
  const later = new Date('2027-01-20T12:00:00Z')
  f.ctx.clockRef.now = later
  expect(await f.ctx.entitlements.expireLapsed(later, 100)).toBeGreaterThan(0)
  const statuses = (await f.ctx.entitlements.listByUserId(f.userId)).map((e) => e.status)
  expect(statuses.every((status) => status === 'expired')).toBe(true)

  expect(await f.state()).toEqual(expectedAdult)
  expect((await f.upload()).status).toBe(403)
})

test('adulto: assinatura expirada pelo provedor (webhook expired) mantém etapa, capacidades e paleta', async () => {
  const f = await adultSetup()
  expect(await f.state()).toEqual(expectedAdult)
  const expired = { event: 'expired', subscriptionId: f.subscriptionId }
  expect(
    (await webhook(f.ctx, '/members/webhooks/subscription', expired, `exp-${f.userId}`)).status,
  ).toBe(200)
  expect(await f.state()).toEqual(expectedAdult)
  expect((await f.upload()).status).toBe(403)
})

test('Kids: o posto e as capacidades conquistadas ficam depois que a assinatura da conta vence', async () => {
  const ctx = buildApp({ now: NOW })
  const profileId = randomUUID()
  const accountId = randomUUID()
  ctx.kidsJourneySnapshots.earned.set(profileId, {
    level: 'hacker',
    capabilities: ['studio', 'pinta', 'molda'],
    courseAccess: { entry: ['primeiros-passos-2d', 'iniciante-2d'], expanded: [], reward: [] },
  })
  const grant = grantCommunityProduct(ctx.entitlements, {
    userId: accountId,
    sku: 'estudio-completo',
    now: NOW,
  })
  const kids = (path: string) =>
    ctx.app.handle(
      new Request(`http://localhost/members${path}`, {
        headers: {
          'x-auth-user-id': profileId,
          'x-auth-account-id': accountId,
          'x-auth-kids-context': 'student',
        },
      }),
    )
  const earned = async () => {
    const response = await kids('/gamification/me?audience=kids')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      level: { slug: string }
      kidsJourney: { earned: { level: string; capabilities: string[] } }
    }
    return { level: body.level.slug, earned: body.kidsJourney.earned }
  }
  const license = async () =>
    (
      (await (await kids('/access?audience=kids&refs=estudio-completo')).json()) as {
        access: Record<string, boolean>
      }
    ).access['estudio-completo']

  const before = await earned()
  expect(before.level).toBe('hacker')
  expect(before.earned.level).toBe('hacker')
  expect(before.earned.capabilities).toEqual(expect.arrayContaining(['studio', 'pinta', 'molda']))
  expect(await license()).toBe(true)

  grant.expire(NOW)
  ctx.entitlements.seed(grant)
  expect(await license()).toBe(false)
  expect(await earned()).toEqual(before)
  expect(ctx.kidsJourneySnapshots.earned.get(profileId)).toMatchObject({
    level: 'hacker',
    capabilities: ['studio', 'pinta', 'molda'],
  })
})
