import { expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { adminAnalytics } from '../../src/analytics/admin'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import { analyticsReport } from '../../src/analytics/reports'
import { createAnalyticsRepo } from '../../src/analytics/repository'
import { createFunnelRepo } from '../../src/db/repo'
import { analyticsVisitors, leads, schema } from '../../src/db/schema'
import { COMUNIDADE_DOS_CRIADORES } from '../../src/funnels/comunidade-dos-criadores'
import type { PurchasedOfferSnapshotV1 } from '../../src/server/purchased-offer-snapshot'
import { createFakeGateway } from '../fakes/fake-gateway'

const offerSnapshot = (amount: number): PurchasedOfferSnapshotV1 => ({
  version: 1,
  offerId: 'qa-offer',
  offerSlug: 'qa-local',
  pricingMode: 'one_time',
  billingIntervalMonths: null,
  accessMode: 'fixed',
  accessDurationValue: 30,
  accessDurationUnit: 'days',
  listPriceCents: amount,
  couponCode: null,
  discountCents: 0,
  chargedPriceCents: amount,
  currency: 'BRL',
  guaranteeDays: 7,
  termsVersion: 'qa-only',
})

const url = process.env.ANALYTICS_TEST_DATABASE_URL
// Explicit opt-in. The test only permits local PostgreSQL and cleans its own UUID fixtures.
test.skipIf(!url)('PostgreSQL: duplicação, coorte, confirmação e revogação reais', async () => {
  const target = new URL(url!)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
    throw new Error('Analytics tests require a local database')
  const client = postgres(url!, { max: 2 })
  const db = drizzle(client, { schema })
  const analytics = createAnalyticsRepo(db)
  const business = createFunnelRepo(db)
  const now = new Date()
  const source = `qa-${crypto.randomUUID()}`
  const visitorIds: string[] = []
  const leadIds: string[] = []
  try {
    const session = await analytics.startSession({
      visitorId: null,
      environment: 'development',
      path: '/',
      device: 'mobile',
      referrerHost: null,
      now,
      attribution: {
        version: 1,
        utmSource: source,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        eventCode: null,
        initialCouponCode: null,
        landingPath: '/',
      },
    })
    visitorIds.push(session.visitorId)
    const input = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      pageViewId: crypto.randomUUID(),
      page: '/',
      revision: 'a'.repeat(64),
      name: 'page_view',
      occurredAt: now,
      receivedAt: now,
      viewport: 390,
    }
    expect(await analytics.append([input], now)).toBe(1)
    expect(await analytics.append([input], now)).toBe(0)
    const definition = quizDefinition(COMUNIDADE_DOS_CRIADORES)!
    await analytics.saveQuiz(definition)
    const lead = await business.createLead('kids/comunidade-dos-criadores', null, definition.id)
    leadIds.push(lead.id)
    await analytics.linkLead(session.id, lead.id, now)
    // Both pre-checkout and direct checkout save through this repository operation.
    await business.updateLead(lead.id, {
      nome: 'Teste local',
      email: 'qa@example.test',
      telefone: '11999999999',
    })
    const paymentId = crypto.randomUUID()
    await business.setPayment(lead.id, paymentId)
    await business.markPaid(lead.id, new Date(now.getTime() + 1000))
    const questionView = {
      ...input,
      id: crypto.randomUUID(),
      pageViewId: crypto.randomUUID(),
      page: '/kids/comunidade-dos-criadores/quiz',
      funnel: definition.funnel,
      name: 'quiz_question_view',
      quizDefinitionId: definition.id,
      quizAttemptId: lead.id,
      questionId: 'q1',
    }
    await analytics.append([questionView, { ...questionView, id: crypto.randomUUID() }], now)
    await business.saveQuizAnswers(lead.id, {}, { q1: '9_a_11' }, 'comunidade_q1', null, {
      metadata: { quiz_definition_id: definition.id, question_id: 'q1' },
      step: 'comunidade_q1',
      eventKey: `${lead.id}:answer:1`,
    })
    const report = await analyticsReport(db, {
      from: new Date(now.getTime() - 1000),
      to: new Date(now.getTime() + 60000),
      environment: 'development',
      source,
    })
    expect(report.summary).toMatchObject({
      sessions: 1,
      visitors: 1,
      contacts: 1,
      paid: 1,
      missingRevenue: 1,
    })
    expect(report.pages.find((p) => p.page === '/')).toMatchObject({
      page: '/',
      views: 1,
      viewport: 390,
    })
    expect(report.journeys).toEqual([{ route: 'Com quiz', sessions: 1, paid: 1 }])
    expect(report.quizzes[0]?.questions).toEqual([{ id: 'q1', viewed: 1, answered: 1 }])
    const retried = await business.createLead(definition.funnel)
    leadIds.push(retried.id)
    await analytics.linkLead(session.id, retried.id, now)
    const paidPayment = crypto.randomUUID()
    await business.setPayment(retried.id, paidPayment, null, { offerSnapshot: offerSnapshot(6700) })
    await business.setPayment(retried.id, crypto.randomUUID(), null, {
      offerSnapshot: offerSnapshot(39700),
    })
    await business.markPaid(retried.id, new Date(now.getTime() + 1000), paidPayment)
    const revenue = await analyticsReport(db, {
      from: new Date(now.getTime() - 1000),
      to: new Date(now.getTime() + 60000),
      environment: 'development',
      source,
    })
    expect(revenue.summary.revenue).toBe(6700)
    const direct = await business.createLead('pro/no-comando-da-ia')
    leadIds.push(direct.id)
    await analytics.linkLead(session.id, direct.id, now)
    await analytics.append(
      [
        {
          ...input,
          id: crypto.randomUUID(),
          pageViewId: crypto.randomUUID(),
          page: '/pro/no-comando-da-ia/checkout',
          funnel: 'pro/no-comando-da-ia',
        },
      ],
      now,
    )
    const scoped = await analyticsReport(db, {
      from: new Date(now.getTime() - 1000),
      to: new Date(now.getTime() + 60000),
      environment: 'development',
      source,
      funnel: 'pro/no-comando-da-ia',
    })
    expect(scoped.summary.checkout).toBe(1)
    expect(scoped.journeys).toEqual([{ route: 'Sem quiz observado', sessions: 1, paid: 0 }])
    const admin = createFakeGateway()
    const query = new URLSearchParams({
      from: new Date(now.getTime() - 86400000).toISOString().slice(0, 10),
      to: new Date(now.getTime() + 86400000).toISOString().slice(0, 10),
      environment: 'development',
      source,
      page: '/pro/no-comando-da-ia/checkout/',
    })
    const response = await adminAnalytics(
      new Request(`http://localhost/api/admin/analytics?${query}`, {
        headers: { cookie: `admin_access=${admin.auth.access}` },
      }),
      { gateway: admin.gateway, secure: false, db: () => db, log: () => {} },
    )
    expect(response.status).toBe(200)
    expect(((await response.json()) as { summary: { sessions: number } }).summary.sessions).toBe(1)
    const old = await analytics.startSession({
      visitorId: null,
      environment: 'development',
      path: '/',
      device: 'desktop',
      referrerHost: null,
      now: new Date(now.getTime() - 8 * 86400000),
      attribution: session.attribution,
    })
    visitorIds.push(old.visitorId)
    const delayed = await business.createLead(definition.funnel)
    leadIds.push(delayed.id)
    await analytics.linkLead(old.id, delayed.id, old.startedAt)
    await business.markPaid(delayed.id, now)
    const wide = await analyticsReport(db, {
      from: new Date(now.getTime() - 9 * 86400000),
      to: new Date(now.getTime() + 60000),
      environment: 'development',
      source,
    })
    expect(wide.summary).toMatchObject({ sessions: 2, paid: 1 })
    expect(
      (
        await analyticsReport(db, {
          from: new Date(now.getTime() - 86400000),
          to: new Date(now.getTime() + 60000),
          environment: 'production',
          source,
        })
      ).summary.sessions,
    ).toBe(0)
    await analytics.revoke(session.visitorId)
    expect(await analytics.session(session.id)).toBeNull()
    expect(await analytics.append([input], now)).toBe(0)
    expect(await business.getLead(lead.id)).not.toBeNull()
  } finally {
    for (const id of visitorIds)
      await db.delete(analyticsVisitors).where(eq(analyticsVisitors.id, id))
    for (const id of leadIds) await db.delete(leads).where(eq(leads.id, id))
    await client.end()
  }
})
