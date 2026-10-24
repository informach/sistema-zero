import { sql } from 'drizzle-orm'
import type {
  RecoveryReviewItem,
  RecoveryReviewPage,
  RecoveryReviewQuery,
  RecoveryReviewRepository,
} from '../../../domain/subscription-recovery/recovery-review.port'
import type { Database } from './db'

type ReviewRow = Omit<RecoveryReviewItem, 'openedAt' | 'deadlineAt'> & {
  openedAt: string
  deadlineAt: string | null
}

/** Four durable sources, one bounded snapshot. Unknown audience remains explicit. */
export class DrizzleRecoveryReviewRepository implements RecoveryReviewRepository {
  constructor(private readonly db: Database) {}

  async list(query: RecoveryReviewQuery): Promise<RecoveryReviewPage> {
    const audience = sql`case when s.metadata->>'billingAudienceSource' = 'funnel-registry-v1'
      and jsonb_typeof(s.metadata->'billingFunnelKey') = 'string' and s.metadata->>'billingFunnelKey' <> ''
      and s.metadata->>'billingAudience' in ('kids','adult') then s.metadata->>'billingAudience' else 'unknown' end`
    const [row] = await this.db.execute<{ total: number; items: ReviewRow[] }>(sql`
      with queue as (
        select 'CASE' as kind, c.id::text as id, c.subscription_id::text as "subscriptionId",
          c.payment_id::text as "paymentId", c.audience, c.state::text as state, c.reason,
          c.amount_in_cents::text as "amountInCents", c.version,
          c.opened_at as "openedAt", c.deadline_at as "deadlineAt",
          s.customer->>'name' as "customerName", s.customer->>'email' as "customerEmail"
        from payments.subscription_recovery_cases c
        join payments.subscriptions s on s.id = c.subscription_id and s.consumer_id = c.consumer_id
        where c.state not in ('RECOVERED','CANCELED')
        union all
        select 'ADMISSION', a.payment_id::text, p.subscription_id::text, a.payment_id::text,
          ${audience}, a.state::text, a.reason, p.amount_in_cents::text, a.attempts,
          a.discovered_at, null::timestamptz, s.customer->>'name', s.customer->>'email'
        from payments.subscription_recovery_admissions a
        join payments.payments p on p.id = a.payment_id
        left join payments.subscriptions s on s.id = p.subscription_id and s.consumer_id = p.consumer_id
        where a.state = 'REVIEW'
        union all
        select 'OPERATION', o.id::text, o.subscription_id::text, p.id::text,
          ${audience}, o.state::text, o.result, coalesce(o.amount_in_cents,s.amount_in_cents)::text,
          o.execution_attempts, coalesce(o.started_at,o.created_at), o.expires_at,
          s.customer->>'name', s.customer->>'email'
        from payments.subscription_operations o
        join payments.subscriptions s on s.id = o.subscription_id and s.consumer_id = o.consumer_id
        left join lateral (
          select id from payments.payments p where p.subscription_id = o.subscription_id
            and p.consumer_id = o.consumer_id and p.provider_payment_id = o.provider_payment_id
          order by p.created_at, p.id limit 1
        ) p on true
        where o.state in ('UNKNOWN','EXECUTING')
        union all
        select 'PERIOD', p.id::text, p.subscription_id::text, p.id::text,
          ${audience}, 'REVIEW_REQUIRED', p.cycle_access->>'reason', p.amount_in_cents::text,
          p.version, p.updated_at, null::timestamptz, s.customer->>'name', s.customer->>'email'
        from payments.payments p
        left join payments.subscriptions s on s.id = p.subscription_id and s.consumer_id = p.consumer_id
        where p.status = 'PAID' and p.subscription_id is not null and p.cycle_access->>'kind' = 'REVIEW_REQUIRED'
      ), filtered as (
        select * from queue where ${query.kind ? sql`kind = ${query.kind}` : sql`true`}
          and ${query.audience ? sql`audience = ${query.audience}` : sql`true`}
          and ${query.subscriptionId ? sql`"subscriptionId" = ${query.subscriptionId}` : sql`true`}
          and ${query.q?.trim() ? sql`strpos(lower(concat_ws(' ', "customerName", "customerEmail", "subscriptionId", "paymentId")), lower(${query.q.trim()})) > 0` : sql`true`}
      ), page as (
        select * from filtered order by "openedAt", kind, id limit ${query.limit} offset ${query.offset}
      )
      select (select count(*)::integer from filtered) as total,
        coalesce((select jsonb_agg(to_jsonb(page) order by "openedAt", kind, id) from page),'[]'::jsonb) as items
    `)
    if (!row) throw new Error('Conferências indisponíveis')
    return {
      items: row.items.map((item) => ({
        ...item,
        openedAt: new Date(item.openedAt).toISOString(),
        deadlineAt: item.deadlineAt ? new Date(item.deadlineAt).toISOString() : null,
      })),
      total: row.total,
      limit: query.limit,
      offset: query.offset,
    }
  }
}
