import { and, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import type {
  AmbassadorListItem,
  AmbassadorRecord,
  AmbassadorStats,
  AmbassadorStatus,
  CodeRecord,
  InviteRecord,
  InviteStatus,
  RedemptionRecord,
  RedemptionStatus,
  ReferralRepository,
} from '../../../domain/ports/referral-repository.port'
import type { Database } from './db'
import { escapeLike, isUniqueViolation } from './pg-errors'
import { ambassadors, codes, invites, scholarshipRedemptions } from './schema'

type AmbassadorRow = typeof ambassadors.$inferSelect
type CodeRow = typeof codes.$inferSelect
type RedemptionRow = typeof scholarshipRedemptions.$inferSelect
type InviteRow = typeof invites.$inferSelect

function toAmbassador(row: AmbassadorRow): AmbassadorRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    pageToken: row.pageToken,
    status: row.status as AmbassadorStatus,
    linkEmailCount: row.linkEmailCount,
    linkEmailSentAt: row.linkEmailSentAt,
    createdAt: row.createdAt,
  }
}

function toCode(row: CodeRow): CodeRecord {
  return {
    id: row.id,
    code: row.code,
    ownerKind: row.ownerKind as CodeRecord['ownerKind'],
    ambassadorId: row.ambassadorId,
    accountUserId: row.accountUserId,
    displayName: row.displayName,
    ownerEmail: row.ownerEmail,
    status: row.status,
  }
}

function toRedemption(row: RedemptionRow): RedemptionRecord {
  return {
    id: row.id,
    codeId: row.codeId,
    email: row.email,
    name: row.name,
    phone: row.phone,
    userId: row.userId,
    buyerCreated: row.buyerCreated,
    grantedAt: row.grantedAt,
    welcomeSentAt: row.welcomeSentAt,
    status: row.status as RedemptionStatus,
    failedReason: row.failedReason,
    lastError: row.lastError,
    attemptCount: row.attemptCount,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  }
}

function toInvite(row: InviteRow): InviteRecord {
  return {
    id: row.id,
    ambassadorId: row.ambassadorId,
    codeId: row.codeId,
    inviteeName: row.inviteeName,
    inviteeEmail: row.inviteeEmail,
    status: row.status as InviteStatus,
    sendCount: row.sendCount,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
  }
}

export class DrizzleReferralRepository implements ReferralRepository {
  constructor(private readonly db: Database) {}

