import { sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import type { AnalyticsFilter, QuizDefinition } from './types'

export interface PageMetric {
  page: string
  revision: string
  viewport: number
  views: number
  clicks: number
  snapshot: string | null
}
export interface InteractionMetric {
  page: string
  revision: string
  element: string
  section: string | null
  label: string | null
  exposed: number
  clicked: number
  opened: number
  zoomed: number
}
export interface QuizMetric {
  definition: QuizDefinition
  questions: { id: string; viewed: number; answered: number }[]
}
export interface AnalyticsReport {
  campaigns: { source: string; campaign: string; sessions: number; paid: number }[]
  coverage: { paid: number; unlinked: number }
  summary: {
    sessions: number
    visitors: number
    contacts: number
    checkout: number
    paid: number
    revenue: number
    missingRevenue: number
    lastEvent: string | null
  }
  pages: PageMetric[]
  interactions: InteractionMetric[]
  quizzes: QuizMetric[]
  journeys: { route: string; sessions: number; paid: number }[]
}

export function cohortSql(filter: AnalyticsFilter) {
  return sql`select s.* from funil.analytics_sessions s
    where s.started_at >= ${filter.from.toISOString()}::timestamptz and s.started_at < ${filter.to.toISOString()}::timestamptz
    and s.environment = ${filter.environment}
    ${filter.source ? sql`and s.attribution->>'utmSource' = ${filter.source}` : sql``}
    ${filter.campaign ? sql`and s.attribution->>'utmCampaign' = ${filter.campaign}` : sql``}
    ${
      filter.funnel || filter.page || filter.revision
        ? sql`and exists (select 1 from funil.analytics_events f where f.session_id=s.id
      ${filter.funnel ? sql`and f.funnel=${filter.funnel}` : sql``}
      ${filter.page ? sql`and f.page=${filter.page}` : sql``}
      ${filter.revision ? sql`and f.revision=${filter.revision}` : sql``})`
        : sql``
    }`
}
export function eventFilterSql(filter: AnalyticsFilter) {
  return sql`${filter.funnel ? sql`and e.funnel=${filter.funnel}` : sql``}
    ${filter.page ? sql`and e.page=${filter.page}` : sql``}
    ${filter.revision ? sql`and e.revision=${filter.revision}` : sql``}`
}

/** Cohort = sessions started in the selected period; conversions within seven days. */
export async function analyticsReport(
  db: Database,
  filter: AnalyticsFilter,
): Promise<AnalyticsReport> {
  const cohort = cohortSql(filter)
  const scope = eventFilterSql(filter)
  const business = sql`select s.id session_id, l.id lead_id, l.paid_at,
    case when (p.offer_snapshot->>'chargedPriceCents') ~ '^[0-9]{1,9}$' then (p.offer_snapshot->>'chargedPriceCents')::bigint end amount,
    exists(select 1 from funil.funnel_events f where f.lead_id=l.id and f.event_name='contact_saved' and f.timestamp between s.started_at and s.started_at + interval '7 days') contact,
    (exists(select 1 from funil.funnel_events f where f.lead_id=l.id and f.event_name='redirecionou_checkout' and f.timestamp between s.started_at and s.started_at + interval '7 days')
      or exists(select 1 from funil.analytics_events e where e.session_id=s.id and e.funnel=l.funnel and e.name='page_view' and e.page like '%/checkout')) checkout,
    l.paid_at between s.started_at and s.started_at + interval '7 days' paid
    from cohort s join funil.analytics_lead_links a on a.session_id=s.id
    join funil.leads l on l.id=a.lead_id left join funil.lead_payments p on p.payment_id=coalesce(l.paid_payment_id,
      case when not exists(select 1 from funil.lead_payments other where other.lead_id=l.id and other.payment_id<>l.payment_id) then l.payment_id end)
    where true ${filter.funnel ? sql`and l.funnel=${filter.funnel}` : sql``}`
  const [summaryRows, pageRows, interactions, quizRows, journeyRows, coverageRows, campaignRows] =
    await Promise.all([
      db.execute(sql`with cohort as (${cohort}), business as (${business}) select
      (select count(*)::int from cohort) sessions,
      (select count(distinct visitor_id)::int from cohort) visitors,
      count(distinct session_id) filter(where contact)::int contacts,
      count(distinct session_id) filter(where checkout)::int checkout,
      count(distinct session_id) filter(where paid)::int paid,
      coalesce(sum(amount) filter(where paid),0)::float8 revenue,
      count(*) filter(where paid and amount is null)::int "missingRevenue",
      (select max(e.received_at)::text from funil.analytics_events e join cohort s on s.id=e.session_id) "lastEvent"
      from business`),
      db.execute(sql`with cohort as (${cohort}) select e.page, e.revision, coalesce(e.viewport,0)::int viewport,
      count(distinct e.page_view_id)::int views, count(*) filter(where e.name='click')::int clicks,
      (select a.id from funil.analytics_snapshots a where a.page=e.page and a.revision=e.revision and a.viewport=e.viewport limit 1) snapshot
      from funil.analytics_events e join cohort s on s.id=e.session_id where true ${scope}
      group by e.page,e.revision,e.viewport order by views desc limit 100`),
      db.execute(sql`with cohort as (${cohort}) select e.page,e.revision,e.element_id element, max(e.section_id) section,max(e.label) label,
      count(distinct e.page_view_id) filter(where e.name in ('element_view','section_view','click'))::int exposed,
      count(distinct e.page_view_id) filter(where e.name='click')::int clicked,
      count(distinct e.page_view_id) filter(where e.name='details_open')::int opened,
      count(distinct e.page_view_id) filter(where e.name='image_zoom')::int zoomed
      from funil.analytics_events e join cohort s on s.id=e.session_id where e.element_id is not null ${scope}
      group by e.page,e.revision,e.element_id order by clicked desc,exposed desc limit 500`),
      db.execute(sql`with cohort as (${cohort}), views as (
      select distinct e.quiz_definition_id definition, e.question_id question, e.quiz_attempt_id attempt
      from funil.analytics_events e join cohort s on s.id=e.session_id where e.name='quiz_question_view' and e.quiz_attempt_id is not null ${scope}
    ) select d.definition, coalesce((select jsonb_agg(row_to_json(q)) from (
      select v.question id,count(distinct v.attempt)::int viewed,
        count(distinct v.attempt) filter(where exists(select 1 from funil.funnel_events f
          where f.lead_id=v.attempt and f.event_name='quiz_answer_saved' and f.metadata->>'quiz_definition_id'=d.id and f.metadata->>'question_id'=v.question))::int answered
      from views v where v.definition=d.id group by v.question
    ) q),'[]'::jsonb) questions from funil.analytics_quiz_definitions d
    where exists(select 1 from views v where v.definition=d.id) order by d.created_at desc limit 100`),
      db.execute(sql`with cohort as (${cohort}), business as (${business}), paths as (
      select s.id, case when exists(select 1 from funil.analytics_events e where e.session_id=s.id and e.name='quiz_question_view'
        ${filter.funnel ? sql`and e.funnel=${filter.funnel}` : sql``}) then 'Com quiz' else 'Sem quiz observado' end route
      from cohort s
    ) select route,count(*)::int sessions,count(*) filter(where exists(select 1 from business b where b.session_id=paths.id and b.paid))::int paid from paths group by route`),
      db.execute(sql`select count(*)::int paid, count(*) filter(where not exists(select 1 from funil.analytics_lead_links a where a.lead_id=l.id))::int unlinked
      from funil.leads l where l.paid_at >= ${filter.from.toISOString()}::timestamptz and l.paid_at < ${filter.to.toISOString()}::timestamptz
      ${filter.funnel ? sql`and l.funnel=${filter.funnel}` : sql``}`),
      db.execute(sql`with cohort as (${cohort}), business as (${business}) select coalesce(s.attribution->>'utmSource','Sem UTM') source, coalesce(s.attribution->>'utmCampaign','Sem campanha') campaign,
    count(*)::int sessions,count(*) filter(where exists(select 1 from business b where b.session_id=s.id and b.paid))::int paid
    from cohort s group by s.attribution->>'utmSource',s.attribution->>'utmCampaign' order by sessions desc limit 100`),
    ])
  return {
    campaigns: campaignRows as unknown as AnalyticsReport['campaigns'],
    coverage: coverageRows[0] as unknown as AnalyticsReport['coverage'],
    summary: summaryRows[0] as unknown as AnalyticsReport['summary'],
    pages: pageRows as unknown as PageMetric[],
    interactions: interactions as unknown as InteractionMetric[],
    quizzes: quizRows as unknown as QuizMetric[],
    journeys: journeyRows as unknown as AnalyticsReport['journeys'],
  }
}

export async function analyticsHeatmap(db: Database, filter: AnalyticsFilter, viewport: number) {
  const rows =
    await db.execute(sql`with cohort as (${cohortSql(filter)}) select e.element_id element,
    round(e.x / 500.0) * 500 x, round(e.y / 500.0) * 500 y, count(*)::int count
    from funil.analytics_events e join cohort s on s.id=e.session_id where e.name='click' and e.x is not null and e.y is not null
    and e.viewport=${viewport} ${eventFilterSql(filter)} group by e.element_id,round(e.x / 500.0),round(e.y / 500.0) order by count desc limit 3000`)
  return rows as unknown as { element: string; x: number; y: number; count: number }[]
}
