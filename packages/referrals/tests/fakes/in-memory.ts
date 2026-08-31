import { randomUUID } from 'node:crypto'
import type {
  EnsureBuyerInput,
  GatewayResult,
  GrantManualOfferInput,
  ReferralsGateway,
  SendEmailInput,
} from '../../src/domain/ports/gateway.port'
import type {
  AmbassadorListItem,
  AmbassadorRecord,
  AmbassadorStats,
  AmbassadorStatus,
  CodeRecord,
  InviteRecord,
  RedemptionRecord,
  ReferralRepository,
} from '../../src/domain/ports/referral-repository.port'

/** Repo em memória — espelho fiel das regras do Drizzle (single-thread). */
export class InMemoryReferralRepository implements ReferralRepository {
  ambassadors: (AmbassadorRecord & { updatedAt: Date })[] = []
  codes: (CodeRecord & { createdAt: Date })[] = []
  redemptions: RedemptionRecord[] = []
  invites: InviteRecord[] = []
  /** Força UMA colisão de código no próximo createAmbassadorWithCode. */
  failNextCodeInsert = false

  async createAmbassadorWithCode(input: {
    name: string
    email: string
    pageToken: string
    code: string
  }): Promise<
    | { kind: 'created'; ambassador: AmbassadorRecord; code: CodeRecord }
    | { kind: 'email_exists' }
    | { kind: 'code_collision' }
  > {
    if (this.ambassadors.some((a) => a.email === input.email)) return { kind: 'email_exists' }
    if (this.failNextCodeInsert || this.codes.some((c) => c.code === input.code)) {
      this.failNextCodeInsert = false
      return { kind: 'code_collision' }
    }
    const ambassador: AmbassadorRecord & { updatedAt: Date } = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      pageToken: input.pageToken,
      status: 'active',
      linkEmailCount: 0,
      linkEmailSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const code: CodeRecord & { createdAt: Date } = {
      id: randomUUID(),
      code: input.code,
      ownerKind: 'ambassador',
      ambassadorId: ambassador.id,
      accountUserId: null,
      displayName: ambassador.name,
      ownerEmail: ambassador.email,
      status: 'active',
      createdAt: new Date(),
    }
    this.ambassadors.push(ambassador)
    this.codes.push(code)
    return { kind: 'created', ambassador, code }
  }

  async listAmbassadors(opts: {
    q?: string
    limit: number
    offset: number
  }): Promise<{ items: AmbassadorListItem[]; total: number }> {
    const q = opts.q?.trim().toLowerCase()
    const filtered = this.ambassadors.filter(
      (a) => !q || a.name.toLowerCase().includes(q) || a.email.includes(q),
    )
    const items = filtered
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(opts.offset, opts.offset + opts.limit)
      .map((a) => {
        const code = this.codes.find((c) => c.ambassadorId === a.id)
        return {
          id: a.id,
          name: a.name,
          email: a.email,
          code: code?.code ?? '',
          status: a.status,
          redemptionsCompleted: code
            ? this.redemptions.filter((r) => r.codeId === code.id && r.status === 'completed')
                .length
            : 0,
          invitesSent: this.invites.filter((i) => i.ambassadorId === a.id && i.status === 'sent')
            .length,
          linkEmailSentAt: a.linkEmailSentAt,
          createdAt: a.createdAt,
        }
      })
    return { items, total: filtered.length }
  }

  async findAmbassadorById(
    id: string,
  ): Promise<(AmbassadorRecord & { code: string | null }) | null> {
    const a = this.ambassadors.find((x) => x.id === id)
    if (!a) return null
    return { ...a, code: this.codes.find((c) => c.ambassadorId === id)?.code ?? null }
  }

  async findAmbassadorByToken(
    token: string,
  ): Promise<(AmbassadorRecord & { code: string | null; stats: AmbassadorStats }) | null> {
    const a = this.ambassadors.find((x) => x.pageToken === token)
    if (!a) return null
    const code = this.codes.find((c) => c.ambassadorId === a.id)
    return {
      ...a,
      code: code?.code ?? null,
      stats: {
        redemptionsCompleted: code
          ? this.redemptions.filter((r) => r.codeId === code.id && r.status === 'completed').length
          : 0,
        invitesSent: this.invites.filter((i) => i.ambassadorId === a.id && i.status === 'sent')
          .length,
      },
    }
  }

