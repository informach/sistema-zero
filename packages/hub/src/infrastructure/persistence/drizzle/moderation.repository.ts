import { randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq, gt, isNull, or, type SQL, sql } from 'drizzle-orm'
import type { MuteBan, MuteBanKind } from '../../../domain/moderation/mute-ban'
import type {
  CreateMuteBanInput,
  CreateReportInput,
  ModerationActionInput,
  ModerationContext,
  ModerationExcerpt,
  ModerationRepository,
  PendingItem,
  ReportedContent,
  ReportRecord,
  ReportStatus,
} from '../../../domain/ports/moderation-repository.port'
import type { Database } from './db'
import { moderationActions, mutesBans, reports, spaces } from './schema'

/** Linha crua da fila de aprovação (UNION ALL tópicos + comentários pendentes). */
interface PendingRow {
  type: 'thread' | 'comment'
  id: string
  space_id: string
  channel_id: string
  thread_id: string | null
  author_id: string
  author_account_id: string | null
  author_display_name: string | null
  title: string | null
  body: string
  // `db.execute(sql)` CRU não passa pelo mapeamento do drizzle → o postgres.js devolve o
  // timestamptz como STRING (não `Date`). Coagimos no map abaixo — sem isso o mapper
  // `toPendingItemView` chamava `.toISOString()` numa string e dava 500 (só com fila ≥1).
  created_at: string | Date
  space_name: string
  space_audience: 'adult' | 'kids'
  channel_name: string
  context_thread_id: string | null
  context_thread_author_id: string | null
  context_thread_author_account_id: string | null
  context_thread_author_display_name: string | null
  context_thread_title: string | null
  context_thread_body: string | null
  context_thread_created_at: string | Date | null
  reply_to_id: string | null
  reply_to_author_id: string | null
  reply_to_author_account_id: string | null
  reply_to_author_display_name: string | null
  reply_to_body: string | null
  reply_to_created_at: string | Date | null
}

interface ReportedContentRow extends PendingRow {
  status: ReportedContent['status']
}

export class DrizzleModerationRepository implements ModerationRepository {
  constructor(private readonly db: Database) {}

  async listPending(opts: {
    spaceId?: string
    audience?: 'adult' | 'kids'
    limit: number
    offset: number
  }): Promise<{ items: PendingItem[]; total: number }> {
    // UNION ALL paginado NO BANCO (FIFO global por created_at) — sem carregar a
    // fila inteira em memória nem capar o `total`. `space_id` é opcional.
    const spaceCond = opts.spaceId ? sql`and ch.space_id = ${opts.spaceId}` : sql``
    const audienceCond = opts.audience
      ? sql`and s.audience = ${opts.audience}::hub.audience`
      : sql``
    const union = sql`
      select 'thread'::text as type, t.id as id, ch.space_id as space_id,
             t.channel_id as channel_id, null::uuid as thread_id,
             t.author_id as author_id, t.author_account_id as author_account_id,
             t.author_display_name as author_display_name, t.title as title, t.body as body,
             t.created_at as created_at, s.name as space_name,
             s.audience::text as space_audience, ch.name as channel_name,
             null::uuid as context_thread_id, null::uuid as context_thread_author_id,
             null::text as context_thread_author_account_id,
             null::text as context_thread_author_display_name,
             null::text as context_thread_title, null::text as context_thread_body,
             null::timestamptz as context_thread_created_at,
             null::uuid as reply_to_id, null::uuid as reply_to_author_id,
             null::text as reply_to_author_account_id,
             null::text as reply_to_author_display_name, null::text as reply_to_body,
             null::timestamptz as reply_to_created_at
      from hub.threads t
      join hub.channels ch on ch.id = t.channel_id
      join hub.spaces s on s.id = ch.space_id
      where t.status = 'pending' ${spaceCond} ${audienceCond}
      union all
      select 'comment'::text as type, c.id as id, ch.space_id as space_id,
             t.channel_id as channel_id, c.thread_id as thread_id,
             c.author_id as author_id, c.author_account_id as author_account_id,
             c.author_display_name as author_display_name, null::text as title, c.body as body,
             c.created_at as created_at, s.name as space_name,
             s.audience::text as space_audience, ch.name as channel_name,
             t.id as context_thread_id, t.author_id as context_thread_author_id,
             t.author_account_id as context_thread_author_account_id,
             t.author_display_name as context_thread_author_display_name,
             t.title as context_thread_title, t.body as context_thread_body,
             t.created_at as context_thread_created_at,
             rc.id as reply_to_id, rc.author_id as reply_to_author_id,
             rc.author_account_id as reply_to_author_account_id,
             rc.author_display_name as reply_to_author_display_name,
             rc.body as reply_to_body, rc.created_at as reply_to_created_at
      from hub.comments c
      join hub.threads t on t.id = c.thread_id
      join hub.channels ch on ch.id = t.channel_id
      join hub.spaces s on s.id = ch.space_id
      left join hub.comments rc on rc.id = c.reply_to_id
      where c.status = 'pending' ${spaceCond} ${audienceCond}
    `
    const [rows, [counted]] = await Promise.all([
      this.db.execute(sql`
        select * from (${union}) q
        order by q.created_at asc, q.id asc
        limit ${opts.limit} offset ${opts.offset}
      `) as unknown as Promise<PendingRow[]>,
      this.db.execute(sql`select count(*)::int as total from (${union}) q`) as unknown as Promise<
        Array<{ total: number }>
      >,
    ])

    const items = rows.map(toPendingItem)
    return { items, total: Number(counted?.total ?? 0) }
  }

