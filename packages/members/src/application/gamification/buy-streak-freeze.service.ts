import type { CourseAudience } from '../../domain/course/course'
import { STREAK_FREEZE_PRICE } from '../../domain/gamification/coins'
import { InsufficientCoinsError } from '../../domain/gamification/coins.errors'
import { MaxFreezesError } from '../../domain/gamification/gamification.errors'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'

export interface BuyStreakFreezeView {
  freezes: number
  balance: number
}

/**
 * Compra 1 protetor de sequência (streak-freeze) com moedas Zappy. Idempotente por
 * `streak-freeze:<user>:<saldo-de-protetores>` (duplo-clique não cobra 2×); sem saldo →
 * 402; já no máximo → 409. Cosmético de RETENÇÃO (ético: protege a sequência, não compra status).
 */
export class BuyStreakFreezeService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(userId: string, audience: CourseAudience): Promise<BuyStreakFreezeView> {
    // O nº atual de protetores é a chave de idempotência: dois cliques na MESMA compra
    // (mesmo estado) batem na mesma key → só 1 debita; uma 2ª compra legítima muda a key.
    const current = await this.repo.getProfile(userId, audience)
    const idempotencyKey = `streak-freeze:${userId}:${current?.streakFreezes ?? 0}`
    const result = await this.repo.buyStreakFreeze({
      userId,
      audience,
      price: STREAK_FREEZE_PRICE,
      idempotencyKey,
      now: this.clock(),
    })
    if (!result.ok) {
      if (result.code === 'MAX_FREEZES') throw new MaxFreezesError()
      throw new InsufficientCoinsError()
    }
    return { freezes: result.freezes, balance: result.balance }
  }
}
