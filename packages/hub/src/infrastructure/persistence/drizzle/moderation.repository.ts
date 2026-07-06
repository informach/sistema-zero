import { randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq, gt, isNull, or, type SQL, sql } from 'drizzle-orm'
import type { MuteBan, MuteBanKind } from '../../../domain/moderation/mute-ban'
import type {
  CreateMuteBanInput,
  CreateReportInput,
  ModerationActionInput,
  ModerationRepository,
  PendingItem,
  ReportRecord,
  ReportStatus,
} from '../../../domain/ports/moderation-repository.port'
import type { Database } from './db'
import { moderationActions, mutesBans, reports } from './schema'

/** Linha crua da fila de aprovação (UNION ALL tópicos + comentários pendentes). */
interface PendingRow {
  type: 'thread' | 'comment'
  id: string
  space_id: string
  channel_id: string
  thread_id: string | null
  author_id: string
  title: string | null
  body: string
  // `db.execute(sql)` CRU não passa pelo mapeamento do drizzle → o postgres.js devolve o
  // timestamptz como STRING (não `Date`). Coagimos no map abaixo — sem isso o mapper
  // `toPendingItemView` chamava `.toISOString()` numa string e dava 500 (só com fila ≥1).
  created_at: string | Date
}

export class DrizzleModerationRepository implements ModerationRepository {
  constructor(private readonly db: Database) {}

  async listPending(opts: {
    spaceId?: string
    limit: number
    offset: number
  }): Promise<{ items: PendingItem[]; total: number }> {
    // UNION ALL paginado NO BANCO (FIFO global por created_at) — sem carregar a
    // fila inteira em memória nem capar o `total`. `space_id` é opcional.
    const spaceCond = opts.spaceId ? sql`and ch.space_id = ${opts.spaceId}` : sql``
    const union = sql`
      select 'thread'::text as type, t.id as id, ch.space_id as space_id,
             t.channel_id as channel_id, null::uuid as thread_id,
             t.author_id as author_id, t.title as title, t.body as body,
             t.created_at as created_at
      from hub.threads t
      join hub.channels ch on ch.id = t.channel_id
      where t.status = 'pending' ${spaceCond}
      union all
      select 'comment'::text as type, c.id as id, ch.space_id as space_id,
             t.channel_id as channel_id, c.thread_id as thread_id,
             c.author_id as author_id, null::text as title, c.body as body,
             c.created_at as created_at
      from hub.comments c
      join hub.threads t on t.id = c.thread_id
      join hub.channels ch on ch.id = t.channel_id
      where c.status = 'pending' ${spaceCond}
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

    const items: PendingItem[] = rows.map((r) => ({
      type: r.type,
      id: r.id,
      spaceId: r.space_id,
      channelId: r.channel_id,
      threadId: r.thread_id,
      authorId: r.author_id,
      title: r.title,
      body: r.body,
      // Normaliza a string do postgres.js (execute cru) para Date — o domínio/mapper esperam Date.
      createdAt: r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
    }))
    return { items, total: Number(counted?.total ?? 0) }
  }

  async createReport(input: CreateReportInput): Promise<void> {
    await this.db.insert(reports).values({
      id: randomUUID(),
      targetType: input.targetType,
      targetId: input.targetId,
      spaceId: input.spaceId,
      reporterId: input.reporterId,
      reason: input.reason,
      status: 'open',
      createdAt: input.now,
    })
  }

  async listReports(opts: {
    spaceId?: string
    status?: ReportStatus
    limit: number
    offset: number
  }): Promise<{ items: ReportRecord[]; total: number }> {
    const where: SQL[] = []
    if (opts.spaceId) where.push(eq(reports.spaceId, opts.spaceId))
    if (opts.status) where.push(eq(reports.status, opts.status))
    const cond = where.length > 0 ? and(...where) : undefined
    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(reports)
        .where(cond)
        .orderBy(desc(reports.createdAt))
        .limit(opts.limit)
        .offset(opts.offset),
      this.db.select({ c: count() }).from(reports).where(cond),
    ])
    return { items: rows.map(toReport), total: counted?.c ?? 0 }
  }

  async findReportById(id: string): Promise<ReportRecord | null> {
    const [row] = await this.db.select().from(reports).where(eq(reports.id, id)).limit(1)
    return row ? toReport(row) : null
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

function toReport(r: typeof reports.$inferSelect): ReportRecord {
  return {
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    spaceId: r.spaceId,
    reporterId: r.reporterId,
    reason: r.reason,
    status: r.status,
    resolvedBy: r.resolvedBy,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
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