  async createReport(input: CreateReportInput): Promise<void> {
    await this.db.insert(reports).values({
      id: randomUUID(),
      targetType: input.targetType,
      targetId: input.targetId,
      spaceId: input.spaceId,
      spaceAudience: input.spaceAudience,
      reporterId: input.reporterId,
      reporterAccountId: input.reporterAccountId,
      reporterDisplayName: input.reporterDisplayName,
      reason: input.reason,
      status: 'open',
      createdAt: input.now,
    })
  }

  async listReports(opts: {
    spaceId?: string
    audience?: 'adult' | 'kids'
    status?: ReportStatus
    limit: number
    offset: number
  }): Promise<{ items: ReportRecord[]; total: number }> {
    const where: SQL[] = []
    if (opts.spaceId) where.push(eq(reports.spaceId, opts.spaceId))
    if (opts.audience) {
      const audience = opts.audience
      const audienceCondition = or(
        eq(reports.spaceAudience, audience),
        and(
          isNull(reports.spaceAudience),
          // Legado ainda ligado a um espaço usa a audiência atual. Órfão sem
          // snapshot entra nos dois filtros para nunca ficar inalcançável.
          or(eq(spaces.audience, audience), isNull(spaces.id)),
        ),
      )
      if (audienceCondition) where.push(audienceCondition)
    }
    if (opts.status) where.push(eq(reports.status, opts.status))
    const cond = where.length > 0 ? and(...where) : undefined
    const [joinedRows, [counted]] = await Promise.all([
      this.db
        .select({ report: reports, currentSpaceAudience: spaces.audience })
        .from(reports)
        .leftJoin(spaces, eq(spaces.id, reports.spaceId))
        .where(cond)
        .orderBy(desc(reports.createdAt))
        .limit(opts.limit)
        .offset(opts.offset),
      this.db
        .select({ c: count() })
        .from(reports)
        .leftJoin(spaces, eq(spaces.id, reports.spaceId))
        .where(cond),
    ])
    const rows = joinedRows.map((row) => row.report)
    const contents = await this.loadReportedContents(rows)
    return {
      items: joinedRows.map(({ report, currentSpaceAudience }) =>
        toReport(
          report,
          report.spaceAudience ?? currentSpaceAudience ?? 'unknown',
          contents.get(`${report.targetType}:${report.targetId}`) ?? null,
        ),
      ),
      total: counted?.c ?? 0,
    }
  }

