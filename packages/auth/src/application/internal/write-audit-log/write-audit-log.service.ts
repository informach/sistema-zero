import { randomUUID } from 'node:crypto'
import type { AuditLogRepository } from '../../../domain/ports/audit-log-repository.port'

export interface WriteAuditLogCommand {
  actorId: string
  actorEmail?: string | null
  actorRole?: string | null
  impersonatorId?: string | null
  action: string
  method: string
  path: string
  targetId?: string | null
  status: number
  ip?: string | null
  userAgent?: string | null
  requestId?: string | null
}

/**
 * Registra uma ação administrativa na trilha de auditoria (S2S, chamada pelo gateway).
 * Append-only. Falhas são devolvidas normalmente; é o gateway que escolhe emitir
 * em best-effort sem bloquear a resposta do usuário.
 */
export class WriteAuditLogService {
  constructor(private readonly auditLogs: AuditLogRepository) {}

  async execute(command: WriteAuditLogCommand): Promise<void> {
    await this.auditLogs.create({
      id: randomUUID(),
      actorId: command.actorId,
      actorEmail: command.actorEmail ?? null,
      actorRole: command.actorRole ?? null,
      impersonatorId: command.impersonatorId ?? null,
      action: command.action,
      method: command.method,
      path: command.path,
      targetId: command.targetId ?? null,
      status: command.status,
      ip: command.ip ?? null,
      userAgent: command.userAgent ?? null,
      requestId: command.requestId ?? null,
    })
  }
}
