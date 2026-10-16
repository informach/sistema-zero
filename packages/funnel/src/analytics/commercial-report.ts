import { type CommercialQuery, commercialReportSchema } from '@sistemazero/marketing-contracts'
import { sql } from 'drizzle-orm'
import type { Database } from '../db/client'

/** Sessions and leads retain their own first touch. Purchases never join the many-session link. */
export async function commercialReport(db: Database, input: CommercialQuery, now = new Date()) {
  const rows = await db.execute(sql`with sessions as (
    select s.id from funil.analytics_sessions s where s.started_at >= ${input.from}::timestamptz and s.started_at < ${input.to}::timestamptz
    and s.environment='production' and s.attribution->>'utmSource'=${input.source}
    and s.attribution->>'utmMedium'='dm'
    and s.attribution->>'utmCampaign'=${input.campaign} and s.attribution->>'utmContent'=${input.content}
  ), cohort as (
    select l.* from funil.leads l where l.created_at >= ${input.from}::timestamptz and l.created_at < ${input.to}::timestamptz
    and l.attribution->>'utmSource'=${input.source} and l.attribution->>'utmCampaign'=${input.campaign}
    and l.attribution->>'utmMedium'='dm'
    and l.attribution->>'utmContent'=${input.content}
  ), paid as (
    select distinct l.paid_payment_id from cohort l where l.paid_payment_id is not null
    and l.paid_at >= l.created_at and l.paid_at < l.created_at + interval '7 days'
  ), purchases as (
    select paid.paid_payment_id, case when p.offer_snapshot->>'chargedPriceCents' ~ '^[0-9]{1,9}$'
      then (p.offer_snapshot->>'chargedPriceCents')::bigint end amount
    from paid left join funil.lead_payments p on p.payment_id=paid.paid_payment_id
  ) select (select count(*)::int from sessions) sessions,
    (select max(e.received_at)::text from funil.analytics_events e join sessions s on s.id=e.session_id) "lastEvent",
    (select count(*)::int from cohort) "newLeads",
    (select count(*)::int from purchases) "paidPurchases",
    (select coalesce(sum(amount),0)::float8 from purchases) "knownRevenueCents",
    (select count(*)::int from purchases where amount is null) "missingRevenue",
    (select count(*)::int from cohort l where l.paid_payment_id is null and l.paid_at >= l.created_at and l.paid_at < l.created_at + interval '7 days') "missingPaymentIdentity",
    (select count(distinct a.lead_id)::int from funil.analytics_lead_links a join sessions s on s.id=a.session_id
      where not exists(select 1 from cohort c where c.id=a.lead_id)) "oldOrOtherSourceLeads"`)
  const row = rows[0]
  if (!row) throw new Error('Relatório não retornou resultado')
  const lastEvent = typeof row.lastEvent === 'string' ? new Date(row.lastEvent).toISOString() : null
  return commercialReportSchema.parse({
    ...row,
    schemaVersion: 1,
    medium: 'dm',
    from: input.from,
    to: input.to,
    asOf: now.toISOString(),
    campaign: input.campaign,
    content: input.content,
    sessionAttribution: 'first-session-touch',
    leadAttribution: 'first-lead-touch',
    conversionWindowDays: 7,
    collection: lastEvent ? 'observed' : 'no-observations',
    sessions: lastEvent ? row.sessions : null,
    lastEvent,
  })
}