  // ── Embaixadores ──────────────────────────────────────────────────────────

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
    try {
      return await this.db.transaction(async (tx) => {
        const [ambassador] = await tx
          .insert(ambassadors)
          .values({ name: input.name, email: input.email, pageToken: input.pageToken })
          .onConflictDoNothing({ target: ambassadors.email })
          .returning()
        if (!ambassador) return { kind: 'email_exists' as const }
        const [code] = await tx
          .insert(codes)
          .values({
            code: input.code,
            ownerKind: 'ambassador',
            ambassadorId: ambassador.id,
            displayName: ambassador.name,
            ownerEmail: ambassador.email,
          })
          .returning()
        if (!code) throw new Error('insert do código não retornou linha')
        return {
          kind: 'created' as const,
          ambassador: toAmbassador(ambassador),
          code: toCode(code),
        }
      })
    } catch (error) {
      // A UNIQUE do e-mail é tratada pelo onConflictDoNothing acima — um 23505
      // aqui só pode ser a UNIQUE do código (colisão de sufixo; re-sorteia).
      if (isUniqueViolation(error)) return { kind: 'code_collision' }
      throw error
    }
  }

  async listAmbassadors(opts: {
    q?: string
    limit: number
    offset: number
  }): Promise<{ items: AmbassadorListItem[]; total: number }> {
    const q = opts.q?.trim()
    const where = q
      ? or(
          ilike(ambassadors.name, `%${escapeLike(q)}%`),
          ilike(ambassadors.email, `%${escapeLike(q)}%`),
        )
      : undefined

    // Página + total independem entre si; contagens dependem só da página.
    const [rows, [{ value: total } = { value: 0 }]] = await Promise.all([
      this.db
        .select({ ambassador: ambassadors, code: codes })
        .from(ambassadors)
        .leftJoin(codes, eq(codes.ambassadorId, ambassadors.id))
        .where(where)
        .orderBy(desc(ambassadors.createdAt))
        .limit(opts.limit)
        .offset(opts.offset),
      this.db.select({ value: count() }).from(ambassadors).where(where),
    ])

    const ambassadorIds = rows.map((r) => r.ambassador.id)
    const codeIds = rows.flatMap((r) => (r.code ? [r.code.id] : []))

    const [redemptionGroups, inviteGroups] = await Promise.all([
      codeIds.length > 0
        ? this.db
            .select({ codeId: scholarshipRedemptions.codeId, value: count() })
            .from(scholarshipRedemptions)
            .where(
              and(
                inArray(scholarshipRedemptions.codeId, codeIds),
                eq(scholarshipRedemptions.status, 'completed'),
              ),
            )
            .groupBy(scholarshipRedemptions.codeId)
        : Promise.resolve([]),
      ambassadorIds.length > 0
        ? this.db
            .select({ ambassadorId: invites.ambassadorId, value: count() })
            .from(invites)
            .where(and(inArray(invites.ambassadorId, ambassadorIds), eq(invites.status, 'sent')))
            .groupBy(invites.ambassadorId)
        : Promise.resolve([]),
    ])
    const redemptionCounts = new Map(redemptionGroups.map((g) => [g.codeId, g.value]))
    const inviteCounts = new Map(inviteGroups.map((g) => [g.ambassadorId, g.value]))

    return {
      items: rows.map((r) => ({
        id: r.ambassador.id,
        name: r.ambassador.name,
        email: r.ambassador.email,
        code: r.code?.code ?? '',
        status: r.ambassador.status as AmbassadorStatus,
        redemptionsCompleted: r.code ? (redemptionCounts.get(r.code.id) ?? 0) : 0,
        invitesSent: inviteCounts.get(r.ambassador.id) ?? 0,
        linkEmailSentAt: r.ambassador.linkEmailSentAt,
        createdAt: r.ambassador.createdAt,
      })),
      total,
    }
  }

  async findAmbassadorById(
    id: string,
  ): Promise<(AmbassadorRecord & { code: string | null }) | null> {
    const [row] = await this.db
      .select({ ambassador: ambassadors, code: codes })
      .from(ambassadors)
      .leftJoin(codes, eq(codes.ambassadorId, ambassadors.id))
      .where(eq(ambassadors.id, id))
      .limit(1)
    if (!row) return null
    return { ...toAmbassador(row.ambassador), code: row.code?.code ?? null }
  }

  async findAmbassadorByToken(
    token: string,
  ): Promise<(AmbassadorRecord & { code: string | null; stats: AmbassadorStats }) | null> {
    const [row] = await this.db
      .select({ ambassador: ambassadors, code: codes })
      .from(ambassadors)
      .leftJoin(codes, eq(codes.ambassadorId, ambassadors.id))
      .where(eq(ambassadors.pageToken, token))
      .limit(1)
    if (!row) return null

    const codeId = row.code?.id
    const [[c] = [], [i]] = await Promise.all([
      codeId
        ? this.db
            .select({ value: count() })
            .from(scholarshipRedemptions)
            .where(
              and(
                eq(scholarshipRedemptions.codeId, codeId),
                eq(scholarshipRedemptions.status, 'completed'),
              ),
            )
        : Promise.resolve([]),
      this.db
        .select({ value: count() })
        .from(invites)
        .where(and(eq(invites.ambassadorId, row.ambassador.id), eq(invites.status, 'sent'))),
    ])
    const redemptionsCompleted = c?.value ?? 0

    return {
      ...toAmbassador(row.ambassador),
      code: row.code?.code ?? null,
      stats: { redemptionsCompleted, invitesSent: i?.value ?? 0 },
    }
  }

  async bumpLinkEmail(id: string): Promise<number> {
    const [row] = await this.db
      .update(ambassadors)
      .set({
        linkEmailCount: sql`${ambassadors.linkEmailCount} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(ambassadors.id, id))
      .returning({ linkEmailCount: ambassadors.linkEmailCount })
    if (!row) throw new Error('embaixador não encontrado')
    return row.linkEmailCount
  }

  async markLinkEmailSent(id: string, when: Date): Promise<void> {
    await this.db
      .update(ambassadors)
      .set({ linkEmailSentAt: when, updatedAt: sql`now()` })
      .where(eq(ambassadors.id, id))
  }

  async setAmbassadorStatus(id: string, status: AmbassadorStatus): Promise<boolean> {
    const rows = await this.db
      .update(ambassadors)
      .set({ status, updatedAt: sql`now()` })
      .where(eq(ambassadors.id, id))
      .returning({ id: ambassadors.id })
    return rows.length > 0
  }

  async rotatePageToken(id: string, pageToken: string): Promise<boolean> {
    const rows = await this.db
      .update(ambassadors)
      .set({ pageToken, updatedAt: sql`now()` })
      .where(eq(ambassadors.id, id))
      .returning({ id: ambassadors.id })
    return rows.length > 0
  }

  async setAmbassadorCodeStatus(
    ambassadorId: string,
    status: 'active' | 'disabled',
  ): Promise<void> {
    await this.db.update(codes).set({ status }).where(eq(codes.ambassadorId, ambassadorId))
  }

  async updateAmbassador(
    id: string,
    patch: { status?: AmbassadorStatus; pageToken?: string },
  ): Promise<(AmbassadorRecord & { code: string | null }) | null> {
    return await this.db.transaction(async (tx) => {
      const [ambassador] = await tx
        .update(ambassadors)
        .set({
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.pageToken !== undefined ? { pageToken: patch.pageToken } : {}),
          updatedAt: sql`now()`,
        })
        .where(eq(ambassadors.id, id))
        .returning()
      if (!ambassador) return null
      if (patch.status !== undefined) {
        await tx.update(codes).set({ status: patch.status }).where(eq(codes.ambassadorId, id))
      }
      const [codeRow] = await tx
        .select({ code: codes.code })
        .from(codes)
        .where(eq(codes.ambassadorId, id))
        .limit(1)
      return { ...toAmbassador(ambassador), code: codeRow?.code ?? null }
    })
  }

  // ── Códigos ───────────────────────────────────────────────────────────────

  async findCodeByCode(code: string): Promise<CodeRecord | null> {
    const [row] = await this.db.select().from(codes).where(eq(codes.code, code)).limit(1)
    return row ? toCode(row) : null
  }

  // ── Resgates ──────────────────────────────────────────────────────────────

  async insertRedemption(input: {
    codeId: string
    email: string
    name: string
    phone: string | null
  }): Promise<{ created: boolean; redemption: RedemptionRecord }> {
    const [inserted] = await this.db
      .insert(scholarshipRedemptions)
      .values({
        codeId: input.codeId,
        email: input.email,
        name: input.name,
        phone: input.phone,
      })
      .onConflictDoNothing({ target: scholarshipRedemptions.email })
      .returning()
    if (inserted) return { created: true, redemption: toRedemption(inserted) }
    const existing = await this.findRedemptionByEmail(input.email)
    if (!existing) throw new Error('conflito no insert sem linha existente (corrida de delete?)')
    return { created: false, redemption: existing }
  }

  async acquireRedemptionLease(
    id: string,
    until: Date,
    now: Date,
  ): Promise<RedemptionRecord | null> {
    const [row] = await this.db
      .update(scholarshipRedemptions)
      .set({
        processingUntil: until,
        attemptCount: sql`${scholarshipRedemptions.attemptCount} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(scholarshipRedemptions.id, id),
          sql`${scholarshipRedemptions.status} <> 'completed'`,
          or(
            isNull(scholarshipRedemptions.processingUntil),
            lt(scholarshipRedemptions.processingUntil, now),
          ),
        ),
      )
      .returning()
    return row ? toRedemption(row) : null
  }

  async releaseRedemptionLease(id: string): Promise<void> {
    await this.db
      .update(scholarshipRedemptions)
      .set({ processingUntil: null, updatedAt: sql`now()` })
      .where(eq(scholarshipRedemptions.id, id))
  }

  async setRedemptionBuyer(id: string, userId: string, buyerCreated: boolean): Promise<void> {
    await this.db
      .update(scholarshipRedemptions)
      .set({ userId, buyerCreated, updatedAt: sql`now()` })
      .where(eq(scholarshipRedemptions.id, id))
  }

  async markRedemptionGranted(id: string, when: Date): Promise<void> {
    await this.db
      .update(scholarshipRedemptions)
      .set({
        grantedAt: when,
        status: 'completed',
        completedAt: when,
        failedReason: null,
        lastError: null,
        updatedAt: sql`now()`,
      })
      .where(eq(scholarshipRedemptions.id, id))
  }

  async markRedemptionFailed(id: string, reason: string, lastError: string | null): Promise<void> {
    await this.db
      .update(scholarshipRedemptions)
      .set({ status: 'failed', failedReason: reason, lastError, updatedAt: sql`now()` })
      .where(eq(scholarshipRedemptions.id, id))
  }

  async recordRedemptionError(id: string, lastError: string): Promise<void> {
    await this.db
      .update(scholarshipRedemptions)
      .set({ lastError, updatedAt: sql`now()` })
      .where(eq(scholarshipRedemptions.id, id))
  }

  async claimRedemptionWelcome(id: string, when: Date): Promise<boolean> {
    const rows = await this.db
      .update(scholarshipRedemptions)
      .set({ welcomeSentAt: when, updatedAt: sql`now()` })
      .where(and(eq(scholarshipRedemptions.id, id), isNull(scholarshipRedemptions.welcomeSentAt)))
      .returning({ id: scholarshipRedemptions.id })
    return rows.length > 0
  }

  async releaseRedemptionWelcome(id: string): Promise<void> {
    await this.db
      .update(scholarshipRedemptions)
      .set({ welcomeSentAt: null, updatedAt: sql`now()` })
      .where(eq(scholarshipRedemptions.id, id))
  }

  async findRedemptionByEmail(email: string): Promise<RedemptionRecord | null> {
    const [row] = await this.db
      .select()
      .from(scholarshipRedemptions)
      .where(eq(scholarshipRedemptions.email, email))
      .limit(1)
    return row ? toRedemption(row) : null
  }

  async listRedemptionsByCode(codeId: string, limit: number): Promise<RedemptionRecord[]> {
    const rows = await this.db
      .select()
      .from(scholarshipRedemptions)
      .where(eq(scholarshipRedemptions.codeId, codeId))
      .orderBy(desc(scholarshipRedemptions.createdAt))
      .limit(limit)
    return rows.map(toRedemption)
  }

  // ── Convites ──────────────────────────────────────────────────────────────

  async insertInvite(input: {
    ambassadorId: string
    codeId: string
    inviteeName: string
    inviteeEmail: string
  }): Promise<{ created: boolean; invite: InviteRecord }> {
    const [inserted] = await this.db
      .insert(invites)
      .values({
        ambassadorId: input.ambassadorId,
        codeId: input.codeId,
        inviteeName: input.inviteeName,
        inviteeEmail: input.inviteeEmail,
      })
      .onConflictDoNothing({ target: [invites.ambassadorId, invites.inviteeEmail] })
      .returning()
    if (inserted) return { created: true, invite: toInvite(inserted) }
    const [existing] = await this.db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.ambassadorId, input.ambassadorId),
          eq(invites.inviteeEmail, input.inviteeEmail),
        ),
      )
      .limit(1)
    if (!existing) throw new Error('conflito no insert sem convite existente')
    return { created: false, invite: toInvite(existing) }
  }

  async countInvitesSince(ambassadorId: string, since: Date): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(invites)
      .where(and(eq(invites.ambassadorId, ambassadorId), gte(invites.createdAt, since)))
    return row?.value ?? 0
  }

  async bumpInviteSend(id: string): Promise<number> {
    const [row] = await this.db
      .update(invites)
      .set({ sendCount: sql`${invites.sendCount} + 1` })
      .where(eq(invites.id, id))
      .returning({ sendCount: invites.sendCount })
    if (!row) throw new Error('convite não encontrado')
    return row.sendCount
  }

  async markInviteSent(id: string, when: Date): Promise<void> {
    await this.db.update(invites).set({ status: 'sent', sentAt: when }).where(eq(invites.id, id))
  }

  async markInviteFailed(id: string): Promise<void> {
    await this.db.update(invites).set({ status: 'failed' }).where(eq(invites.id, id))
  }

  // ── Métricas ──────────────────────────────────────────────────────────────

  async countRedemptionsByStatus(): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ status: scholarshipRedemptions.status, value: count() })
      .from(scholarshipRedemptions)
      .groupBy(scholarshipRedemptions.status)
    const out: Record<string, number> = {}
    for (const r of rows) out[r.status] = r.value
    return out
  }
}
