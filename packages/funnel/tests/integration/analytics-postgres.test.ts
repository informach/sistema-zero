import { expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { quizDefinition } from '../../src/analytics/quiz-definition'
import { analyticsReport } from '../../src/analytics/reports'
import { createAnalyticsRepo } from '../../src/analytics/repository'
import { createFunnelRepo } from '../../src/db/repo'
import { analyticsVisitors, leads, schema } from '../../src/db/schema'
import { COMUNIDADE_DOS_CRIADORES } from '../../src/funnels/comunidade-dos-criadores'

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
    await business.insertEvent(
      lead.id,
      'contact_saved',
      'contact',
      null,
      `${lead.id}:contact_saved`,
      now,
    )
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
    await business.insertEvent(lead.id, 'quiz_answer_saved', 'comunidade_q1', {
      quiz_definition_id: definition.id,
      question_id: 'q1',
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
