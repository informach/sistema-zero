export type AmbassadorStatus = 'active' | 'disabled'
export type CodeOwnerKind = 'ambassador' | 'account'
export type RedemptionStatus = 'pending' | 'completed' | 'failed'
export type InviteStatus = 'pending' | 'sent' | 'failed'

export interface AmbassadorRecord {
  id: string
  name: string
  email: string
  pageToken: string
  /** Conta do auth quando o embaixador é um pai/responsável (auto-cadastro). */
  accountUserId: string | null
  /** Chave Pix p/ o bônus (cadastrada pelo próprio embaixador). */
  pixKey: string | null
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

/** Fonte ÚNICA do union (o admin espelha por teste de conformance). */
export const CONVERSION_STATUSES = [
  'pending',
  'eligible',
  'paid',
  'canceled',
  'self_blocked',
] as const
export type ConversionStatus = (typeof CONVERSION_STATUSES)[number]

/**
 * O que o EMBAIXADOR enxerga (página + card dos pais): `self_blocked` e
 * `canceled` ficam de fora — só confundem quem espera dinheiro. Dono único da
 * regra; repo e rotas derivam daqui.
 */
export const AMBASSADOR_VISIBLE_CONVERSION_STATUSES = ['pending', 'eligible', 'paid'] as const

/**
 * Conversão: bolsista que ASSINOU a Comunidade. O bônus nunca é saldo — o
 * status sinaliza elegibilidade e o Pix é pago manualmente (admin marca pago).
 */
export interface ConversionRecord {
  id: string
  redemptionId: string
  codeId: string
  ambassadorId: string | null
  paymentId: string
  subscriptionId: string | null
  offerSlug: string
  amountCents: bigint
  bonusCents: number
  status: ConversionStatus
  paidAt: Date
  maturesAt: Date
  eligibleAt: Date | null
  notifiedAt: Date | null
  paidMarkedAt: Date | null
  paidMarkedBy: string | null
  note: string | null
  createdAt: Date
}

/** Linha da listagem admin (joins de exibição). */
export interface ConversionListItem extends ConversionRecord {
  ambassadorName: string | null
  ambassadorEmail: string | null
  ambassadorPixKey: string | null
  redemptionName: string
  redemptionEmail: string
}

/** Item do ciclo de notificação (eligible ainda não avisado). */
export interface ConversionToNotify {
  id: string
  bonusCents: number
  ambassadorName: string | null
  ambassadorEmail: string | null
  ambassadorPageToken: string | null
}

export interface ReferralRepository {
  // ── Embaixadores ──────────────────────────────────────────────────────────
  /** Cria embaixador + código na MESMA transação. `email_exists` = UNIQUE do e-mail. */
  createAmbassadorWithCode(input: {
    name: string
    email: string
    pageToken: string
    code: string
    /** Conta do auth no auto-cadastro (pai/responsável) — null no fluxo admin. */
    accountUserId?: string | null
  }): Promise<
    | { kind: 'created'; ambassador: AmbassadorRecord; code: CodeRecord }
    | { kind: 'email_exists' }
    | { kind: 'account_exists' }
    | { kind: 'code_collision' }
  >
  findAmbassadorByAccount(
    accountUserId: string,
  ): Promise<(AmbassadorRecord & { code: string | null }) | null>
  /**
   * Vincula a CONTA a um embaixador externo já cadastrado com o mesmo e-mail
   * (idempotente p/ a mesma conta; e-mail de OUTRA conta → null).
   */
  linkAmbassadorAccount(
    email: string,
    accountUserId: string,
  ): Promise<(AmbassadorRecord & { code: string | null }) | null>
  /** Chave Pix cadastrada pelo PRÓPRIO embaixador (capability da página). */
  setAmbassadorPixByToken(pageToken: string, pixKey: string): Promise<boolean>
  /** Só os 2 counts do painel (sem re-buscar o embaixador que já está em mãos). */
  getAmbassadorStats(ambassadorId: string): Promise<AmbassadorStats>
  countConversionsForAmbassador(ambassadorId: string): Promise<Record<string, number>>
  /** SÓ os status visíveis ao embaixador (filtro no SQL, ANTES do limit). */
  listAmbassadorVisibleConversions(ambassadorId: string, limit: number): Promise<ConversionRecord[]>
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

  // ── Conversões (bolsista → assinatura da Comunidade) ─────────────────────
  /** Resgate + o CODE dele (owner_email alimenta o anti-autoindicação). */
  findRedemptionWithCodeByEmail(
    email: string,
  ): Promise<{ redemption: RedemptionRecord; code: CodeRecord } | null>
  /**
   * `ON CONFLICT DO NOTHING` nas DUAS uniques (redemption_id = "só a primeira
   * cobrança"; payment_id = re-entrega) — conflito devolve `created: false`.
   */
  insertConversion(input: {
    redemptionId: string
    codeId: string
    ambassadorId: string | null
    paymentId: string
    subscriptionId: string | null
    offerSlug: string
    amountCents: bigint
    bonusCents: number
    status: 'pending' | 'self_blocked'
    paidAt: Date
    maturesAt: Date
  }): Promise<{ created: boolean }>
  /**
   * Estorno na garantia: só `pending` cancela. `not_pending` devolve o STATUS
   * corrente — self_blocked/canceled são benignos; eligible/paid afloram ao
   * humano (bônus já prometido/pago de assinatura estornada).
   */
  cancelPendingConversionByPayment(
    paymentId: string,
  ): Promise<
    { kind: 'canceled' } | { kind: 'not_found' } | { kind: 'not_pending'; status: ConversionStatus }
  >
  /** Sweep: `pending → eligible` quando `matures_at <= now` (lote). */
  matureConversions(now: Date, limit: number): Promise<number>
  /** Elegíveis ainda não avisadas, SÓ de embaixador ATIVO (página viva). */
  listConversionsToNotify(limit: number): Promise<ConversionToNotify[]>
  markConversionNotified(id: string, when: Date): Promise<void>
  listConversions(opts: {
    status?: ConversionStatus
    limit: number
    offset: number
  }): Promise<{ items: ConversionListItem[]; total: number }>
  /** Controle do Pix manual: só `eligible` vira `paid` (idempotente por guard). */
  markConversionPaid(id: string, by: string, note: string | null): Promise<boolean>
  /** Staging/e2e: antecipa a maturação (`pending` → matures_at = now). */
  setConversionMaturesNow(id: string): Promise<boolean>
  /** Conversões dos resgates de um código (estágio da jornada no admin). */
  listConversionsByCode(codeId: string, limit: number): Promise<ConversionRecord[]>

  // ── Métricas ──────────────────────────────────────────────────────────────
  countRedemptionsByStatus(): Promise<Record<string, number>>
}
