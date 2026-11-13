import {
  AvatarPartFestaError,
  AvatarPartFreeError,
  AvatarPartInSetError,
  AvatarPartNotFoundError,
} from '../../domain/avatar/avatar.errors'
import { avatarItem, isOffShelf } from '../../domain/avatar/avatar3d-catalog'
import type { CourseAudience } from '../../domain/course/course'
import { InsufficientCoinsError } from '../../domain/gamification/coins.errors'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { AwardGamificationService } from '../gamification/award-gamification.service'

/**
 * Prefixo da chave de compra no extrato. O avatar antigo usava `avatar-buy:`, e é por esse prefixo
 * que a troca devolve as moedas das peças antigas.
 */
export const AVATAR_BUY_KEY_PREFIX = 'avatar-buy-v3:'

export interface BuyAvatarPartResult {
  /** `true` = já possuía (nenhuma cobrança). */
  alreadyOwned: boolean
  /** Saldo de moedas após a compra. */
  balance: number
  /** `true` = equipe (passe livre): moedas virtuais ilimitadas — a UI mostra ∞. */
  unlimited?: boolean
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
    private readonly gamification: AwardGamificationService,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    partId: string,
    privileged = false,
  ): Promise<BuyAvatarPartResult> {
    const part = avatarItem(partId)
    // Fora da loja (rascunho da arte ou peça aposentada) é como se não existisse para a compra.
    if (!part || isOffShelf(partId)) throw new AvatarPartNotFoundError()
    if (part.tier === 'set') throw new AvatarPartInSetError()
    if (part.tier === 'free' || part.tier === 'auto') throw new AvatarPartFreeError()
    if (part.tier === 'festa') throw new AvatarPartFestaError()

    // Já possui? → no-op, sem cobrar (a corrida de 2 compras converge no ledger abaixo).
    const owned = await this.avatar.listInventory(userId, audience)
    if (owned.includes(partId)) {
      return {
        alreadyOwned: true,
        balance: await this.coins.getBalance(userId, audience),
        ...(privileged ? { unlimited: true } : {}),
      }
    }

    const now = this.clock()
    // Débito + posse na MESMA transação (atômico): `grantInventory` grava o item junto com o
    // gasto — nunca cobra sem entregar. Recupera a posse no caminho ALREADY_SPENT (retry).
    // Equipe (passe livre): `amount: 0` entrega a peça sem debitar — moedas virtuais ilimitadas
    // (espelha a chave-mestra virtual dos cursos; nada persiste no saldo/ledger real).
    const spend = await this.coins.spendCoins({
      userId,
      audience,
      amount: privileged ? 0 : part.price,
      reason: 'spend_cosmetic',
      idempotencyKey: `${AVATAR_BUY_KEY_PREFIX}${userId}:${partId}`,
      now,
      grantInventory: { scope: 'avatar', itemId: partId },
    })
    if (!spend.ok && spend.code === 'INSUFFICIENT_BALANCE') throw new InsufficientCoinsError()
    // Marco de missão "personalizar o avatar" (amount 0, idempotente por peça → a
    // missão dá só XP no claim; re-comprar a mesma peça não refarma).
    await this.gamification.awardAvatarPartBuy({
      userId,
      accountId: userId,
      partId,
      audience,
      privileged,
    })
    return {
      alreadyOwned: false,
      balance: spend.ok ? spend.balanceAfter : spend.balance,
      ...(privileged ? { unlimited: true } : {}),
    }
  }
}