  async bumpLinkEmail(id: string): Promise<number> {
    const a = this.ambassadors.find((x) => x.id === id)
    if (!a) throw new Error('embaixador não encontrado')
    a.linkEmailCount += 1
    return a.linkEmailCount
  }

  async markLinkEmailSent(id: string, when: Date): Promise<void> {
    const a = this.ambassadors.find((x) => x.id === id)
    if (a) a.linkEmailSentAt = when
  }

  async setAmbassadorStatus(id: string, status: AmbassadorStatus): Promise<boolean> {
    const a = this.ambassadors.find((x) => x.id === id)
    if (!a) return false
    a.status = status
    return true
  }

  async rotatePageToken(id: string, pageToken: string): Promise<boolean> {
    const a = this.ambassadors.find((x) => x.id === id)
    if (!a) return false
    a.pageToken = pageToken
    return true
  }

  async setAmbassadorCodeStatus(
    ambassadorId: string,
    status: 'active' | 'disabled',
  ): Promise<void> {
    for (const c of this.codes) if (c.ambassadorId === ambassadorId) c.status = status
  }

  async updateAmbassador(
    id: string,
    patch: { status?: AmbassadorStatus; pageToken?: string },
  ): Promise<(AmbassadorRecord & { code: string | null }) | null> {
    const a = this.ambassadors.find((x) => x.id === id)
    if (!a) return null
    if (patch.status !== undefined) {
      a.status = patch.status
      await this.setAmbassadorCodeStatus(id, patch.status)
    }
    if (patch.pageToken !== undefined) a.pageToken = patch.pageToken
    a.updatedAt = new Date()
    return { ...a, code: this.codes.find((c) => c.ambassadorId === id)?.code ?? null }
  }

  async findCodeByCode(code: string): Promise<CodeRecord | null> {
    return this.codes.find((c) => c.code === code) ?? null
  }

  async insertRedemption(input: {
    codeId: string
    email: string
    name: string
    phone: string | null
  }): Promise<{ created: boolean; redemption: RedemptionRecord }> {
    const existing = this.redemptions.find((r) => r.email === input.email)
    if (existing) return { created: false, redemption: existing }
    const redemption: RedemptionRecord = {
      id: randomUUID(),
      codeId: input.codeId,
      email: input.email,
      name: input.name,
      phone: input.phone,
      userId: null,
      buyerCreated: null,
      grantedAt: null,
      welcomeSentAt: null,
      status: 'pending',
      failedReason: null,
      lastError: null,
      attemptCount: 0,
      completedAt: null,
      createdAt: new Date(),
    }
    this.redemptions.push(redemption)
    return { created: true, redemption }
  }

  async acquireRedemptionLease(
    id: string,
    until: Date,
    now: Date,
  ): Promise<RedemptionRecord | null> {
    const r = this.redemptions.find((x) => x.id === id)
    if (!r || r.status === 'completed') return null
    const held = (r as { processingUntil?: Date | null }).processingUntil
    if (held && held > now) return null
    ;(r as { processingUntil?: Date | null }).processingUntil = until
    r.attemptCount += 1
    return r
  }

  async releaseRedemptionLease(id: string): Promise<void> {
    const r = this.redemptions.find((x) => x.id === id)
    if (r) (r as { processingUntil?: Date | null }).processingUntil = null
  }

  async setRedemptionBuyer(id: string, userId: string, buyerCreated: boolean): Promise<void> {
    const r = this.redemptions.find((x) => x.id === id)
    if (r) {
      r.userId = userId
      r.buyerCreated = buyerCreated
    }
  }

  async markRedemptionGranted(id: string, when: Date): Promise<void> {
    const r = this.redemptions.find((x) => x.id === id)
    if (r) {
      r.grantedAt = when
      r.status = 'completed'
      r.completedAt = when
      r.failedReason = null
      r.lastError = null
    }
  }

  async markRedemptionFailed(id: string, reason: string, lastError: string | null): Promise<void> {
    const r = this.redemptions.find((x) => x.id === id)
    if (r) {
      r.status = 'failed'
      r.failedReason = reason
      r.lastError = lastError
    }
  }

  async recordRedemptionError(id: string, lastError: string): Promise<void> {
    const r = this.redemptions.find((x) => x.id === id)
    if (r) r.lastError = lastError
  }

