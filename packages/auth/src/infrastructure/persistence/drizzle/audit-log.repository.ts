import { and, desc, eq, gte, inArray, lt, lte, type SQL, sql } from 'drizzle-orm'
import type {
  AuditLogListFilter,
  AuditLogRecord,
  AuditLogRepository,
  CreateAuditLogInput,
} from '../../../domain/ports/audit-log-repository.port'
import type { Database } from './db'
import { auditLogs } from './schema'

type Row = typeof auditLogs.$inferSelect

/** Teto por DELETE da purga (bounded sob o statement_timeout — ver demais repos). */
const PURGE_BATCH_SIZE = 5_000

export class DrizzleAuditLogRepository implements AuditLogRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateAuditLogInput): Promise<void> {
    await this.db.insert(auditLogs).values({
      id: input.id,
      actorId: input.actorId,
      actorEmail: input.actorEmail ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      method: input.method,
      path: input.path,
      targetId: input.targetId ?? null,
      status: input.status,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
  }

  async list(filter: AuditLogListFilter): Promise<{ items: AuditLogRecord[]; total: number }> {
    const where = buildWhere(filter)
    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db
        .select({ count: sql<number>`cast(count(${auditLogs.id}) as integer)` })
        .from(auditLogs)
        .where(where),
    ])
    return { items: rows.map(toRecord), total: counted?.count ?? 0 }
  }

  async deleteExpired(before: Date): Promise<number> {
    let total = 0
    for (;;) {
      const batch = this.db
        .select({ id: auditLogs.id })
        .from(auditLogs)
        .where(lt(auditLogs.createdAt, before))
        .limit(PURGE_BATCH_SIZE)
      const deleted = await this.db
        .delete(auditLogs)
        .where(inArray(auditLogs.id, batch))
        .returning({ id: auditLogs.id })
      total += deleted.length
      if (deleted.length < PURGE_BATCH_SIZE) return total
    }
  }
}

function buildWhere(filter: AuditLogListFilter): SQL | undefined {
  const clauses: SQL[] = []
  if (filter.actorId) clauses.push(eq(auditLogs.actorId, filter.actorId))
  if (filter.action) clauses.push(eq(auditLogs.action, filter.action))
  if (filter.targetId) clauses.push(eq(auditLogs.targetId, filter.targetId))
  if (filter.startDate) clauses.push(gte(auditLogs.createdAt, filter.startDate))
  if (filter.endDate) clauses.push(lte(auditLogs.createdAt, filter.endDate))
  return clauses.length > 0 ? and(...clauses) : undefined
}

function toRecord(row: Row): AuditLogRecord {
  return {
    id: row.id,
    actorId: row.actorId,
    actorEmail: row.actorEmail,
    actorRole: row.actorRole,
    action: row.action,
    method: row.method,
    path: row.path,
    targetId: row.targetId,
    status: row.status,
    ip: row.ip,
    userAgent: row.userAgent,
    requestId: row.requestId,
    createdAt: row.createdAt,
  }
}
