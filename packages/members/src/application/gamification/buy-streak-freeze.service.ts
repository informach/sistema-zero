import type { CourseAudience } from '../../domain/course/course'
import { STREAK_FREEZE_PRICE } from '../../domain/gamification/coins'
import { InsufficientCoinsError } from '../../domain/gamification/coins.errors'
import { MaxFreezesError } from '../../domain/gamification/gamification.errors'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'

export interface BuyStreakFreezeView {
  freezes: number
  balance: number
  /** `true` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞. */
  unlimited?: boolean
}

/**
 * Compra 1 protetor de sequência (streak-freeze) com moedas Zappy. Idempotente por
 * chave de operação (`Idempotency-Key` do cliente ou UUID gerado no servidor); sem
 * saldo → 402; já no máximo → 409. Cosmético de RETENÇÃO (ético: protege a sequência,
 * não compra status).
 */
export class BuyStreakFreezeService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    operationKey?: string,
    privileged = false,
  ): Promise<BuyStreakFreezeView> {
    const key = operationKey?.trim() || this.newId()
    const idempotencyKey = `streak-freeze:${audience}:${userId}:${key}`
    // Equipe (passe livre): `price: 0` concede o protetor sem debitar — moedas virtuais
    // ilimitadas. O teto MAX_FREEZES segue valendo (é limite de quantidade, não de moeda).
    const result = await this.repo.buyStreakFreeze({
      userId,
      audience,
      price: privileged ? 0 : STREAK_FREEZE_PRICE,
      idempotencyKey,
      now: this.clock(),
    })
    if (!result.ok) {
      if (result.code === 'MAX_FREEZES') throw new MaxFreezesError()
      throw new InsufficientCoinsError()
    }
    return {
      freezes: result.freezes,
      balance: result.balance,
      ...(privileged ? { unlimited: true } : {}),
    }
  }
}
