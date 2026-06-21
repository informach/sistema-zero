import { AvatarPartFreeError, AvatarPartNotFoundError } from '../../domain/avatar/avatar.errors'
import { AVATAR3D_PARTS_BY_ID } from '../../domain/avatar/avatar3d-catalog'
import type { CourseAudience } from '../../domain/course/course'
import { InsufficientCoinsError } from '../../domain/gamification/coins.errors'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'

export interface BuyAvatarPartResult {
  /** `true` = já possuía (nenhuma cobrança). */
  alreadyOwned: boolean
  /** Saldo de moedas após a compra. */
  balance: number
}

/**
 * Compra uma peça PAGA do avatar com moedas Zappy. Robusto a duplo-clique/retry:
 * cobra ANTES (idempotente por `avatar-buy:<user>:<part>` no ledger) e garante o
 * inventário depois — uma retentativa devolve `ALREADY_SPENT` (sem cobrar de novo)
 * e completa a posse. Peça já possuída → no-op (não cobra). Cosmético puro.
 */
export class BuyAvatarPartService {
  constructor(
    private readonly avatar: AvatarRepository,
    private readonly coins: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    partId: string,
  ): Promise<BuyAvatarPartResult> {
    const part = AVATAR3D_PARTS_BY_ID.get(partId)
    if (!part) throw new AvatarPartNotFoundError()
    if (part.tier === 'free') throw new AvatarPartFreeError()

    // Já possui? → no-op, sem cobrar (a corrida de 2 compras converge no ledger abaixo).
    const owned = await this.avatar.listInventory(userId, audience)
    if (owned.includes(partId)) {
      return { alreadyOwned: true, balance: await this.coins.getBalance(userId, audience) }
    }

    const now = this.clock()
    // Débito + posse na MESMA transação (atômico): `grantInventory` grava o item junto com o
    // gasto — nunca cobra sem entregar. Recupera a posse no caminho ALREADY_SPENT (retry).
    const spend = await this.coins.spendCoins({
      userId,
      audience,
      amount: part.price,
      reason: 'spend_cosmetic',
      idempotencyKey: `avatar-buy:${userId}:${partId}`,
      now,
      grantInventory: { scope: 'avatar', itemId: partId },
    })
    if (!spend.ok && spend.code === 'INSUFFICIENT_BALANCE') throw new InsufficientCoinsError()
    return { alreadyOwned: false, balance: spend.ok ? spend.balanceAfter : spend.balance }
  }
}
