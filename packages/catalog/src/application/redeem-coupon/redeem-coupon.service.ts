import type { Logger } from '@sistemazero/core/logging'
import type { CouponRepository } from '../../domain/ports/coupon-repository.port'

/**
 * Registra um uso do cupom (incremento ATÔMICO de `times_redeemed`, respeitando o
 * limite). Chamado pelo funil na confirmação do pagamento. Lança
 * `CouponExhaustedError`/`CouponNotFoundError` quando aplicável.
 *
 * TRADE-OFF CONHECIDO (intencional — ver CLAUDE.md "Pontos em aberto"):
 * - **`maxRedemptions` é teto MOLE, não garantia.** O desconto é aplicado na cobrança
 *   (no `quote`), mas contado só aqui, na confirmação. Sob concorrência, mais descontos
 *   podem ser concedidos do que o limite (a 1ª transação ganha o desconto; a contagem
 *   só capa o contador, não os descontos já cobrados).
 * - **Sem idempotência própria.** O incremento NÃO deduplica por chave de uso. Hoje é
 *   seguro porque o funil só chama atrás do `markPaid` exactly-once (e best-effort:
 *   engole erro); uma rechamada fora desse gate duplicaria a contagem.
 * Para uma garantia DURA, materializar um ledger `coupon_redemptions` (chave única por
 * pagamento/lead) e contar a partir dele — item futuro.
 */
export class RedeemCouponService {
  constructor(
    private readonly coupons: CouponRepository,
    private readonly logger: Logger,
  ) {}

  async execute(code: string): Promise<void> {
    await this.coupons.incrementRedemption(code)
    this.logger.info('coupon.redeemed', { code: code.trim().toUpperCase() })
  }
}
