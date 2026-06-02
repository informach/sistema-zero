import type { Logger } from '@sistemazero/core/logging'
import { CouponAggregate } from '../../domain/coupon/coupon.aggregate'
import type { CouponStatus } from '../../domain/coupon/coupon.status'
import type { CouponType } from '../../domain/coupon/coupon.type'
import type { CouponRepository } from '../../domain/ports/coupon-repository.port'
import type { OfferRepository } from '../../domain/ports/offer-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { CouponCode } from '../../domain/value-objects/coupon-code'
import type { Currency } from '../../domain/value-objects/money'
import { type CouponView, toCouponView } from '../mappers/coupon-view'

export interface CreateCouponCommand {
  code: string
  type: CouponType
  percentOff?: number | null
  amountOffCents?: number | null
  currency?: Currency
  status?: CouponStatus
  appliesToAll?: boolean
  minPurchaseCents?: number | null
  maxRedemptions?: number | null
  validFrom?: Date | null
  validUntil?: Date | null
  metadata?: Record<string, unknown> | null
  offerIds?: string[]
}

/** Caso de uso: cadastrar um cupom (admin). Valida as ofertas do escopo. */
export class CreateCouponService {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly offers: OfferRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: CreateCouponCommand): Promise<CouponView> {
    const code = CouponCode.create(command.code)
    const offerIds = command.offerIds ?? []
    await assertOffersExist(this.offers, offerIds)

    const coupon = CouponAggregate.create({
      id: crypto.randomUUID(),
      code,
      type: command.type,
      percentOff: command.percentOff,
      amountOffCents: command.amountOffCents,
      currency: command.currency,
      status: command.status,
      appliesToAll: command.appliesToAll,
      minPurchaseCents: command.minPurchaseCents,
      maxRedemptions: command.maxRedemptions,
      validFrom: command.validFrom,
      validUntil: command.validUntil,
      metadata: command.metadata,
      offerIds,
    })

    await this.coupons.create(coupon)
    for (const event of coupon.pullEvents()) this.logger.info(event.eventName, event.toPayload())
    return toCouponView(coupon)
  }
}

export async function assertOffersExist(
  offers: OfferRepository,
  offerIds: string[],
): Promise<void> {
  const ids = [...new Set(offerIds)]
  if (ids.length === 0) return
  const found = await offers.findByIds(ids)
  const foundIds = new Set(found.map((o) => o.id))
  const missing = ids.filter((id) => !foundIds.has(id))
  if (missing.length > 0) {
    throw new ValidationError(`Ofertas inexistentes no escopo do cupom: ${missing.join(', ')}`)
  }
}
