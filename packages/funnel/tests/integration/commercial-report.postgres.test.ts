import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { commercialReport } from '../../src/analytics/commercial-report'
import { createAnalyticsRepo } from '../../src/analytics/repository'
import { leadPayments, leads, schema } from '../../src/db/schema'

const url = process.env.ENGAGEMENT_TEST_DATABASE_URL
test.skipIf(!url)(
  'agregado comercial deduplica compra ligada a duas sessões e separa valor ausente e outra mídia',
  async () => {
    if (
      !url ||
      new URL(url).hostname !== '127.0.0.1' ||
      !['15465', '15466'].includes(new URL(url).port) ||
      new URL(url).pathname !== '/marketing_review'
    )
      throw new Error('Use o banco exclusivo da revisão')
    const client = postgres(url, { max: 2 }),
      db = drizzle(client, { schema })
    try {
      await migrate(db, {
        migrationsFolder: 'src/db/migrations',
        migrationsTable: 'funil_migrations',
      })
      const analytics = createAnalyticsRepo(db),
        now = new Date(),
        campaign = `review_${randomUUID().replaceAll('-', '')}`
      const attribution = {
        version: 1 as const,
        utmSource: 'instagram',
        utmMedium: 'dm',
        utmCampaign: campaign,
        utmContent: 'mc07_ferias',
        eventCode: null,
        initialCouponCode: null,
        landingPath: '/kids/desafio/oferta',
      }
      const input = {
        from: new Date(now.getTime() - 60000).toISOString(),
        to: new Date(now.getTime() + 60000).toISOString(),
        source: 'instagram' as const,
        campaign,
        content: 'mc07_ferias',
      }
      const paidLead = randomUUID(),
        paymentId = randomUUID(),
        noValueLead = randomUUID(),
        noValuePayment = randomUUID(),
        oldLead = randomUUID(),
        otherLead = randomUUID(),
        noIdentity = randomUUID()
      await db.insert(leads).values([
        {
          id: paidLead,
          attribution,
          paidPaymentId: paymentId,
          paidAt: now,
          createdAt: new Date(now.getTime() - 1000),
        },
        {
          id: noValueLead,
          attribution,
          paidPaymentId: noValuePayment,
          paidAt: now,
          createdAt: new Date(now.getTime() - 1000),
        },
        {
          id: oldLead,
          attribution,
          paidPaymentId: randomUUID(),
          paidAt: now,
          createdAt: new Date(now.getTime() - 30 * 86400000),
        },
        {
          id: otherLead,
          attribution: { ...attribution, utmCampaign: 'another_source' },
          paidPaymentId: randomUUID(),
          paidAt: now,
          createdAt: new Date(now.getTime() - 1000),
        },
        { id: noIdentity, attribution, paidAt: now, createdAt: new Date(now.getTime() - 1000) },
        {
          id: randomUUID(),
          attribution: { ...attribution, utmMedium: 'cpc' },
          paidPaymentId: randomUUID(),
          paidAt: now,
          createdAt: new Date(now.getTime() - 1000),
        },
      ])
      await db.insert(leadPayments).values([
        { paymentId, leadId: paidLead, offerSnapshot: { chargedPriceCents: 12345 } },
        { paymentId: noValuePayment, leadId: noValueLead },
      ])
      for (let i = 0; i < 2; i++) {
        const session = await analytics.startSession({
          visitorId: null,
          environment: 'production',
          path: '/kids/desafio/oferta',
          device: 'mobile',
          referrerHost: null,
          now,
          attribution,
        })
        await analytics.append(
          [
            {
              id: randomUUID(),
              sessionId: session.id,
              pageViewId: randomUUID(),
              page: '/kids/desafio/oferta',
              revision: 'a'.repeat(64),
              name: 'page_view',
              occurredAt: now,
              receivedAt: now,
            },
          ],
          now,
        )
        await analytics.linkLead(session.id, paidLead, now)
        await analytics.linkLead(session.id, oldLead, now)
        await analytics.linkLead(session.id, otherLead, now)
        const reused = await analytics.startSession({
          visitorId: session.visitorId,
          environment: 'production',
          path: '/',
          device: 'mobile',
          referrerHost: null,
          now,
          attribution: { ...attribution, utmCampaign: 'different' },
        })
        expect(reused.id).toBe(session.id)
        expect(reused.attribution?.utmCampaign).toBe(campaign)
      }
      const report = await commercialReport(db, input)
      expect(report).toMatchObject({
        sessions: 2,
        newLeads: 3,
        paidPurchases: 2,
        knownRevenueCents: 12345,
        missingRevenue: 1,
        missingPaymentIdentity: 1,
        oldOrOtherSourceLeads: 2,
      })
      const missing = await commercialReport(db, {
        ...input,
        campaign: `none_${randomUUID().replaceAll('-', '')}`,
      })
      expect(missing.sessions).toBeNull()
      expect(missing.collection).toBe('no-observations')
      expect(JSON.stringify(report)).not.toContain(paidLead)
      expect(JSON.stringify(report)).not.toContain(paymentId)
    } finally {
      await client.end()
    }
  },
)
