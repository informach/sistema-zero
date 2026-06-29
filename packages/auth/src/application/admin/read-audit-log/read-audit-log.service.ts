import type { AuditLogRepository } from '../../../domain/ports/audit-log-repository.port'
import { type AuditLogView, toAuditLogView } from '../../mappers/audit-log-view'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export interface ReadAuditLogCommand {
  actorId?: string
  action?: string
  targetId?: string
  startDate?: Date
  endDate?: Date
  limit: number
  offset: number
}

export interface ReadAuditLogResult {
  items: AuditLogView[]
  total: number
  limit: number
  offset: number
}

/** Listagem admin da trilha de auditoria (paginada + filtros). */
export class ReadAuditLogService {
  constructor(private readonly auditLogs: AuditLogRepository) {}

  async execute(command: ReadAuditLogCommand): Promise<ReadAuditLogResult> {
    const limit = clamp(command.limit, 1, MAX_LIMIT, DEFAULT_LIMIT)
    const offset =
      Number.isFinite(command.offset) && command.offset > 0 ? Math.trunc(command.offset) : 0

    const { items, total } = await this.auditLogs.list({
      actorId: command.actorId,
      action: command.action,
      targetId: command.targetId,
      startDate: command.startDate,
      endDate: command.endDate,
      limit,
      offset,
    })
    return { items: items.map(toAuditLogView), total, limit, offset }
  }
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}
