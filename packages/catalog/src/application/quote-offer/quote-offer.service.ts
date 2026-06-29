import { CouponNotApplicableError, CouponNotFoundError } from '../../domain/coupon/coupon.errors'
import type { OfferAggregate } from '../../domain/offer/offer.aggregate'
import { OfferNotAvailableError, OfferNotFoundError } from '../../domain/offer/offer.errors'
import type { CouponRepository } from '../../domain/ports/coupon-repository.port'
import type { OfferRepository } from '../../domain/ports/offer-repository.port'
import type { ProductRepository } from '../../domain/ports/product-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { assertActiveOfferDeliverable } from '../create-offer/create-offer.service'
import type { OfferQuoteView } from '../mappers/quote-view'
import type { ResolveOfferEntitlementsService } from '../resolve-offer-entitlements/resolve-offer-entitlements.service'

export interface QuoteOfferCommand {
  offerSlug: string
  couponCode?: string
}

/**
 * Cotação de uma oferta com cupom opcional. Calcula o valor AUTORITATIVO (no
 * servidor) que o funil deve cobrar — nunca confie em preço/desconto vindo do
 * cliente. Lança erro de domínio se o cupom não for aplicável.
 */
export class QuoteOfferService {
  constructor(
    private readonly offers: OfferRepository,
    private readonly coupons: CouponRepository,
    private readonly products: ProductRepository,
    private readonly resolver: ResolveOfferEntitlementsService,
  ) {}

  async execute(command: QuoteOfferCommand): Promise<OfferQuoteView> {
    const offer = await this.offers.findBySlug(command.offerSlug)
    if (!offer) throw new OfferNotFoundError()
    // Disponibilidade é AUTORITATIVA aqui: a cotação é o gate de cobrança do funil,
    // então oferta pausada/draft/arquivada (ou fora da janela) não gera preço a cobrar.
    if (!offer.isAvailable()) throw new OfferNotAvailableError()
    await this.assertDeliverable(offer)

    const priceCents = offer.priceCents
    if (priceCents <= 0) throw new OfferNotAvailableError('Oferta sem preço cobrável')
    const base: OfferQuoteView = {
      offerId: offer.id,
      offerSlug: offer.slug,
      currency: offer.currency,
      priceCents,
      discountCents: 0,
      finalPriceCents: priceCents,
      coupon: null,
    }

    const code = command.couponCode?.trim()
    if (!code) return base

    const coupon = await this.coupons.findByCode(code)
    if (!coupon) throw new CouponNotFoundError()
    if (offer.content?.allowsCoupon !== true) {
      throw new CouponNotApplicableError('Cupom desabilitado para esta oferta')
    }
    coupon.assertApplicable(offer.id, priceCents)

    const discountCents = coupon.computeDiscountCents(priceCents)
    const finalPriceCents = priceCents - discountCents
    // O funil cobra este valor no payments — cobrança de R$ 0,00 não existe (a
    // Efí rejeita). Um cupom que ZERA o preço é inaplicável, não um pedido grátis:
    // melhor 422 legível aqui do que o checkout quebrar na criação da cobrança.
    if (finalPriceCents <= 0) {
      throw new CouponNotApplicableError('Cupom não pode zerar o valor da compra')
    }
    return {
      ...base,
      discountCents,
      finalPriceCents,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        percentOff: coupon.percentOff,
        amountOffCents: coupon.amountOffCents,
      },
    }
  }

  private async assertDeliverable(offer: OfferAggregate): Promise<void> {
    const product = await this.products.findById(offer.productId)
    if (!product) throw new OfferNotAvailableError('Oferta sem produto principal válido')
    try {
      await assertActiveOfferDeliverable(offer, product, this.resolver)
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new OfferNotAvailableError('Oferta sem entrega disponível')
      }
      throw error
    }
  }
}
