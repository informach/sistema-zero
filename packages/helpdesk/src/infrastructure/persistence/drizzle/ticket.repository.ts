import { and, asc, count, desc, eq, ilike, isNotNull, isNull, lte, sql } from 'drizzle-orm'
import type {
  AiClassificationUpdate,
  AiWriteGuard,
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
        // `portal` fica de fora de propósito, como `requesterEmail`: é imutável
        // depois da criação (o app que abriu o chamado não muda).
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
        aiGeneration: ticket.aiGeneration,
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
    // O cursor congela a admissão de tickets novos e o relógio usado pelo SLA.
    const conditions = [lte(tickets.createdAt, now)]
    if (filter.status) conditions.push(eq(tickets.status, filter.status))
    if (filter.category) conditions.push(eq(tickets.category, filter.category))
    if (filter.q) {
      const pattern = `%${escapeLike(filter.q)}%`
      const searchText = sql<string>`coalesce(${tickets.subject}, '') || ' ' || coalesce(${tickets.requesterEmail}, '') || ' ' || coalesce(${tickets.requesterName}, '')`
      conditions.push(ilike(searchText, pattern))
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

    const operationalRank = sql<number>`case
      when ${active} and ${deadlineAt} <= ${nowIso}::timestamptz then 0
      when ${active} and ${riskAt} <= ${nowIso}::timestamptz then 1
      when ${active} then 2
      else 3
    end`
    const pageConditions = [...conditions]
    if (filter.cursor) {
      const deadlineIso = filter.cursor.deadlineAt.toISOString()
      const lastMessageIso = filter.cursor.lastMessageAt.toISOString()
      pageConditions.push(sql`(
        ${operationalRank} > ${filter.cursor.operationalRank}
        or (${operationalRank} = ${filter.cursor.operationalRank}
          and (${deadlineAt} > ${deadlineIso}::timestamptz
            or (${deadlineAt} = ${deadlineIso}::timestamptz
              and (${tickets.lastMessageAt} < ${lastMessageIso}::timestamptz
                or (${tickets.lastMessageAt} = ${lastMessageIso}::timestamptz
                  and ${tickets.id} > ${filter.cursor.id}::uuid)))))
      )`)
    }
    const pageWhere = and(...pageConditions)
    const countWhere = and(...conditions)
    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(tickets)
        .where(pageWhere)
        // A fila põe risco antes de recência; `id` torna a paginação estável.
        .orderBy(
          asc(operationalRank),
          asc(deadlineAt),
          desc(tickets.lastMessageAt),
          asc(tickets.id),
        )
        // Uma linha extra informa `hasMore` sem depender do total mutável.
        .limit(filter.limit + 1),
      this.db.select({ value: count() }).from(tickets).where(countWhere),
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

  async applyClassification(
    id: string,
    guard: AiWriteGuard,
    update: AiClassificationUpdate,
  ): Promise<boolean> {
    // Categoria só quando não é manual; prioridade só quando ainda é nula.
    const updated = await this.db
      .update(tickets)
      .set({
        aiSummary: update.summary,
        aiSummaryAt: update.at,
        aiClassification: update.classification,
        category: sql`case when ${tickets.categoryManual} then ${tickets.category} else ${update.category}::helpdesk.ticket_category end`,
        priority: sql`coalesce(${tickets.priority}, ${update.priority}::helpdesk.ticket_priority)`,
        updatedAt: update.at,
      })
      .where(this.aiWriteWhere(id, guard))
      .returning({ id: tickets.id })
    return updated.length > 0
  }

  async applyDraft(id: string, guard: AiWriteGuard, draft: string, at: Date): Promise<boolean> {
    const updated = await this.db
      .update(tickets)
      .set({ aiDraft: draft, aiDraftAt: at, aiDraftEdited: false, updatedAt: at })
      .where(this.aiWriteWhere(id, guard))
      .returning({ id: tickets.id })
    return updated.length > 0
  }

  async markAiDone(id: string, guard: AiWriteGuard, at: Date): Promise<boolean> {
    const updated = await this.db
      .update(tickets)
      .set({
        aiStatus: 'done',
        aiLastError: null,
        aiNextAttemptAt: null,
        aiAttempts: 0,
        updatedAt: at,
      })
      .where(this.aiWriteWhere(id, guard))
      .returning({ id: tickets.id })
    return updated.length > 0
  }

  async scheduleAiRetry(
    id: string,
    guard: AiWriteGuard,
    nextAt: Date,
    error: string,
    at: Date,
  ): Promise<boolean> {
    const updated = await this.db
      .update(tickets)
      .set({
        aiStatus: 'pending',
        aiNextAttemptAt: nextAt,
        aiLastError: error.slice(0, 500),
        updatedAt: at,
      })
      .where(this.aiWriteWhere(id, guard))
      .returning({ id: tickets.id })
    return updated.length > 0
  }

  async markAiFailed(id: string, guard: AiWriteGuard, error: string, at: Date): Promise<boolean> {
    const updated = await this.db
      .update(tickets)
      .set({
        aiStatus: 'failed',
        aiLastError: error.slice(0, 500),
        aiNextAttemptAt: null,
        updatedAt: at,
      })
      .where(this.aiWriteWhere(id, guard))
      .returning({ id: tickets.id })
    return updated.length > 0
  }

  private aiWriteWhere(id: string, guard: AiWriteGuard) {
    const conditions = [eq(tickets.id, id), eq(tickets.aiGeneration, guard.generation)]
    if (guard.processingAttempt !== undefined) {
      conditions.push(
        eq(tickets.aiStatus, 'processing'),
        eq(tickets.aiAttempts, guard.processingAttempt),
      )
    }
    return and(...conditions)
  }
}
