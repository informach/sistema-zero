import type { GiftAudience } from '@sistemazero/core/referrals'
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import type { AcquisitionRecord, NewAcquisition } from '../../../domain/acquisition'
import {
  type AcquisitionRepository,
  REPORT_ROW_LIMIT,
} from '../../../domain/ports/acquisition-repository.port'
import type { Database } from './db'
import { isUniqueViolation } from './pg-errors'
import { toCode, toRedemption } from './referral.repository'
import { acquisitions, codes, scholarshipRedemptions } from './schema'

type AcquisitionRow = typeof acquisitions.$inferSelect

export function toAcquisition(row: AcquisitionRow): AcquisitionRecord {
  return {
    id: row.id,
    email: row.email,
    accountUserId: row.accountUserId,
    audience: row.audience,
    kind: row.kind,
    offerId: row.offerId,
    offerSlug: row.offerSlug,
    amountCents: row.amountCents,
    paymentId: row.paymentId,
    subscriptionId: row.subscriptionId,
    redemptionId: row.redemptionId,
    originKind: row.originKind,
    codeId: row.codeId,
    campaignId: row.campaignId,
    ambassadorId: row.ambassadorId,
    place: row.place,
    utm: row.utm ?? null,
    bonusTerms: row.bonusTerms ?? null,
    status: row.status as AcquisitionRecord['status'],
    acquiredAt: row.acquiredAt,
    createdAt: row.createdAt,
  }
}

export class DrizzleAcquisitionRepository implements AcquisitionRepository {
  constructor(private readonly db: Database) {}

  async insert(
    input: NewAcquisition,
  ): Promise<{ created: boolean; acquisition: AcquisitionRecord }> {
    try {
      const [row] = await this.db
        .insert(acquisitions)
        .values({ ...input, email: input.email.trim().toLowerCase() })
        .onConflictDoNothing()
        .returning()
      if (row) return { created: true, acquisition: toAcquisition(row) }
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
    }
    const existing = await this.findExisting(input)
    if (!existing) throw new Error('Aquisição em conflito não encontrada')
    return { created: false, acquisition: existing }
  }

  private async findExisting(input: NewAcquisition): Promise<AcquisitionRecord | null> {
    const [row] = await this.db
      .select()
      .from(acquisitions)
      .where(
        or(
          input.paymentId ? eq(acquisitions.paymentId, input.paymentId) : undefined,
          input.redemptionId ? eq(acquisitions.redemptionId, input.redemptionId) : undefined,
        ),
      )
      .limit(1)
    return row ? toAcquisition(row) : null
  }

  async findByPayment(paymentId: string): Promise<AcquisitionRecord | null> {
    const [row] = await this.db
      .select()
      .from(acquisitions)
      .where(eq(acquisitions.paymentId, paymentId))
      .limit(1)
    return row ? toAcquisition(row) : null
  }