  private async loadReportedContents(
    reportRows: Array<typeof reports.$inferSelect>,
  ): Promise<Map<string, ReportedContent>> {
    const threadIds = reportRows.filter((r) => r.targetType === 'thread').map((r) => r.targetId)
    const commentIds = reportRows.filter((r) => r.targetType === 'comment').map((r) => r.targetId)
    const branches: SQL[] = []

    if (threadIds.length > 0) {
      branches.push(sql`
        select 'thread'::text as type, t.id as id, ch.space_id as space_id,
               t.channel_id as channel_id, null::uuid as thread_id,
               t.author_id as author_id, t.author_account_id as author_account_id,
               t.author_display_name as author_display_name, t.title as title, t.body as body,
               t.status::text as status, t.created_at as created_at, s.name as space_name,
               s.audience::text as space_audience, ch.name as channel_name,
               null::uuid as context_thread_id, null::uuid as context_thread_author_id,
               null::text as context_thread_author_account_id,
               null::text as context_thread_author_display_name,
               null::text as context_thread_title, null::text as context_thread_body,
               null::timestamptz as context_thread_created_at,
               null::uuid as reply_to_id, null::uuid as reply_to_author_id,
               null::text as reply_to_author_account_id,
               null::text as reply_to_author_display_name, null::text as reply_to_body,
               null::timestamptz as reply_to_created_at
        from hub.threads t
        join hub.channels ch on ch.id = t.channel_id
        join hub.spaces s on s.id = ch.space_id
        where t.id in (${sql.join(
          threadIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})
      `)
    }
    if (commentIds.length > 0) {
      branches.push(sql`
        select 'comment'::text as type, c.id as id, ch.space_id as space_id,
               t.channel_id as channel_id, c.thread_id as thread_id,
               c.author_id as author_id, c.author_account_id as author_account_id,
               c.author_display_name as author_display_name, null::text as title, c.body as body,
               c.status::text as status, c.created_at as created_at, s.name as space_name,
               s.audience::text as space_audience, ch.name as channel_name,
               t.id as context_thread_id, t.author_id as context_thread_author_id,
               t.author_account_id as context_thread_author_account_id,
               t.author_display_name as context_thread_author_display_name,
               t.title as context_thread_title, t.body as context_thread_body,
               t.created_at as context_thread_created_at,
               rc.id as reply_to_id, rc.author_id as reply_to_author_id,
               rc.author_account_id as reply_to_author_account_id,
               rc.author_display_name as reply_to_author_display_name,
               rc.body as reply_to_body, rc.created_at as reply_to_created_at
        from hub.comments c
        join hub.threads t on t.id = c.thread_id
        join hub.channels ch on ch.id = t.channel_id
        join hub.spaces s on s.id = ch.space_id
        left join hub.comments rc on rc.id = c.reply_to_id
        where c.id in (${sql.join(
          commentIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})
      `)
    }
    if (branches.length === 0) return new Map()

    const rows = (await this.db.execute(
      sql.join(branches, sql` union all `),
    )) as unknown as ReportedContentRow[]
    return new Map(rows.map((row) => [`${row.type}:${row.id}`, toReportedContent(row)]))
  }

  async findReportById(id: string): Promise<ReportRecord | null> {
    const [row] = await this.db
      .select({ report: reports, currentSpaceAudience: spaces.audience })
      .from(reports)
      .leftJoin(spaces, eq(spaces.id, reports.spaceId))
      .where(eq(reports.id, id))
      .limit(1)
    return row
      ? toReport(row.report, row.report.spaceAudience ?? row.currentSpaceAudience ?? 'unknown')
      : null
  }

  async resolveReport(
    id: string,
    status: ReportStatus,
    resolvedBy: string,
    now: Date,
  ): Promise<boolean> {
    const rows = await this.db
      .update(reports)
      .set({ status, resolvedBy, resolvedAt: now })
      .where(and(eq(reports.id, id), eq(reports.status, 'open')))
      .returning({ id: reports.id })
    return rows.length > 0
  }

  async createMuteBan(input: CreateMuteBanInput): Promise<MuteBan> {
    // Dedup: 1 mute/ban ATIVO por (usuário, servidor, escopo de canal, tipo).
    // Re-aplicar SUBSTITUI o ativo (sem acumular linhas duplicadas na fila).
    return this.db.transaction(async (tx) => {
      const sameScope =
        input.channelId === null
          ? isNull(mutesBans.channelId)
          : eq(mutesBans.channelId, input.channelId)
      await tx
        .delete(mutesBans)
        .where(
          and(
            eq(mutesBans.userId, input.userId),
            eq(mutesBans.spaceId, input.spaceId),
            eq(mutesBans.kind, input.kind),
            sameScope,
            or(isNull(mutesBans.expiresAt), gt(mutesBans.expiresAt, input.now)),
          ),
        )
      const [row] = await tx
        .insert(mutesBans)
        .values({
          id: randomUUID(),
          userId: input.userId,
          spaceId: input.spaceId,
          channelId: input.channelId,
          kind: input.kind,
          expiresAt: input.expiresAt,
          reason: input.reason,
          createdBy: input.createdBy,
          createdAt: input.now,
        })
        .returning()
      return toMuteBan(row as typeof mutesBans.$inferSelect)
    })
  }

