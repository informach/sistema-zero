import { and, count, desc, eq, gte, ilike, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm'
import type {
  AmbassadorListItem,
  AmbassadorRecord,
  AmbassadorStats,
  AmbassadorStatus,
  CodeRecord,
  ConversionListItem,
  ConversionRecord,
  ConversionStatus,
  ConversionToNotify,
  InviteRecord,
  InviteStatus,
  RedemptionRecord,
  RedemptionStatus,
  ReferralRepository,
} from '../../../domain/ports/referral-repository.port'
import { AMBASSADOR_VISIBLE_CONVERSION_STATUSES } from '../../../domain/ports/referral-repository.port'
import type { Database } from './db'
import { escapeLike, isUniqueViolation, uniqueConstraintName } from './pg-errors'
import { ambassadors, codes, conversions, invites, scholarshipRedemptions } from './schema'

/**
 * Advisory lock do sweep de conversões — espaço GLOBAL do Postgres compartilhado
 * (não colide com members 30792292938117747-49, payments 8103081227979411315,
 * fiscal 5821743099124577, funnel 47713920114417).
 */
const CONVERSION_SWEEP_LOCK_KEY = '7429184620031201'

type AmbassadorRow = typeof ambassadors.$inferSelect
type CodeRow = typeof codes.$inferSelect
type RedemptionRow = typeof scholarshipRedemptions.$inferSelect
type InviteRow = typeof invites.$inferSelect
type ConversionRow = typeof conversions.$inferSelect

function toAmbassador(row: AmbassadorRow): AmbassadorRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    pageToken: row.pageToken,
    accountUserId: row.accountUserId,
    pixKey: row.pixKey,
    status: row.status as AmbassadorStatus,
    linkEmailCount: row.linkEmailCount,
    linkEmailSentAt: row.linkEmailSentAt,
    createdAt: row.createdAt,
  }
}

