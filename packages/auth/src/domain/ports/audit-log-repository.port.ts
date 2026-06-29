/** Registro de auditoria de ação administrativa (persistido). */
export interface AuditLogRecord {
  id: string
  actorId: string
  actorEmail: string | null
  actorRole: string | null
  action: string
  method: string
  path: string
  targetId: string | null
  status: number
  ip: string | null
  userAgent: string | null
  requestId: string | null
  createdAt: Date
}

/** Entrada de criação (id/createdAt resolvidos pelo serviço/banco). */
export interface CreateAuditLogInput {
  id: string
  actorId: string
  actorEmail?: string | null
  actorRole?: string | null
  action: string
  method: string
  path: string
  targetId?: string | null
  status: number
  ip?: string | null
  userAgent?: string | null
  requestId?: string | null
  createdAt?: Date
}

/** Filtro da listagem admin (paginada). */
export interface AuditLogListFilter {
  actorId?: string
  action?: string
  targetId?: string
  startDate?: Date
  endDate?: Date
  limit: number
  offset: number
}

export interface AuditLogRepository {
  /** Append-only: registra uma ação. */
  create(input: CreateAuditLogInput): Promise<void>
  /** Lista paginada (mais recentes primeiro) + total para a paginação. */
  list(filter: AuditLogListFilter): Promise<{ items: AuditLogRecord[]; total: number }>
  /** Purga periódica: apaga registros anteriores a `before`. Retorna quantos. */
  deleteExpired(before: Date): Promise<number>
}