  async removeMuteBan(
    userId: string,
    spaceId: string,
    kind: MuteBanKind,
    now: Date,
  ): Promise<boolean> {
    const rows = await this.db
      .delete(mutesBans)
      .where(
        and(
          eq(mutesBans.userId, userId),
          eq(mutesBans.spaceId, spaceId),
          eq(mutesBans.kind, kind),
          or(isNull(mutesBans.expiresAt), gt(mutesBans.expiresAt, now)),
        ),
      )
      .returning({ id: mutesBans.id })
    return rows.length > 0
  }

  async findActiveForUser(
    userId: string,
    spaceId: string,
    channelId: string,
    now: Date,
  ): Promise<MuteBan | null> {
    const rows = await this.db
      .select()
      .from(mutesBans)
      .where(
        and(
          eq(mutesBans.userId, userId),
          eq(mutesBans.spaceId, spaceId),
          // Aplica-se ao canal: servidor inteiro (NULL) OU este canal específico.
          // Mute/ban de OUTRO canal não bloqueia aqui.
          or(isNull(mutesBans.channelId), eq(mutesBans.channelId, channelId)),
          or(isNull(mutesBans.expiresAt), gt(mutesBans.expiresAt, now)),
        ),
      )
    if (rows.length === 0) return null
    // Banimento tem precedência sobre silenciamento.
    const ban = rows.find((r) => r.kind === 'ban')
    return toMuteBan((ban ?? rows[0]) as typeof mutesBans.$inferSelect)
  }

  async listMutesBans(spaceId: string): Promise<MuteBan[]> {
    const rows = await this.db
      .select()
      .from(mutesBans)
      .where(eq(mutesBans.spaceId, spaceId))
      .orderBy(asc(mutesBans.createdAt))
    return rows.map(toMuteBan)
  }

  async logAction(input: ModerationActionInput): Promise<void> {
    await this.db.insert(moderationActions).values({
      id: randomUUID(),
      kind: input.kind,
      spaceId: input.spaceId,
      channelId: input.channelId,
      targetUserId: input.targetUserId,
      targetId: input.targetId,
      moderatorId: input.moderatorId,
      reason: input.reason,
      expiresAt: input.expiresAt,
      createdAt: input.now,
    })
  }
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

function toExcerpt(
  id: string | null,
  authorId: string | null,
  authorAccountId: string | null,
  authorDisplayName: string | null,
  title: string | null,
  body: string | null,
  createdAt: string | Date | null,
): ModerationExcerpt | null {
  if (!id || !authorId || body === null || createdAt === null) return null
  return {
    id,
    authorId,
    authorAccountId,
    authorDisplayName,
    title,
    body,
    createdAt: toDate(createdAt),
  }
}

function toContext(r: PendingRow): ModerationContext {
  return {
    spaceName: r.space_name,
    spaceAudience: r.space_audience,
    channelName: r.channel_name,
    thread: toExcerpt(
      r.context_thread_id,
      r.context_thread_author_id,
      r.context_thread_author_account_id,
      r.context_thread_author_display_name,
      r.context_thread_title,
      r.context_thread_body,
      r.context_thread_created_at,
    ),
    replyTo: toExcerpt(
      r.reply_to_id,
      r.reply_to_author_id,
      r.reply_to_author_account_id,
      r.reply_to_author_display_name,
      null,
      r.reply_to_body,
      r.reply_to_created_at,
    ),
  }
}

function toPendingItem(r: PendingRow): PendingItem {
  return {
    type: r.type,
    id: r.id,
    spaceId: r.space_id,
    channelId: r.channel_id,
    threadId: r.thread_id,
    authorId: r.author_id,
    authorAccountId: r.author_account_id,
    authorDisplayName: r.author_display_name,
    title: r.title,
    body: r.body,
    createdAt: toDate(r.created_at),
    context: toContext(r),
  }
}

function toReportedContent(r: ReportedContentRow): ReportedContent {
  return { ...toPendingItem(r), status: r.status }
}

function toReport(
  r: typeof reports.$inferSelect,
  spaceAudience: 'adult' | 'kids' | 'unknown',
  content: ReportedContent | null = null,
): ReportRecord {
  return {
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    spaceId: r.spaceId,
    spaceAudience,
    reporterId: r.reporterId,
    reporterAccountId: r.reporterAccountId,
    reporterDisplayName: r.reporterDisplayName,
    reason: r.reason,
    status: r.status,
    resolvedBy: r.resolvedBy,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
    content,
  }
}

function toMuteBan(r: typeof mutesBans.$inferSelect): MuteBan {
  return {
    id: r.id,
    userId: r.userId,
    spaceId: r.spaceId,
    channelId: r.channelId,
    kind: r.kind,
    expiresAt: r.expiresAt,
    reason: r.reason,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
  }
}
