import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm'
import type {
  AiClassificationUpdate,
  ListTicketsFilter,
  TicketRepository,
} from '../../../domain/ports/ticket-repository.port'
import type { Ticket } from '../../../domain/ticket/ticket'
import { SLA_RISK_START_RATIO, SLA_TARGET_MINUTES } from '../../../domain/ticket/ticket-sla'
import { densifyVolume, statsWindows, type TicketStats } from '../../../domain/ticket/ticket-stats'
import type { Database, DbConnection } from './db'
import { escapeLike } from './pg-errors'
import { tickets } from './schema'

export class DrizzleTicketRepository implements TicketRepository {
  private readonly db: Database

  constructor(private readonly connection: DbConnection) {
    this.db = connection.db
  }

  async create(ticket: Ticket): Promise<void> {
    await this.db.insert(tickets).values(ticket)
  }

  async byId(id: string): Promise<Ticket | null> {
    const [row] = await this.db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
    return row ?? null
  }

  async update(ticket: Ticket, expectedVersion: number): Promise<boolean> {
    const updated = await this.db
      .update(tickets)
      .set({
        version: expectedVersion + 1,
        gmailThreadId: ticket.gmailThreadId,
        source: ticket.source,
        subject: ticket.subject,
        status: ticket.status,
        resolvedAt: ticket.resolvedAt,
        category: ticket.category,
        categoryManual: ticket.categoryManual,
        priority: ticket.priority,
        requesterName: ticket.requesterName,
        requesterAccountId: ticket.requesterAccountId,
        assignedTo: ticket.assignedTo,
        assignedToName: ticket.assignedToName,
        firstMessageAt: ticket.firstMessageAt,
        lastMessageAt: ticket.lastMessageAt,
        lastInboundAt: ticket.lastInboundAt,
        messageCount: ticket.messageCount,
        aiSummary: ticket.aiSummary,
        aiSummaryAt: ticket.aiSummaryAt,
        aiDraft: ticket.aiDraft,
        aiDraftAt: ticket.aiDraftAt,
        aiDraftEdited: ticket.aiDraftEdited,
        aiClassification: ticket.aiClassification,
        aiStatus: ticket.aiStatus,
        aiNextAttemptAt: ticket.aiNextAttemptAt,
        aiAttempts: ticket.aiAttempts,
        aiLastError: ticket.aiLastError,
        updatedAt: ticket.updatedAt,
      })
      .where(and(eq(tickets.id, ticket.id), eq(tickets.version, expectedVersion)))
      .returning({ id: tickets.id })
    const ok = updated.length > 0
    if (ok) ticket.version = expectedVersion + 1
    return ok
  }

