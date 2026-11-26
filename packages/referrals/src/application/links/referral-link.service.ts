import type { CampaignState, GiftAudience } from '@sistemazero/core/referrals'
import { campaignState } from '../../domain/campaign'
import { giftOfferRef } from '../../domain/gift-policy'
import type { CampaignCouponCatalog } from '../../domain/ports/campaign-coupon-catalog.port'
import type { CampaignRepository } from '../../domain/ports/campaign-repository.port'
import type { CourseBenefitRepository } from '../../domain/ports/course-benefit-repository.port'
import type { GiftOfferCatalog } from '../../domain/ports/gift-offer-catalog.port'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'
import type { AmbassadorOffersService } from '../ambassador-offers/ambassador-offers.service'

/**
 * O que um link `/i/<código>[/<oferta>][/pagamento]` abre (25/11/2026). `gift` = a página da
 * oferta no modo presente; `sale` = a página de venda (ou o checkout, com `target: checkout`).
 * O funil grava o código como a origem desta aquisição e escolhe a página pela oferta.
 */
export interface LinkResolution {
  code: string
  audience: GiftAudience
  sourceKind: 'ambassador' | 'campaign'
  mode: 'gift' | 'sale'
  offerId: string
  offerSlug: string
  target: 'page' | 'checkout'
  /** Estado da campanha (`active` para link pessoal). Fora do ar o funil mostra o estado. */
  state: Exclude<CampaignState, 'draft'>
  /** Cupom da campanha de VENDA (o da campanha de presente é outro link, outra oferta). */
  couponCode: string | null
}

export type LinkResult =
  | { kind: 'ok'; link: LinkResolution }
  | {
      kind: 'course_benefit'
      link: { kind: 'course_benefit'; code: string; audience: GiftAudience; courseSlug: string }
    }
  | { kind: 'not_found' }
  | { kind: 'upstream_error' }

export class ReferralLinkService {
  constructor(
    private readonly repo: ReferralRepository,
    private readonly campaigns: Pick<CampaignRepository, 'findById'>,
    private readonly giftOffers: GiftOfferCatalog,
    private readonly offers: AmbassadorOffersService,
    private readonly couponCatalog?: CampaignCouponCatalog,
    private readonly now: () => Date = () => new Date(),
    private readonly benefits?: Pick<CourseBenefitRepository, 'findById'>,
  ) {}

  async resolve(
    codeValue: string,
    offerRef: string | null,
    checkout: boolean,
  ): Promise<LinkResult> {
    const code = await this.repo.findCodeByCode(codeValue)
    if (code?.status !== 'active') return { kind: 'not_found' }

    if (code.ownerKind === 'benefit') {
      const benefit = code.benefitId ? await this.benefits?.findById(code.benefitId) : null
      if (!benefit || benefit.status !== 'active') return { kind: 'not_found' }
      return {
        kind: 'course_benefit',
        link: {
          kind: 'course_benefit',
          code: code.code,
          audience: benefit.audience,
          courseSlug: benefit.courseSlug,
        },
      }
    }

    if (code.ownerKind === 'campaign' && code.campaignId) {
      const campaign = await this.campaigns.findById(code.campaignId)
      if (!campaign) return { kind: 'not_found' }
      const state = campaignState(campaign, this.now())
      if (state === 'draft') return { kind: 'not_found' }
      const ref =
        campaign.kind === 'sale' ? campaign.saleOfferId : giftOfferRef(campaign, campaign.audience)
      if (!ref) return { kind: 'not_found' }
      const offer = await this.offer(ref)
      if (offer.kind !== 'ok') return offer
      let couponCode: string | null = null
      if (campaign.kind === 'sale' && campaign.coupon && this.couponCatalog) {
        // Catálogo fora não derruba o link: a página abre pelo preço normal e cota de novo.
        couponCode =
          (
            await this.couponCatalog
              .get(campaign.coupon, campaign.id, campaign.audience)
              .catch(() => null)
          )?.code ?? null
      }
      return {
        kind: 'ok',
        link: {
          code: code.code,
          audience: campaign.audience,
          sourceKind: 'campaign',
          mode: campaign.kind === 'sale' ? 'sale' : 'gift',
          offerId: offer.offerId,
          offerSlug: offer.offerSlug,
          target:
            campaign.kind === 'sale' && (checkout || campaign.linkTarget === 'checkout')
              ? 'checkout'
              : 'page',
          state,
          couponCode,
        },
      }
    }

    if (code.ownerKind !== 'ambassador') return { kind: 'not_found' }
    const audience = code.audience
    // Sem oferta no link: o presente padrão do público (os links antigos e o `/bolsa/<código>`).
    if (!offerRef) {
      const offer = await this.offer(giftOfferRef(null, audience))
      if (offer.kind !== 'ok') return offer
      return { kind: 'ok', link: this.ambassadorLink(code.code, audience, 'gift', offer, false) }
    }
    const gift = await this.offers.allowed(audience, 'gift', offerRef)
    if (gift)
      return { kind: 'ok', link: this.ambassadorLink(code.code, audience, 'gift', gift, false) }
    const referral = await this.offers.allowed(audience, 'referral', offerRef)
    if (referral)
      return {
        kind: 'ok',
        link: this.ambassadorLink(code.code, audience, 'sale', referral, checkout),
      }
    return { kind: 'not_found' }
  }

