import type { Logger } from '@sistemazero/core/logging'
import type { CouponRepository } from '../../domain/ports/coupon-repository.port'

/**
 * Registra um uso do cupom (incremento ATÔMICO de `times_redeemed`, respeitando o
 * limite). Chamado pelo funil na confirmação do pagamento. Lança
 * `CouponExhaustedError`/`CouponNotFoundError` quando aplicável.
 *
 * Idempotência: o funil repassa `idempotency-key` do pagamento e o serviço
 * repassa para o repositório, evitando duplicação na re-apresentação do
 * pagamento pago (especialmente em `polling`).
 */
export class RedeemCouponService {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly logger: Logger,
  ) {}

  async execute(code: string, idempotencyKey?: string): Promise<void> {
    await this.coupons.incrementRedemption(code, idempotencyKey)
    this.logger.info('coupon.redeemed', { code: code.trim().toUpperCase() })
  }
}
