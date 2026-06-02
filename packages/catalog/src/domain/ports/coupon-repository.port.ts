import type { CouponAggregate } from '../coupon/coupon.aggregate'

/**
 * Porta de persistência de cupons. Consultas retornam `null` quando não existe.
 * `incrementRedemption` é ATÔMICO (resolve a corrida de limite de usos).
 */
export interface CouponRepository {
  findById(id: string): Promise<CouponAggregate | null>
  findByCode(code: string): Promise<CouponAggregate | null>
  /** Insere um cupom (+ escopo). Em violação de unicidade (code) lança `DuplicateCouponError`. */
  create(coupon: CouponAggregate): Promise<void>
  /** Atualiza um cupom (+ escopo) com concorrência otimista. */
  update(coupon: CouponAggregate): Promise<void>
  /**
   * Incrementa `times_redeemed` ATOMICAMENTE respeitando `max_redemptions` e
   * `status='active'`. Lança `CouponExhaustedError` se esgotado/inativo e
   * `CouponNotFoundError` se o código não existir.
   */
  incrementRedemption(code: string): Promise<void>
}