  /**
   * O link curto `/i/<código>/<apelido>[/presente|/pagamento]` (25/11/2026): a oferta da lista do
   * tipo pedido (`gift` = presentes, `referral` = indicação) cujo PRODUTO é um dos da página
   * (`productSkus`, um por público). Código de campanha ignora o apelido (vale a oferta dela).
   */
  async resolveForProduct(
    codeValue: string,
    kind: 'gift' | 'referral',
    productSkus: string[],
    checkout: boolean,
  ): Promise<LinkResult> {
    const code = await this.repo.findCodeByCode(codeValue)
    if (code?.status !== 'active') return { kind: 'not_found' }
    if (code.ownerKind === 'campaign' || code.ownerKind === 'benefit')
      return this.resolve(codeValue, null, checkout)
    if (code.ownerKind !== 'ambassador') return { kind: 'not_found' }
    const wanted = new Set(productSkus)
    let options: Awaited<ReturnType<AmbassadorOffersService['optionsOrThrow']>>
    try {
      // O caminho que LANÇA com o catálogo fora (o `options` engole a falha e a lista vazia
      // viraria "link não existe").
      options = await this.offers.optionsOrThrow(code.audience, kind)
    } catch {
      return { kind: 'upstream_error' }
    }
    const option = options.find(
      (o) =>
        o.kind === kind &&
        o.productSku !== undefined &&
        o.productSku !== null &&
        wanted.has(o.productSku),
    )
    if (!option) return { kind: 'not_found' }
    return {
      kind: 'ok',
      link: this.ambassadorLink(
        code.code,
        code.audience,
        kind === 'gift' ? 'gift' : 'sale',
        option,
        checkout,
      ),
    }
  }

  private ambassadorLink(
    code: string,
    audience: GiftAudience,
    mode: 'gift' | 'sale',
    offer: { offerId: string; offerSlug: string },
    checkout: boolean,
  ): LinkResolution {
    return {
      code,
      audience,
      sourceKind: 'ambassador',
      mode,
      offerId: offer.offerId,
      offerSlug: offer.offerSlug,
      target: mode === 'sale' && checkout ? 'checkout' : 'page',
      state: 'active',
      couponCode: null,
    }
  }

  private async offer(
    ref: string,
  ): Promise<
    | { kind: 'ok'; offerId: string; offerSlug: string }
    | { kind: 'not_found' }
    | { kind: 'upstream_error' }
  > {
    try {
      const offer = await this.giftOffers.resolve(ref)
      return offer
        ? { kind: 'ok', offerId: offer.offerId, offerSlug: offer.offerSlug }
        : { kind: 'not_found' }
    } catch {
      return { kind: 'upstream_error' }
    }
  }
}
