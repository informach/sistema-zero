import type { Logger } from '@sistemazero/core/logging'
import { CouponNotFoundError } from '../../domain/coupon/coupon.errors'
import type { CouponStatus } from '../../domain/coupon/coupon.status'
import type { CouponRepository } from '../../domain/ports/coupon-repository.port'
import type { OfferRepository } from '../../domain/ports/offer-repository.port'
import { assertOffersExist } from '../create-coupon/create-coupon.service'
import { type CouponView, toCouponView } from '../mappers/coupon-view'

export interface UpdateCouponCommand {
  id: string
  status?: CouponStatus
  appliesToAll?: boolean
  minPurchaseCents?: number | null
  maxRedemptions?: number | null
  validFrom?: Date | null
  validUntil?: Date | null
  metadata?: Record<string, unknown> | null
  /** Se presente, SUBSTITUI as ofertas do escopo. */
  offerIds?: string[]
}

/**
 * Caso de uso: atualizar um cupom (admin). Não altera o tipo/valor do desconto
 * (recrie se precisar); muda status, escopo, limites, validade e metadata.
 */
export class UpdateCouponService {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly offers: OfferRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: UpdateCouponCommand): Promise<CouponView> {
    const coupon = await this.coupons.findById(command.id)
    if (!coupon) throw new CouponNotFoundError()

    const touchesDetails =
      command.status !== undefined ||
      command.appliesToAll !== undefined ||
      command.minPurchaseCents !== undefined ||
      command.maxRedemptions !== undefined ||
      command.validFrom !== undefined ||
      command.validUntil !== undefined ||
      command.metadata !== undefined
    if (touchesDetails) {
      coupon.updateDetails({
        status: command.status,
        appliesToAll: command.appliesToAll,
        minPurchaseCents: command.minPurchaseCents,
        maxRedemptions: command.maxRedemptions,
        validFrom: command.validFrom,
        validUntil: command.validUntil,
        metadata: command.metadata,
      })
    }

    if (command.offerIds !== undefined) {
      await assertOffersExist(this.offers, command.offerIds)
      coupon.setOfferIds(command.offerIds)
    }

    await this.coupons.update(coupon)
    for (const event of coupon.pullEvents()) this.logger.info(event.eventName, event.toPayload())
    return toCouponView(coupon)
  }
}
