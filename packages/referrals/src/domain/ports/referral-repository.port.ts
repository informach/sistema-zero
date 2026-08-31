export type AmbassadorStatus = 'active' | 'disabled'
export type CodeOwnerKind = 'ambassador' | 'account'
export type RedemptionStatus = 'pending' | 'completed' | 'failed'
export type InviteStatus = 'pending' | 'sent' | 'failed'

export interface AmbassadorRecord {
  id: string
  name: string
  email: string
  pageToken: string
  status: AmbassadorStatus
  linkEmailCount: number
  linkEmailSentAt: Date | null
  createdAt: Date
}

export interface CodeRecord {
  id: string
  code: string
  ownerKind: CodeOwnerKind
  ambassadorId: string | null
  accountUserId: string | null
  displayName: string
  ownerEmail: string | null
  status: string
}

export interface RedemptionRecord {
  id: string
  codeId: string
  email: string
  name: string
  phone: string | null
  userId: string | null
  buyerCreated: boolean | null
  grantedAt: Date | null
  welcomeSentAt: Date | null
  status: RedemptionStatus
  failedReason: string | null
  /** Último erro de upstream (diagnóstico do pending preso — aflora no admin). */
  lastError: string | null
  attemptCount: number
  completedAt: Date | null
  createdAt: Date
}

export interface InviteRecord {
  id: string
  ambassadorId: string
  codeId: string
  inviteeName: string
  inviteeEmail: string
  status: InviteStatus
  sendCount: number
  sentAt: Date | null
  createdAt: Date
}

export interface AmbassadorListItem {
  id: string
  name: string
  email: string
  code: string
  status: AmbassadorStatus
  redemptionsCompleted: number
  invitesSent: number
  linkEmailSentAt: Date | null
  createdAt: Date
}

export interface AmbassadorStats {
  redemptionsCompleted: number
  invitesSent: number
}

export interface ReferralRepository {
  // ── Embaixadores ──────────────────────────────────────────────────────────
  /** Cria embaixador + código na MESMA transação. `email_exists` = UNIQUE do e-mail. */
  createAmbassadorWithCode(input: {
    name: string
    email: string
    pageToken: string
    code: string
  }): Promise<
    | { kind: 'created'; ambassador: AmbassadorRecord; code: CodeRecord }
    | { kind: 'email_exists' }
    | { kind: 'code_collision' }
  >
  listAmbassadors(opts: {
    q?: string
    limit: number
    offset: number
  }): Promise<{ items: AmbassadorListItem[]; total: number }>
  findAmbassadorById(id: string): Promise<(AmbassadorRecord & { code: string | null }) | null>
  findAmbassadorByToken(
    token: string,
  ): Promise<(AmbassadorRecord & { code: string | null; stats: AmbassadorStats }) | null>
  /** Reserva o número de sequência do e-mail do link (count++ atômico). */
  bumpLinkEmail(id: string): Promise<number>
  markLinkEmailSent(id: string, when: Date): Promise<void>
  setAmbassadorStatus(id: string, status: AmbassadorStatus): Promise<boolean>
  rotatePageToken(id: string, pageToken: string): Promise<boolean>
  /** Desativa/reativa o código do embaixador junto com ele. */
  setAmbassadorCodeStatus(ambassadorId: string, status: 'active' | 'disabled'): Promise<void>
  /**
   * PATCH atômico do embaixador (status e/ou token) — o código acompanha o
   * status na MESMA transação (sem janela "embaixador off, código on").
   */
  updateAmbassador(
    id: string,
    patch: { status?: AmbassadorStatus; pageToken?: string },
  ): Promise<(AmbassadorRecord & { code: string | null }) | null>

  // ── Códigos ───────────────────────────────────────────────────────────────
  findCodeByCode(code: string): Promise<CodeRecord | null>

  // ── Resgates de bolsa ─────────────────────────────────────────────────────
  /**
   * Claim da bolsa: `INSERT ... ON CONFLICT (email) DO NOTHING`. `created:false`
   * devolve a linha EXISTENTE (retomada ou 409 — decisão do serviço).
   */
  insertRedemption(input: {
    codeId: string
    email: string
    name: string
    phone: string | null
  }): Promise<{ created: boolean; redemption: RedemptionRecord }>
  /**
   * Lease atômico: só vence quem encontra `processing_until` NULL/expirado e a
   * linha não-completed. `null` = outra execução está com a bolsa (202).
   */
  acquireRedemptionLease(id: string, until: Date, now: Date): Promise<RedemptionRecord | null>
  releaseRedemptionLease(id: string): Promise<void>
  setRedemptionBuyer(id: string, userId: string, buyerCreated: boolean): Promise<void>
  /** granted_at + status completed + completed_at (o acesso é o produto). */
  markRedemptionGranted(id: string, when: Date): Promise<void>
  markRedemptionFailed(id: string, reason: string, lastError: string | null): Promise<void>
  /** Grava o último erro de upstream SEM mudar o status (pending segue retryável). */
  recordRedemptionError(id: string, lastError: string): Promise<void>
  /** Claim atômico do welcome (UPDATE ... WHERE welcome_sent_at IS NULL RETURNING). */
  claimRedemptionWelcome(id: string, when: Date): Promise<boolean>
  /** Libera o claim SÓ quando nada foi emitido (falha na emissão do token). */
  releaseRedemptionWelcome(id: string): Promise<void>
  findRedemptionByEmail(email: string): Promise<RedemptionRecord | null>
  listRedemptionsByCode(codeId: string, limit: number): Promise<RedemptionRecord[]>

  // ── Convites ──────────────────────────────────────────────────────────────
  /** `created:false` devolve o convite EXISTENTE (UNIQUE ambassador+e-mail). */
  insertInvite(input: {
    ambassadorId: string
    codeId: string
    inviteeName: string
    inviteeEmail: string
  }): Promise<{ created: boolean; invite: InviteRecord }>
  countInvitesSince(ambassadorId: string, since: Date): Promise<number>
  /** Reserva o número de sequência do envio (send_count++ atômico). */
  bumpInviteSend(id: string): Promise<number>
  markInviteSent(id: string, when: Date): Promise<void>
  markInviteFailed(id: string): Promise<void>

  // ── Métricas ──────────────────────────────────────────────────────────────
  countRedemptionsByStatus(): Promise<Record<string, number>>
}