  async claimRedemptionWelcome(id: string, when: Date): Promise<boolean> {
    const r = this.redemptions.find((x) => x.id === id)
    if (!r || r.welcomeSentAt) return false
    r.welcomeSentAt = when
    return true
  }

  async releaseRedemptionWelcome(id: string): Promise<void> {
    const r = this.redemptions.find((x) => x.id === id)
    if (r) r.welcomeSentAt = null
  }

  async findRedemptionByEmail(email: string): Promise<RedemptionRecord | null> {
    return this.redemptions.find((r) => r.email === email) ?? null
  }

  async listRedemptionsByCode(codeId: string, limit: number): Promise<RedemptionRecord[]> {
    return this.redemptions
      .filter((r) => r.codeId === codeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  async insertInvite(input: {
    ambassadorId: string
    codeId: string
    inviteeName: string
    inviteeEmail: string
  }): Promise<{ created: boolean; invite: InviteRecord }> {
    const existing = this.invites.find(
      (i) => i.ambassadorId === input.ambassadorId && i.inviteeEmail === input.inviteeEmail,
    )
    if (existing) return { created: false, invite: existing }
    const invite: InviteRecord = {
      id: randomUUID(),
      ambassadorId: input.ambassadorId,
      codeId: input.codeId,
      inviteeName: input.inviteeName,
      inviteeEmail: input.inviteeEmail,
      status: 'pending',
      sendCount: 0,
      sentAt: null,
      createdAt: new Date(),
    }
    this.invites.push(invite)
    return { created: true, invite }
  }

  async countInvitesSince(ambassadorId: string, since: Date): Promise<number> {
    return this.invites.filter((i) => i.ambassadorId === ambassadorId && i.createdAt >= since)
      .length
  }

  async bumpInviteSend(id: string): Promise<number> {
    const i = this.invites.find((x) => x.id === id)
    if (!i) throw new Error('convite não encontrado')
    i.sendCount += 1
    return i.sendCount
  }

  async markInviteSent(id: string, when: Date): Promise<void> {
    const i = this.invites.find((x) => x.id === id)
    if (i) {
      i.status = 'sent'
      i.sentAt = when
    }
  }

  async markInviteFailed(id: string): Promise<void> {
    const i = this.invites.find((x) => x.id === id)
    if (i) i.status = 'failed'
  }

  async countRedemptionsByStatus(): Promise<Record<string, number>> {
    const out: Record<string, number> = {}
    for (const r of this.redemptions) out[r.status] = (out[r.status] ?? 0) + 1
    return out
  }
}

export interface RecordedCall {
  kind: 'ensureBuyer' | 'createPasswordToken' | 'grantManualOffer' | 'sendEmail'
  input: unknown
  idempotencyKey?: string
}

/** Gateway fake: respostas configuráveis por chamada + gravação p/ asserts. */
export class FakeReferralsGateway implements ReferralsGateway {
  calls: RecordedCall[] = []
  ensureBuyerResult: GatewayResult = { status: 201, body: { userId: randomUUID(), created: true } }
  passwordTokenResult: GatewayResult = {
    status: 201,
    body: { token: 'tok-abc', expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString() },
  }
  grantResult: GatewayResult = { status: 200, body: { ok: true, granted: 2 } }
  sendEmailResult: GatewayResult = { status: 202, body: {} }

  async ensureBuyer(input: EnsureBuyerInput): Promise<GatewayResult> {
    this.calls.push({ kind: 'ensureBuyer', input })
    return this.ensureBuyerResult
  }

  async createPasswordToken(email: string): Promise<GatewayResult> {
    this.calls.push({ kind: 'createPasswordToken', input: { email } })
    return this.passwordTokenResult
  }

  async grantManualOffer(input: GrantManualOfferInput): Promise<GatewayResult> {
    this.calls.push({ kind: 'grantManualOffer', input })
    return this.grantResult
  }

  async sendEmail(input: SendEmailInput, idempotencyKey: string): Promise<GatewayResult> {
    this.calls.push({ kind: 'sendEmail', input, idempotencyKey })
    return this.sendEmailResult
  }

  callsOf(kind: RecordedCall['kind']): RecordedCall[] {
    return this.calls.filter((c) => c.kind === kind)
  }
}

export const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
