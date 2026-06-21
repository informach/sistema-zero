import { sql } from 'drizzle-orm'
import type { Database } from '../persistence/drizzle/db'
import { webhookEvents } from '../persistence/drizzle/schema'
import type { RateLimiter, RateLimitResult } from './rate-limiter'

interface RateLimitWindowPayload {
  count?: number | string
  lastAllowed?: boolean | string
}

/**
 * Rate limiter distribuído para webhooks usando o banco do domínio.
 *
 * O limite é por chave+janela (janela fixa de 60s por padrão), persistido em
 * `payments.webhook_events` via `provider`/`provider_event_id` único. Isso torna
 * o teto de backpressure global entre réplicas sem depender de cache externo.
 *
 * O evento é persistido como tipo `webhook.rate-limit` (com `processedAt`).
 * A rotina de retenção já existente remove entradas antigas de
 * `webhook_events`, evitando acúmulo.
 */
export class WebhookRateLimiter implements RateLimiter {
  constructor(
    private readonly db: Database,
    private readonly limit: number,
    private readonly windowMs = 60_000,
    private readonly provider = 'payments-system',
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    if (this.limit <= 0) return { allowed: true }

    const now = new Date()
    const nowMs = now.getTime()
    const windowStartMs = nowMs - (nowMs % this.windowMs)
    const resetAt = new Date(windowStartMs + this.windowMs)
    const bucketId = `${key}:${new Date(windowStartMs).toISOString()}`

    const inserted = await this.db
      .insert(webhookEvents)
      .values({
        provider: this.provider,
        providerEventId: bucketId,
        eventType: 'webhook.rate-limit',
        payload: {
          count: 1,
          lastAllowed: true,
          windowStart: new Date(windowStartMs).toISOString(),
        },
        processedAt: now,
      })
      .onConflictDoUpdate({
        target: [webhookEvents.provider, webhookEvents.providerEventId],
        set: {
          payload: sql`
            jsonb_set(
              jsonb_set(
                ${webhookEvents.payload},
                '{count}',
                to_jsonb(
                  CASE
                    WHEN COALESCE((${webhookEvents.payload} ->> 'count')::int, 0) < ${this.limit}
                    THEN COALESCE((${webhookEvents.payload} ->> 'count')::int, 0) + 1
                    ELSE COALESCE((${webhookEvents.payload} ->> 'count')::int, 0)
                  END
                ),
                true
              ),
              '{lastAllowed}',
              to_jsonb(COALESCE(CASE
                WHEN COALESCE((${webhookEvents.payload} ->> 'count')::int, 0) < ${this.limit}
                  THEN true
                  ELSE false
              END, false)),
              true
            )
          `,
          eventType: 'webhook.rate-limit',
          processedAt: now,
          receivedAt: now,
        },
      })
      .returning({ payload: webhookEvents.payload })

    const payload = inserted[0]?.payload ?? {}
    const allowed = parseWindowAllowed(payload as RateLimitWindowPayload, this.limit)

    return {
      allowed,
      retryAfterSeconds: allowed ? undefined : Math.ceil((resetAt.getTime() - nowMs) / 1000),
    }
  }
}

function parseWindowCount(payload: RateLimitWindowPayload): number {
  if (typeof payload.count === 'number') return Number.isFinite(payload.count) ? payload.count : 0
  if (typeof payload.count === 'string') {
    const value = Number.parseInt(payload.count, 10)
    return Number.isFinite(value) ? value : 0
  }
  return 0
}

function parseWindowAllowed(payload: RateLimitWindowPayload, limit: number): boolean {
  if (typeof payload.lastAllowed === 'boolean') return payload.lastAllowed
  if (typeof payload.lastAllowed === 'string') return payload.lastAllowed === 'true'
  return parseWindowCount(payload) <= limit
}
