import type { CourseBenefitClaimSource, CourseBenefitContext } from '@sistemazero/core/referrals'
import type { AcquisitionRepository } from '../../domain/ports/acquisition-repository.port'
import type { CampaignRepository } from '../../domain/ports/campaign-repository.port'
import type { CourseBenefitRecord } from '../../domain/ports/course-benefit-repository.port'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'

export async function captureCourseBenefitContext(input: {
  benefit: CourseBenefitRecord
  source: CourseBenefitClaimSource
  account: { userId: string; email: string }
  acquisitions?: Pick<AcquisitionRepository, 'listActiveForPerson'>
  campaigns?: Pick<CampaignRepository, 'findById'>
  referrals: Pick<ReferralRepository, 'findAmbassadorById'>
}): Promise<CourseBenefitContext> {
  const { benefit, source, account } = input
  const context: CourseBenefitContext = {
    benefitId: benefit.id,
    benefitName: benefit.name,
    courseSlug: source.courseSlug,
    lessonId: source.lessonId,
    blockId: source.blockId,
    accessSource: source.accessSource,
    accessOrigin: null,
  }
  if (!input.acquisitions) return context
  const rows = await input.acquisitions.listActiveForPerson({
    email: account.email,
    accountUserId: account.userId,
    audience: benefit.audience,
  })
  const access = source.accessSource
  // A referência vem da matrícula que realmente abriu a aula, nunca de cookie ou primeiro contato.
  const redemptionId =
    access.sourceKind === 'manual' && access.sourceId.startsWith('scholarship:')
      ? access.sourceId.slice('scholarship:'.length)
      : null
  const parent = rows.find((r) =>
    access.sourceKind === 'payment'
      ? r.paymentId === access.sourceId
      : access.sourceKind === 'subscription'
        ? r.subscriptionId === (access.subscriptionId ?? access.sourceId)
        : redemptionId !== null && r.redemptionId === redemptionId,
  )
  if (!parent) return context
  const [campaign, ambassador] = await Promise.all([
    parent.campaignId ? input.campaigns?.findById(parent.campaignId) : null,
    parent.ambassadorId ? input.referrals.findAmbassadorById(parent.ambassadorId) : null,
  ])
  context.accessOrigin = {
    acquisitionId: parent.id,
    originKind: parent.originKind,
    campaignId: parent.campaignId,
    campaignTitle: campaign?.name ?? null,
    ambassadorId: parent.ambassadorId,
    ambassadorName: ambassador?.name ?? null,
    offerSlug: parent.offerSlug,
    utmSource: parent.utm?.utmSource ?? null,
    acquiredAt: parent.acquiredAt.toISOString(),
  }
  return context
}
