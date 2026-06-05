import { inArray, sql } from 'drizzle-orm'
import type { Database } from './db'
import { messages, outbox } from './schema'

export interface MetricsSnapshot {
  /** Eventos de domínio ainda não publicados (lag do outbox). */
  outboxPending: number
  /** Eventos que esgotaram as tentativas de publicação (dead-letter). */
  outboxDead: number
  /** Idade (s) do evento PENDING mais antigo — null sem backlog.
   *  Alerte na IDADE (pega poller morto), não só na contagem. */
  outboxOldestPendingAgeSeconds: number | null
  /** E-mails DEVIDOS agora (QUEUED/SCHEDULED com next_attempt vencido). */
  emailDue: number
  /** E-mails em SENDING (claim em voo; crescer sem cair = claims presos). */
  emailSending: number
  /** Idade (s) do e-mail devido mais antigo — alerte na idade (worker morto). */
  emailOldestDueAgeSeconds: number | null
  /** WhatsApp devidos agora. */
  whatsappDue: number
  whatsappSending: number
  whatsappOldestDueAgeSeconds: number | null
}

/** Contadores leves para monitoramento (lag/backlog). Exposto em GET /metrics. */
export class DrizzleMetricsRepository {
  constructor(private readonly db: Database) {}

  async getMetrics(): Promise<MetricsSnapshot> {
    // 1 query por tabela com `count(*) FILTER`; os WHERE preservam os índices.
    const dueFilter = sql`${messages.status} in ('QUEUED', 'SCHEDULED') and ${messages.nextAttemptAt} <= now() and ${messages.scheduledAt} <= now()`
    const [outboxRows, messageRows] = await Promise.all([
      this.db
        .select({
          pending: sql<number>`(count(*) filter (where ${outbox.status} = 'PENDING'))::int`,
          dead: sql<number>`(count(*) filter (where ${outbox.status} = 'DEAD'))::int`,
          oldestPendingAgeSeconds: sql<
            number | null
          >`floor(extract(epoch from (now() - min(${outbox.createdAt}) filter (where ${outbox.status} = 'PENDING'))))::int`,
        })
        .from(outbox)
        .where(inArray(outbox.status, ['PENDING', 'DEAD'])),
      this.db
        .select({
          channel: messages.channel,
          due: sql<number>`(count(*) filter (where ${dueFilter}))::int`,
          sending: sql<number>`(count(*) filter (where ${messages.status} = 'SENDING'))::int`,
          oldestDueAgeSeconds: sql<
            number | null
          >`floor(extract(epoch from (now() - min(${messages.nextAttemptAt}) filter (where ${dueFilter}))))::int`,
        })
        .from(messages)
        .where(inArray(messages.status, ['QUEUED', 'SCHEDULED', 'SENDING']))
        .groupBy(messages.channel),
    ])

    const outboxRow = outboxRows[0]
    const byChannel = new Map(messageRows.map((r) => [r.channel, r]))
    const email = byChannel.get('email')
    const whatsapp = byChannel.get('whatsapp')

    return {
      outboxPending: outboxRow?.pending ?? 0,
      outboxDead: outboxRow?.dead ?? 0,
      outboxOldestPendingAgeSeconds: outboxRow?.oldestPendingAgeSeconds ?? null,
      emailDue: email?.due ?? 0,
      emailSending: email?.sending ?? 0,
      emailOldestDueAgeSeconds: email?.oldestDueAgeSeconds ?? null,
      whatsappDue: whatsapp?.due ?? 0,
      whatsappSending: whatsapp?.sending ?? 0,
      whatsappOldestDueAgeSeconds: whatsapp?.oldestDueAgeSeconds ?? null,
    }
  }
}
