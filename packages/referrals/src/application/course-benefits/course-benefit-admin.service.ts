import type { GiftAudience } from '@sistemazero/core/referrals'
import { GiftCatalogUnavailableError } from '../../domain/campaign'
import { CourseBenefitConversionError } from '../../domain/course-benefit'
import { giftOfferProblem } from '../../domain/gift-policy'
import type { CampaignRepository } from '../../domain/ports/campaign-repository.port'
import type { CourseBenefitRepository } from '../../domain/ports/course-benefit-repository.port'
import type { ReferralsGateway } from '../../domain/ports/gateway.port'
import type { GiftOfferCatalog } from '../../domain/ports/gift-offer-catalog.port'

export class CourseBenefitAdminService {
  constructor(
    readonly repo: CourseBenefitRepository,
    private readonly campaigns: Pick<CampaignRepository, 'findById'>,
    private readonly gateway: Pick<ReferralsGateway, 'getGiftAvailability'>,
    private readonly offers: GiftOfferCatalog,
  ) {}

  async convert(input: {
    campaignId: string
    courseSlug: string
    name: string
    audience: GiftAudience
  }) {
    const name = input.name.trim()
    if (!name || name.length > 160 || !/^[a-z0-9][a-z0-9-]{0,139}$/.test(input.courseSlug))
      throw new CourseBenefitConversionError('Confira o nome e o curso de origem do benefício.')
    const previous = await this.repo.findById(input.campaignId)
    if (previous) {
      if (previous.courseSlug !== input.courseSlug || previous.audience !== input.audience)
        throw new CourseBenefitConversionError('A campanha já foi convertida para outro curso.')
      return previous
    }
    const campaign = await this.campaigns.findById(input.campaignId)
    if (!campaign || campaign.audience !== input.audience || !campaign.giftOfferId)
      throw new CourseBenefitConversionError('Campanha de presente não encontrada neste público.')
    const available = await this.gateway.getGiftAvailability(input.courseSlug, input.audience)
    if (available.status !== 200) throw new GiftCatalogUnavailableError()
    if (
      !available.body ||
      typeof available.body !== 'object' ||
      !('available' in available.body) ||
      available.body.available !== true
    )
      throw new CourseBenefitConversionError('O curso de origem precisa estar publicado.')
    const offer = await this.offers.resolve(campaign.giftOfferId)
    if (!offer) throw new CourseBenefitConversionError('Oferta do presente não encontrada.')
    const problem = giftOfferProblem(offer, input.audience)
    if (problem) throw new CourseBenefitConversionError(problem)
    return this.repo.convertCampaign({ ...input, name })
  }
}
