import type { CourseBenefitContext, GiftAudience } from '@sistemazero/core/referrals'
import { and, asc, eq, inArray, ne } from 'drizzle-orm'
import { CourseBenefitConversionError } from '../../../domain/course-benefit'
import type {
  CourseBenefitRecord,
  CourseBenefitRepository,
} from '../../../domain/ports/course-benefit-repository.port'
import { toAcquisition } from './acquisition.repository'
import type { Database } from './db'
import {
  acquisitions,
  campaignHistory,
  campaigns,
  codes,
  conversions,
  courseBenefits,
  scholarshipRedemptions,
} from './schema'

type Joined = { benefit: typeof courseBenefits.$inferSelect; code: typeof codes.$inferSelect }
const view = ({ benefit, code }: Joined): CourseBenefitRecord => ({
  id: benefit.id,
  codeId: code.id,
  code: code.code,
  name: benefit.name,
  audience: benefit.audience,
  courseSlug: benefit.courseSlug,
  giftOfferId: benefit.giftOfferId,
  status: benefit.status as CourseBenefitRecord['status'],
  createdAt: benefit.createdAt,
})

export class DrizzleCourseBenefitRepository implements CourseBenefitRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string) {
    const [row] = await this.db
      .select({ benefit: courseBenefits, code: codes })
      .from(courseBenefits)
      .innerJoin(codes, eq(codes.benefitId, courseBenefits.id))
      .where(and(eq(courseBenefits.id, id), eq(codes.ownerKind, 'benefit')))
      .limit(1)
    return row ? view(row) : null
  }

  async list(audience: GiftAudience, courseSlug?: string) {
    const rows = await this.db
      .select({ benefit: courseBenefits, code: codes })
      .from(courseBenefits)
      .innerJoin(codes, eq(codes.benefitId, courseBenefits.id))
      .where(
        and(
          eq(courseBenefits.audience, audience),
          eq(codes.ownerKind, 'benefit'),
          courseSlug ? eq(courseBenefits.courseSlug, courseSlug) : undefined,
        ),
      )
      .orderBy(asc(courseBenefits.createdAt))
    return rows.map(view)
  }

  async acquisitions(id: string) {
    const rows = await this.db
      .select({ acquisition: acquisitions })
      .from(acquisitions)
      .innerJoin(codes, eq(codes.id, acquisitions.codeId))
      .where(eq(codes.benefitId, id))
      .orderBy(asc(acquisitions.acquiredAt))
    return rows.map((r) => toAcquisition(r.acquisition))
  }

  async contexts(redemptionIds: string[]) {
    if (!redemptionIds.length) return new Map<string, CourseBenefitContext>()
    const rows = await this.db
      .select({ id: scholarshipRedemptions.id, context: scholarshipRedemptions.benefitContext })
      .from(scholarshipRedemptions)
      .where(inArray(scholarshipRedemptions.id, redemptionIds))
    return new Map(rows.flatMap((r) => (r.context ? [[r.id, r.context] as const] : [])))
  }

  async convertCampaign(input: {
    campaignId: string
    courseSlug: string
    name: string
    audience: GiftAudience
  }) {
    const id = await this.db.transaction(async (tx) => {
      const [campaign] = await tx
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, input.campaignId))
        .for('update')
      if (!campaign) {
        const [previous] = await tx
          .select()
          .from(courseBenefits)
          .where(eq(courseBenefits.id, input.campaignId))
        if (previous?.courseSlug === input.courseSlug && previous.audience === input.audience)
          return previous.id
        throw new CourseBenefitConversionError('Campanha não encontrada para conversão.')
      }
      if (
        campaign.kind !== 'gift' ||
        !campaign.giftOfferId ||
        campaign.audience !== input.audience ||
        campaign.commissionEnabled ||
        campaign.ambassadorId ||
        campaign.coupon
      )
        throw new CourseBenefitConversionError(
          'Somente um presente sem cupom ou comissão pode virar benefício do curso.',
        )
      const [code] = await tx
        .select()
        .from(codes)
        .where(eq(codes.campaignId, campaign.id))
        .for('update')
      if (!code || code.ownerKind !== 'campaign')
        throw new CourseBenefitConversionError('Código da campanha não encontrado.')
      const used = await tx
        .select({ id: conversions.id })
        .from(conversions)
        .where(eq(conversions.codeId, code.id))
        .limit(1)
      const paid = await tx
        .select({ id: acquisitions.id })
        .from(acquisitions)
        .where(and(eq(acquisitions.codeId, code.id), ne(acquisitions.kind, 'gift')))
        .limit(1)
      if (used.length || paid.length)
        throw new CourseBenefitConversionError(
          'Há vendas ou conversões: a origem não pode ser convertida.',
        )
      const redemptions = await tx
        .select()
        .from(scholarshipRedemptions)
        .where(eq(scholarshipRedemptions.codeId, code.id))
        .for('update')
      if (redemptions.some((r) => r.status !== 'completed'))
        throw new CourseBenefitConversionError(
          'Aguarde as ativações em andamento antes de converter.',
        )
      const history = await tx
        .select()
        .from(campaignHistory)
        .where(eq(campaignHistory.campaignId, campaign.id))
      await tx.insert(courseBenefits).values({
        id: campaign.id,
        name: input.name,
        courseSlug: input.courseSlug,
        audience: input.audience,
        giftOfferId: campaign.giftOfferId,
        status: 'active',
        legacyCampaign: campaign,
        legacyHistory: history,
      })
      await tx
        .update(codes)
        .set({
          ownerKind: 'benefit',
          campaignId: null,
          benefitId: campaign.id,
          displayName: input.name,
        })
        .where(eq(codes.id, code.id))
      const context: CourseBenefitContext = {
        benefitId: campaign.id,
        benefitName: input.name,
        courseSlug: input.courseSlug,
        lessonId: null,
        blockId: null,
        accessSource: null,
        accessOrigin: null,
      }
      await tx
        .update(scholarshipRedemptions)
        .set({ benefitContext: context })
        .where(eq(scholarshipRedemptions.codeId, code.id))
      await tx
        .update(acquisitions)
        .set({
          originKind: 'course',
          campaignId: null,
          ambassadorId: null,
          bonusTerms: null,
          place: 'course_benefit',
        })
        .where(eq(acquisitions.codeId, code.id))
      await tx.delete(campaignHistory).where(eq(campaignHistory.campaignId, campaign.id))
      await tx.delete(campaigns).where(eq(campaigns.id, campaign.id))
      return campaign.id
    })
    const result = await this.findById(id)
    if (!result) throw new Error('Benefício convertido não encontrado.')
    return result
  }
}