  async hasSubscription(subscriptionId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: acquisitions.id })
      .from(acquisitions)
      .where(eq(acquisitions.subscriptionId, subscriptionId))
      .limit(1)
    return Boolean(row)
  }

  async markRefundedByPayment(paymentId: string): Promise<AcquisitionRecord | null> {
    const [row] = await this.db
      .update(acquisitions)
      .set({ status: 'refunded', updatedAt: sql`now()` })
      .where(eq(acquisitions.paymentId, paymentId))
      .returning()
    return row ? toAcquisition(row) : null
  }

  async listActiveForPerson(input: {
    email: string
    accountUserId?: string | null
    audience: GiftAudience
  }): Promise<AcquisitionRecord[]> {
    const email = input.email.trim().toLowerCase()
    const rows = await this.db
      .select()
      .from(acquisitions)
      .where(
        and(
          eq(acquisitions.audience, input.audience),
          eq(acquisitions.status, 'active'),
          or(
            eq(acquisitions.email, email),
            input.accountUserId ? eq(acquisitions.accountUserId, input.accountUserId) : undefined,
          ),
        ),
      )
      .orderBy(asc(acquisitions.acquiredAt), asc(acquisitions.createdAt))
      .limit(500)
    return rows.map(toAcquisition)
  }

  async listCompletedRedemptionsWithoutAcquisition(limit: number, email?: string) {
    const rows = await this.db
      .select({ redemption: scholarshipRedemptions, code: codes })
      .from(scholarshipRedemptions)
      .innerJoin(codes, eq(codes.id, scholarshipRedemptions.codeId))
      .leftJoin(acquisitions, eq(acquisitions.redemptionId, scholarshipRedemptions.id))
      .where(
        and(
          eq(scholarshipRedemptions.status, 'completed'),
          isNull(acquisitions.id),
          email ? eq(scholarshipRedemptions.email, email.trim().toLowerCase()) : undefined,
        ),
      )
      .orderBy(asc(scholarshipRedemptions.createdAt))
      .limit(limit)
    return rows.map((row) => ({ redemption: toRedemption(row.redemption), code: toCode(row.code) }))
  }

  async listMissingOfferSlug(
    limit: number,
    after?: { createdAt: Date; id: string } | null,
  ): Promise<{ id: string; offerId: string; createdAt: Date }[]> {
    const rows = await this.db
      .select({
        id: acquisitions.id,
        offerId: acquisitions.offerId,
        createdAt: acquisitions.createdAt,
      })
      .from(acquisitions)
      .where(
        and(
          isNull(acquisitions.offerSlug),
          isNotNull(acquisitions.offerId),
          after
            ? sql`(${acquisitions.createdAt}, ${acquisitions.id}) > (${after.createdAt.toISOString()}::timestamptz, ${after.id}::uuid)`
            : undefined,
        ),
      )
      .orderBy(asc(acquisitions.createdAt), asc(acquisitions.id))
      .limit(limit)
    return rows.flatMap((row) =>
      row.offerId ? [{ id: row.id, offerId: row.offerId, createdAt: row.createdAt }] : [],
    )
  }

  async setOfferSlug(id: string, offerSlug: string, asSubscription = false): Promise<void> {
    await this.db
      .update(acquisitions)
      .set({
        offerSlug: offerSlug.slice(0, 80),
        ...(asSubscription
          ? {
              kind: sql`case when ${acquisitions.kind} = 'one_time' then 'subscription' else ${acquisitions.kind} end`,
            }
          : {}),
        updatedAt: sql`now()`,
      })
      .where(and(eq(acquisitions.id, id), isNull(acquisitions.offerSlug)))
  }

  async listByCampaigns(campaignIds: string[]): Promise<AcquisitionRecord[]> {
    if (campaignIds.length === 0) return []
    return this.read(inArray(acquisitions.campaignId, campaignIds))
  }

  async listByAmbassadors(ambassadorIds: string[]): Promise<AcquisitionRecord[]> {
    if (ambassadorIds.length === 0) return []
    return this.read(inArray(acquisitions.ambassadorId, ambassadorIds))
  }

  async listInPeriod(input: { audience?: GiftAudience; from: Date; to: Date }) {
    return this.read(
      and(
        input.audience ? eq(acquisitions.audience, input.audience) : undefined,
        gte(acquisitions.acquiredAt, input.from),
        lt(acquisitions.acquiredAt, input.to),
      ),
    )
  }

  async listForEmails(audience: GiftAudience, emails: string[]): Promise<AcquisitionRecord[]> {
    if (emails.length === 0) return []
    return this.read(and(eq(acquisitions.audience, audience), inArray(acquisitions.email, emails)))
  }

  async listByEmail(email: string): Promise<AcquisitionRecord[]> {
    return this.read(eq(acquisitions.email, email.trim().toLowerCase()))
  }

  /** As MAIS NOVAS até o teto, devolvidas da mais antiga para a mais nova. */
  private async read(where: ReturnType<typeof and>): Promise<AcquisitionRecord[]> {
    const rows = await this.db
      .select()
      .from(acquisitions)
      .where(where)
      .orderBy(desc(acquisitions.acquiredAt), desc(acquisitions.createdAt))
      .limit(REPORT_ROW_LIMIT)
    return rows.reverse().map(toAcquisition)
  }
}
