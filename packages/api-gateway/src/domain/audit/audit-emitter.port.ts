/** Evento de auditoria de uma ação administrativa (emitido após sucesso da rota). */
export interface AuditEvent {
  readonly actorId: string
  readonly actorEmail?: string
  readonly actorRole?: string
  /**
   * Sessão de SUPORTE (impersonação): id do admin que está navegando como o usuário
   * (claim `act.sub`). `undefined` fora de impersonação. É o ATOR REAL da ação — sem
   * ele, uma mutação feita sob impersonação seria atribuída ao `actorId` impersonado.
   */
  readonly impersonatorId?: string
  /** Rótulo da ação (default = id da rota; ex.: `members-admin-grant`). */
  readonly action: string
  readonly method: string
  readonly path: string
  /** Recurso afetado (path param: userId/id/etc.) — `undefined` se a rota não tiver. */
  readonly targetId?: string
  readonly status: number
  readonly ip?: string
  readonly userAgent?: string
  readonly requestId?: string
}

/**
 * Porta de emissão de auditoria. A implementação é BEST-EFFORT (nunca lança, nunca
 * bloqueia a resposta proxeada) — uma falha de auditoria não pode derrubar o request.
 */
export interface AuditEmitter {
  readonly name: string
  emit(event: AuditEvent): Promise<void>
}
