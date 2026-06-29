import type { AuditLogRecord } from '../../domain/ports/audit-log-repository.port'

/** View admin de um registro de auditoria (datas → ISO-8601). */
export interface AuditLogView {
  id: string
  actorId: string
  actorEmail: string | null
  actorRole: string | null
  impersonatorId: string | null
  action: string
  method: string
  path: string
  targetId: string | null
  status: number
  ip: string | null
  userAgent: string | null
  requestId: string | null
  createdAt: string
}

export function toAuditLogView(r: AuditLogRecord): AuditLogView {
  return {
    id: r.id,
    actorId: r.actorId,
    actorEmail: r.actorEmail,
    actorRole: r.actorRole,
    impersonatorId: r.impersonatorId,
    action: r.action,
    method: r.method,
    path: r.path,
    targetId: r.targetId,
    status: r.status,
    ip: r.ip,
    userAgent: r.userAgent,
    requestId: r.requestId,
    createdAt: r.createdAt.toISOString(),
  }
}