  async list(filter: ListTicketsFilter, now: Date): Promise<{ items: Ticket[]; total: number }> {
    const conditions = []
    if (filter.status) conditions.push(eq(tickets.status, filter.status))
    if (filter.category) conditions.push(eq(tickets.category, filter.category))
    if (filter.q) {
      const pattern = `%${escapeLike(filter.q)}%`
      conditions.push(
        or(
          ilike(tickets.subject, pattern),
          ilike(tickets.requesterEmail, pattern),
          ilike(sql`coalesce(${tickets.requesterName}, '')`, pattern),
        ),
      )
    }
    if (filter.assignment === 'assigned') conditions.push(isNotNull(tickets.assignedTo))
    if (filter.assignment === 'unassigned') conditions.push(isNull(tickets.assignedTo))

    // A expressão usa as constantes do domínio, mas roda no banco para filtrar e
    // paginar sem trazer a fila inteira para a memória.
    const targetMinutes = sql<number>`case ${tickets.priority}
      when 'alta' then ${SLA_TARGET_MINUTES.alta}::integer
      when 'baixa' then ${SLA_TARGET_MINUTES.baixa}::integer
      else ${SLA_TARGET_MINUTES.normal}::integer
    end`
    const deadlineAt = sql<Date>`coalesce(${tickets.lastInboundAt}, ${tickets.firstMessageAt}) + (${targetMinutes} * interval '1 minute')`
    const riskAt = sql<Date>`coalesce(${tickets.lastInboundAt}, ${tickets.firstMessageAt}) + (${targetMinutes} * ${SLA_RISK_START_RATIO}::double precision * interval '1 minute')`
    const nowIso = now.toISOString()
    const active = sql`${tickets.status} in ('new', 'open')`
    if (filter.queue === 'unassigned') {
      conditions.push(sql`${active} and ${tickets.assignedTo} is null`)
    }

    if (filter.sla === 'breached') {
      conditions.push(sql`${active} and ${deadlineAt} <= ${nowIso}::timestamptz`)
    } else if (filter.sla === 'at_risk') {
      conditions.push(
        sql`${active} and ${deadlineAt} > ${nowIso}::timestamptz and ${riskAt} <= ${nowIso}::timestamptz`,
      )
    } else if (filter.sla === 'attention') {
      conditions.push(sql`${active} and ${riskAt} <= ${nowIso}::timestamptz`)
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined
    const operationalRank = sql<number>`case
      when ${active} and ${deadlineAt} <= ${nowIso}::timestamptz then 0
      when ${active} and ${riskAt} <= ${nowIso}::timestamptz then 1
      when ${active} then 2
      else 3
    end`
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(tickets)
        .where(where)
        // A fila põe risco antes de recência; `id` torna a paginação estável.
        .orderBy(
          asc(operationalRank),
          asc(deadlineAt),
          desc(tickets.lastMessageAt),
          asc(tickets.id),
        )
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ value: count() }).from(tickets).where(where),
    ])
    return { items, total: totalRow?.value ?? 0 }
  }

  async stats(now: Date): Promise<TicketStats> {
    const w = statsWindows(now)
    // `count(*)` do postgres.js chega como STRING (bigint) → sempre coagir.
    const num = (v: unknown) => Number(v ?? 0)
    // Volume agrupado por dia SP: `- interval '3 hours'` reproduz o offset fixo
    // de São Paulo (UTC-3, sem DST) sem depender do timezone do servidor.
    const nowIso = now.toISOString()
    const [totalsRows, createdRows] = await Promise.all([
      this.connection.sql`
        with ticket_sla as (
          select *,
            coalesce(last_inbound_at, first_message_at) + (
              case priority
                when 'alta' then ${SLA_TARGET_MINUTES.alta}::integer
                when 'baixa' then ${SLA_TARGET_MINUTES.baixa}::integer
                else ${SLA_TARGET_MINUTES.normal}::integer
              end * interval '1 minute'
            ) as sla_deadline,
            coalesce(last_inbound_at, first_message_at) + (
              case priority
                when 'alta' then ${SLA_TARGET_MINUTES.alta}::integer
                when 'baixa' then ${SLA_TARGET_MINUTES.baixa}::integer
                else ${SLA_TARGET_MINUTES.normal}::integer
              end * ${SLA_RISK_START_RATIO}::double precision * interval '1 minute'
            ) as sla_risk_at
          from helpdesk.tickets
        )
        select
          count(*) filter (where status = 'new') as new_count,
          count(*) filter (where status = 'open') as open_count,
          count(*) filter (where status = 'waiting') as waiting_count,
          count(*) filter (where status in ('resolved', 'closed') and resolved_at >= ${w.todayStartIso}) as resolved_today,
          count(*) filter (where status in ('resolved', 'closed') and resolved_at >= ${w.weekStartIso}) as resolved_7d,
          count(*) filter (where status in ('new', 'open') and sla_deadline <= ${nowIso}) as sla_breached,
          count(*) filter (where status in ('new', 'open') and sla_deadline > ${nowIso} and sla_risk_at <= ${nowIso}) as sla_at_risk,
          count(*) filter (where status in ('new', 'open') and assigned_to is null) as sla_unassigned
        from ticket_sla
      `,
      this.connection.sql`
        select to_char(created_at - interval '3 hours', 'YYYY-MM-DD') as day, count(*) as n
        from helpdesk.tickets
        where created_at >= ${w.seriesStartIso}
        group by day
      `,
    ])
    const totals = totalsRows[0] ?? {}
    const createdByDay = new Map(createdRows.map((r) => [r.day as string, num(r.n)]))
    return {
      counts: {
        new: num(totals.new_count),
        open: num(totals.open_count),
        waiting: num(totals.waiting_count),
      },
      resolvedToday: num(totals.resolved_today),
      resolved7d: num(totals.resolved_7d),
      sla: {
        atRisk: num(totals.sla_at_risk),
        breached: num(totals.sla_breached),
        unassigned: num(totals.sla_unassigned),
      },
      volume: densifyVolume(w.dayKeys, createdByDay),
    }
  }

  async claimAiDue(leaseMs: number, at: Date): Promise<Ticket | null> {
    // Claim atômico da fila de IA (espelha o claimDue da conexão). SKIP LOCKED
    // deixa réplicas concorrentes pegarem tickets diferentes; NÃO toca em `version`.
    // ⚠️ Date como param em SQL cru só via .toISOString() (Bun+postgres.js).
    const nowIso = at.toISOString()
    const leaseIso = new Date(at.getTime() + leaseMs).toISOString()
    const rows = await this.connection.sql`
      update helpdesk.tickets
      set ai_status = 'processing', ai_next_attempt_at = ${leaseIso}, ai_attempts = ai_attempts + 1
      where id = (
        select id from helpdesk.tickets
        where ai_status in ('pending', 'processing') and ai_next_attempt_at <= ${nowIso}
        order by ai_next_attempt_at
        limit 1
        for update skip locked
      )
      returning id
    `
    const claimedId = rows[0]?.id as string | undefined
    if (!claimedId) return null
    return this.byId(claimedId)
  }

  async applyClassification(id: string, update: AiClassificationUpdate): Promise<void> {
    const at = update.at.toISOString()
    // Categoria só quando não é manual; prioridade só quando ainda é nula.
    await this.connection.sql`
      update helpdesk.tickets set
        ai_summary = ${update.summary},
        ai_summary_at = ${at},
        ai_classification = ${JSON.stringify(update.classification)}::jsonb,
        category = case when category_manual then category else ${update.category}::helpdesk.ticket_category end,
        priority = coalesce(priority, ${update.priority}::helpdesk.ticket_priority),
        updated_at = ${at}
      where id = ${id}
    `
  }

  async applyDraft(id: string, draft: string, at: Date): Promise<void> {
    const iso = at.toISOString()
    await this.connection.sql`
      update helpdesk.tickets set
        ai_draft = ${draft}, ai_draft_at = ${iso}, ai_draft_edited = false, updated_at = ${iso}
      where id = ${id}
    `
  }

  async markAiDone(id: string, at: Date): Promise<void> {
    const iso = at.toISOString()
    await this.connection.sql`
      update helpdesk.tickets set
        ai_status = 'done', ai_last_error = null, ai_next_attempt_at = null, ai_attempts = 0, updated_at = ${iso}
      where id = ${id}
    `
  }

  async scheduleAiRetry(id: string, nextAt: Date, error: string, at: Date): Promise<void> {
    await this.connection.sql`
      update helpdesk.tickets set
        ai_status = 'pending', ai_next_attempt_at = ${nextAt.toISOString()},
        ai_last_error = ${error.slice(0, 500)}, updated_at = ${at.toISOString()}
      where id = ${id}
    `
  }

  async markAiFailed(id: string, error: string, at: Date): Promise<void> {
    const iso = at.toISOString()
    await this.connection.sql`
      update helpdesk.tickets set
        ai_status = 'failed', ai_last_error = ${error.slice(0, 500)}, ai_next_attempt_at = null, updated_at = ${iso}
      where id = ${id}
    `
  }
}