function toConversion(row: ConversionRow): ConversionRecord {
  return {
    id: row.id,
    redemptionId: row.redemptionId,
    codeId: row.codeId,
    ambassadorId: row.ambassadorId,
    paymentId: row.paymentId,
    subscriptionId: row.subscriptionId,
    offerSlug: row.offerSlug,
    amountCents: row.amountCents,
    bonusCents: row.bonusCents,
    status: row.status as ConversionStatus,
    paidAt: row.paidAt,
    maturesAt: row.maturesAt,
    eligibleAt: row.eligibleAt,
    notifiedAt: row.notifiedAt,
    paidMarkedAt: row.paidMarkedAt,
    paidMarkedBy: row.paidMarkedBy,
    note: row.note,
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
    accountUserId?: string | null
  }): Promise<
    | { kind: 'created'; ambassador: AmbassadorRecord; code: CodeRecord }
    | { kind: 'email_exists' }
    | { kind: 'account_exists' }
    | { kind: 'code_collision' }
  > {
    try {
      return await this.db.transaction(async (tx) => {
        const [ambassador] = await tx
          .insert(ambassadors)
          .values({
            name: input.name,
            email: input.email,
            pageToken: input.pageToken,
            accountUserId: input.accountUserId ?? null,
          })
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
      // A UNIQUE do e-mail é tratada pelo onConflictDoNothing acima. Um 23505
      // aqui é a UNIQUE do código (colisão de sufixo; re-sorteia) OU a UNIQUE
      // parcial da CONTA (dois selfEnroll em corrida) — sem distinguir, a
      // corrida de conta viraria 5 re-sorteios inúteis e um 500.
      if (isUniqueViolation(error)) {
        return uniqueConstraintName(error) === 'ambassadors_account_uq'
          ? { kind: 'account_exists' }
          : { kind: 'code_collision' }
      }
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

  async findAmbassadorByAccount(
    accountUserId: string,
  ): Promise<(AmbassadorRecord & { code: string | null }) | null> {
    const [row] = await this.db
      .select({ ambassador: ambassadors, code: codes })
      .from(ambassadors)
      .leftJoin(codes, eq(codes.ambassadorId, ambassadors.id))
      .where(eq(ambassadors.accountUserId, accountUserId))
      .limit(1)
    if (!row) return null
    return { ...toAmbassador(row.ambassador), code: row.code?.code ?? null }
  }

  async findAmbassadorByEmail(
    email: string,
  ): Promise<(AmbassadorRecord & { code: string | null }) | null> {
    const [row] = await this.db
      .select({ ambassador: ambassadors, code: codes.code })
      .from(ambassadors)
      .leftJoin(codes, eq(codes.ambassadorId, ambassadors.id))
      .where(eq(ambassadors.email, email))
      .limit(1)
    return row ? { ...toAmbassador(row.ambassador), code: row.code ?? null } : null
  }

  async setAmbassadorPixByToken(pageToken: string, pixKey: string): Promise<boolean> {
    const rows = await this.db
      .update(ambassadors)
      .set({ pixKey, updatedAt: sql`now()` })
      .where(and(eq(ambassadors.pageToken, pageToken), eq(ambassadors.status, 'active')))
      .returning({ id: ambassadors.id })
    return rows.length > 0
  }

  async getAmbassadorStats(ambassadorId: string): Promise<AmbassadorStats> {
    // Os 2 counts do painel numa ida só (o código é resolvido no próprio SQL).
    const [row] = await this.db
      .select({
        redemptionsCompleted: sql<number>`(
          select count(*)::int from ${scholarshipRedemptions} r
          join ${codes} c on c.id = r.code_id
          where c.ambassador_id = ${ambassadorId} and r.status = 'completed'
        )`,
        invitesSent: sql<number>`(
          select count(*)::int from ${invites} i
          where i.ambassador_id = ${ambassadorId} and i.status = 'sent'
        )`,
      })
      .from(sql`(select 1) as one`)
    return row ?? { redemptionsCompleted: 0, invitesSent: 0 }
  }

  async countConversionsForAmbassador(ambassadorId: string): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ status: conversions.status, value: count() })
      .from(conversions)
      .where(eq(conversions.ambassadorId, ambassadorId))
      .groupBy(conversions.status)
    const out: Record<string, number> = {}
    for (const r of rows) out[r.status] = r.value
    return out
  }

  async listAmbassadorVisibleConversions(
    ambassadorId: string,
    limit: number,
  ): Promise<ConversionRecord[]> {
    // Filtro ANTES do limit (no SQL): canceladas/autoindicação não empurram
    // bônus visíveis para fora da página do embaixador.
    const rows = await this.db
      .select()
      .from(conversions)
      .where(
        and(
          eq(conversions.ambassadorId, ambassadorId),
          inArray(conversions.status, [...AMBASSADOR_VISIBLE_CONVERSION_STATUSES]),
        ),
      )
      .orderBy(desc(conversions.paidAt))
      .limit(limit)
    return rows.map(toConversion)
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

  // ── Conversões ────────────────────────────────────────────────────────────

  async findRedemptionWithCodeByEmail(
    email: string,
  ): Promise<{ redemption: RedemptionRecord; code: CodeRecord } | null> {
    const [row] = await this.db
      .select({ redemption: scholarshipRedemptions, code: codes })
      .from(scholarshipRedemptions)
      .innerJoin(codes, eq(codes.id, scholarshipRedemptions.codeId))
      .where(eq(scholarshipRedemptions.email, email))
      .limit(1)
    if (!row) return null
    return { redemption: toRedemption(row.redemption), code: toCode(row.code) }
  }

  async insertConversion(input: {
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
  }): Promise<{ created: boolean }> {
    // As DUAS uniques (redemption_id e payment_id) protegem: `onConflictDoNothing`
    // SEM target cobre qualquer uma (ciclo de renovação OU re-entrega → no-op).
    const rows = await this.db
      .insert(conversions)
      .values(input)
      .onConflictDoNothing()
      .returning({ id: conversions.id })
    return { created: rows.length > 0 }
  }

  async cancelPendingConversionByPayment(
    paymentId: string,
  ): Promise<
    { kind: 'canceled' } | { kind: 'not_found' } | { kind: 'not_pending'; status: ConversionStatus }
  > {
    const rows = await this.db
      .update(conversions)
      .set({ status: 'canceled', updatedAt: sql`now()` })
      .where(and(eq(conversions.paymentId, paymentId), eq(conversions.status, 'pending')))
      .returning({ id: conversions.id })
    if (rows.length > 0) return { kind: 'canceled' }
    // O STATUS decide o desfecho no serviço: self_blocked/canceled são
    // benignos; eligible/paid viram alerta de "estorno após bônus".
    const [existing] = await this.db
      .select({ status: conversions.status })
      .from(conversions)
      .where(eq(conversions.paymentId, paymentId))
      .limit(1)
    if (!existing) return { kind: 'not_found' }
    return { kind: 'not_pending', status: existing.status as ConversionStatus }
  }

  async matureConversions(now: Date, limit: number): Promise<number> {
    // Transação COM advisory xact-lock: o lock e o UPDATE precisam viver na
    // MESMA conexão (lock fora da tx do trabalho não guardaria nada) — uma
    // réplica por ciclo; as demais devolvem 0 sem esperar.
    return await this.db.transaction(async (tx) => {
      const [row] = await tx.execute<{ locked: boolean }>(
        sql`select pg_try_advisory_xact_lock(${CONVERSION_SWEEP_LOCK_KEY}::bigint) as locked`,
      )
      if (!row?.locked) return 0
      const rows = await tx
        .update(conversions)
        .set({ status: 'eligible', eligibleAt: now, updatedAt: sql`now()` })
        .where(
          and(
            eq(conversions.status, 'pending'),
            lte(conversions.maturesAt, now),
            inArray(
              conversions.id,
              tx
                .select({ id: conversions.id })
                .from(conversions)
                .where(and(eq(conversions.status, 'pending'), lte(conversions.maturesAt, now)))
                .limit(limit),
            ),
          ),
        )
        .returning({ id: conversions.id })
      return rows.length
    })
  }

  async listConversionsToNotify(limit: number): Promise<ConversionToNotify[]> {
    // SÓ embaixador ATIVO: a capability-page de desativado responde 404, e um
    // e-mail "seu bônus liberou" com link morto queimaria a notificação
    // (mark-after-send) sem o embaixador nunca a ver. Desativado fica sem
    // aviso; reativou → o próximo ciclo envia. Linhas SEM embaixador (código
    // de conta, fase futura) seguem vindo — o serviço as marca notificadas.
    const rows = await this.db
      .select({
        id: conversions.id,
        bonusCents: conversions.bonusCents,
        ambassadorId: conversions.ambassadorId,
      })
      .from(conversions)
      .leftJoin(ambassadors, eq(ambassadors.id, conversions.ambassadorId))
      .where(
        and(
          eq(conversions.status, 'eligible'),
          isNull(conversions.notifiedAt),
          or(isNull(conversions.ambassadorId), eq(ambassadors.status, 'active')),
        ),
      )
      .orderBy(conversions.eligibleAt)
      .limit(limit)
    return rows
  }

  async markConversionNotified(id: string, when: Date): Promise<void> {
    await this.db
      .update(conversions)
      .set({ notifiedAt: when, updatedAt: sql`now()` })
      .where(eq(conversions.id, id))
  }

  async listConversions(opts: {
    status?: ConversionStatus
    limit: number
    offset: number
  }): Promise<{ items: ConversionListItem[]; total: number }> {
    const where = opts.status ? eq(conversions.status, opts.status) : undefined
    const [rows, [{ value: total } = { value: 0 }]] = await Promise.all([
      this.db
        .select({
          conversion: conversions,
          ambassadorName: ambassadors.name,
          ambassadorEmail: ambassadors.email,
          ambassadorPixKey: ambassadors.pixKey,
          redemptionName: scholarshipRedemptions.name,
          redemptionEmail: scholarshipRedemptions.email,
        })
        .from(conversions)
        .leftJoin(ambassadors, eq(ambassadors.id, conversions.ambassadorId))
        .innerJoin(scholarshipRedemptions, eq(scholarshipRedemptions.id, conversions.redemptionId))
        .where(where)
        .orderBy(desc(conversions.paidAt))
        .limit(opts.limit)
        .offset(opts.offset),
      this.db.select({ value: count() }).from(conversions).where(where),
    ])
    return {
      items: rows.map((r) => ({
        ...toConversion(r.conversion),
        ambassadorName: r.ambassadorName,
        ambassadorEmail: r.ambassadorEmail,
        ambassadorPixKey: r.ambassadorPixKey,
        redemptionName: r.redemptionName,
        redemptionEmail: r.redemptionEmail,
      })),
      total,
    }
  }

  async markConversionPaid(id: string, by: string, note: string | null): Promise<boolean> {
    const rows = await this.db
      .update(conversions)
      .set({
        status: 'paid',
        paidMarkedAt: sql`now()`,
        paidMarkedBy: by,
        ...(note !== null ? { note } : {}),
        updatedAt: sql`now()`,
      })
      .where(and(eq(conversions.id, id), eq(conversions.status, 'eligible')))
      .returning({ id: conversions.id })
    return rows.length > 0
  }

  async setConversionMaturesNow(id: string): Promise<boolean> {
    const rows = await this.db
      .update(conversions)
      .set({ maturesAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(conversions.id, id), eq(conversions.status, 'pending')))
      .returning({ id: conversions.id })
    return rows.length > 0
  }

  async listConversionsByCode(codeId: string, limit: number): Promise<ConversionRecord[]> {
    const rows = await this.db
      .select()
      .from(conversions)
      .where(eq(conversions.codeId, codeId))
      .orderBy(desc(conversions.createdAt))
      .limit(limit)
    return rows.map(toConversion)
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
