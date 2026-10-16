import type { AutomationDiagnostics } from '@sistemazero/helpdesk-contracts'
import { sql } from 'drizzle-orm'
import type { Database } from './db'

/** Aggregates only: no ticket text, identity or provider payload reaches operations. */
export async function automationDiagnostics(
  db: Database,
  at: Date,
): Promise<AutomationDiagnostics> {
  const now = at.toISOString(),
    since = new Date(at.getTime() - 30 * 86400000).toISOString()
  const [health, cycles, usage, handoffs, copilot, latency] = await Promise.all([
    db.execute(sql`select
      (select count(*) from helpdesk.automation_jobs where state in ('pending','processing')) as active_jobs,
      (select count(*) from helpdesk.automation_jobs where state in ('pending','processing') and deadline_at < ${now}::timestamptz) as overdue_jobs,
      (select count(*) from helpdesk.automation_jobs where state='processing' and lease_expires_at < ${now}::timestamptz) as expired_leases,
      (select coalesce(max(extract(epoch from (${now}::timestamptz-created_at))),0) from helpdesk.automation_jobs where state in ('pending','processing')) as oldest_job_seconds,
      (select count(*) from helpdesk.kb_revisions where index_state='failed') as failed_indexes,
      (select count(*) from helpdesk.kb_revisions where index_state in ('pending','processing')) as pending_indexes,
      (select count(*) from helpdesk.kb_articles a join helpdesk.kb_revisions r on r.id=a.published_revision_id where r.valid_until <= ${now}::timestamptz) as expired_sources,
      (select count(*) from helpdesk.portal_notification_outbox where status<>'sent' and attempts>0) as notification_retries`),
    db.execute(sql`select
      (select count(distinct ticket_id) from helpdesk.automation_jobs where mode='pilot' and created_at>=${since}::timestamptz) as started,
      (select count(*) from helpdesk.tickets where handling_mode='assistant' and status='waiting') as awaiting_confirmation,
      count(*) filter(where e.kind='confirmed') as confirmed,
      count(*) filter(where e.kind='reopened') as reopened,
      count(*) filter(where e.kind='confirmed' and e.created_at<=${now}::timestamptz-interval '7 days') as matured,
      count(*) filter(where e.kind='confirmed' and e.created_at<=${now}::timestamptz-interval '7 days' and not exists(select 1 from helpdesk.resolution_events r where r.ticket_id=e.ticket_id and r.kind='reopened' and r.created_at>=e.created_at and r.created_at<=e.created_at+interval '7 days')) as durable
      from helpdesk.resolution_events e where e.automated and e.created_at>=${since}::timestamptz`),
    db.execute(sql`select r.detail->>'purpose' as purpose,count(distinct r.id) as runs,count(a.value) as attempts,
      coalesce(sum((a.value->>'costUsd')::numeric),0) as known_usd,
      count(a.value) filter(where a.value->>'costUsd' is null) as unknown_attempts,
      percentile_cont(0.5) within group(order by (a.value->>'durationMs')::numeric) as p50_ms,
      percentile_cont(0.95) within group(order by (a.value->>'durationMs')::numeric) as p95_ms
      from helpdesk.ai_runs r left join lateral jsonb_array_elements(r.detail->'attempts') a on true
      where r.created_at>=${since}::timestamptz group by r.detail->>'purpose'`),
    db.execute(sql`select reason,count(*) as count,percentile_cont(0.95) within group(order by extract(epoch from (created_at-automation_started_at))*1000) as p95_ms
      from helpdesk.automation_handoffs where created_at>=${since}::timestamptz group by reason`),
    db.execute(sql`select
      (select count(*) from helpdesk.ai_feedback where kind='inserted' and created_at>=${since}::timestamptz) as inserted,
      (select count(*) from helpdesk.ai_feedback where kind='rejected' and created_at>=${since}::timestamptz) as rejected,
      count(*) as sent,count(*) filter(where draft_edited) as edited
      from helpdesk.ticket_messages where sent_via='human' and ai_run_id is not null and (delivery_state is null or delivery_state='sent') and created_at>=${since}::timestamptz`),
    db.execute(sql`select
      (select percentile_cont(0.5) within group(order by extract(epoch from(finished_at-created_at))*1000) from helpdesk.automation_jobs where mode='pilot' and state='completed' and created_at>=${since}::timestamptz) as pilot_p50_ms,
      (select percentile_cont(0.95) within group(order by extract(epoch from(finished_at-created_at))*1000) from helpdesk.automation_jobs where mode='pilot' and state='completed' and created_at>=${since}::timestamptz) as pilot_p95_ms,
      (select count(*) from helpdesk.automation_jobs where mode='pilot' and state='completed' and created_at>=${since}::timestamptz) as pilot_samples,
      (select percentile_cont(0.95) within group(order by extract(epoch from(r.resolved_at-r.created_at))) from helpdesk.ai_runs r where r.resolved_at is not null and r.created_at>=${since}::timestamptz) as gap_resolution_p95_seconds,
      count(first_reply.at) as human_response_samples,
      percentile_cont(0.95) within group(order by extract(epoch from(first_reply.at-j.created_at))) as human_response_p95_seconds
      from helpdesk.automation_handoffs j left join lateral (select min(coalesce(m.gmail_internal_date,m.created_at)) as at from helpdesk.ticket_messages m where m.ticket_id=j.ticket_id and m.direction='outbound' and m.visibility='customer' and m.sent_via in ('human','gmail') and (m.delivery_state is null or m.delivery_state='sent') and coalesce(m.gmail_internal_date,m.created_at)>=j.created_at) first_reply on true
      where j.created_at>=${since}::timestamptz`),
  ])
  const numbers = (row: Record<string, unknown> | undefined) =>
    Object.fromEntries(Object.entries(row ?? {}).map(([k, v]) => [k, Number(v ?? 0)]))
  return {
    windowDays: 30,
    asOf: now,
    latency: numbers(latency[0]),
    health: numbers(health[0]),
    cycles: numbers(cycles[0]),
    copilot: numbers(copilot[0]),
    usage: usage.map((r) => ({
      purpose: String(r.purpose),
      ...numbers(Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'purpose'))),
    })),
    handoffs: handoffs.map((r) => ({
      reason: String(r.reason),
      count: Number(r.count),
      p95Ms: Number(r.p95_ms ?? 0),
    })),
  }
}
