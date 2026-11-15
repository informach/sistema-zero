import { isMoradaAdultOnly, MORADA_CATALOG, moradaPrice } from '@sistemazero/core/morada'
import type { CourseAudience } from '../../domain/course/course'
import { InsufficientCoinsError } from '../../domain/gamification/coins.errors'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import {
  RoomItemFreeError,
  RoomItemNotFoundError,
  RoomItemNotPurchasableError,
} from '../../domain/room/room.errors'
import type { AwardGamificationService } from '../gamification/award-gamification.service'
import type { BuyRoomItemResult } from './buy-room-item.service'
import type { MoradaHouseService } from './morada-house.service'

/**
 * Compra uma peça PAGA da Morada com moedas Zappy (14/11/2026: a Morada volta a ter preço, pela
 * régua do avatar). O mesmo caminho do quarto antigo (`BuyRoomItemService`): cobra e entrega na
 * mesma transação (`grantInventory`, o id Morada no `room_inventory`), idempotente por
 * `morada-buy:<user>:<peça>`, já possuída não cobra, equipe não paga, sem saldo é 402.
 * Grátis e troféu (a estante de troféus inclusive) não se compram.
 */
export class BuyMoradaPieceService {
  constructor(
    private readonly coins: GamificationRepository,
    private readonly gamification: AwardGamificationService,
    private readonly clock: () => Date,
    private readonly morada: Pick<MoradaHouseService, 'read'>,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    pieceId: string,
    privileged = false,
  ): Promise<BuyRoomItemResult> {
    // Peça só do adulto não existe para o Kids (como o chapéu de cerveja do avatar).
    if (!MORADA_CATALOG.pieces[pieceId] || (audience !== 'adult' && isMoradaAdultOnly(pieceId)))
      throw new RoomItemNotFoundError('Peça não encontrada.')
    const price = moradaPrice(pieceId)
    if (price.tier === 'free') throw new RoomItemFreeError('Essa peça já é gratuita.')
    if (price.tier === 'trophy') throw new RoomItemNotPurchasableError()

    // Já é dela (comprada, ou já estava na casa antes de haver preço): não cobra.
    const { owned } = await this.morada.read(userId, audience)
    if (owned.includes(pieceId)) {
      return {
        alreadyOwned: true,
        balance: await this.coins.getBalance(userId, audience),
        ...(privileged ? { unlimited: true } : {}),
      }
    }

    const spend = await this.coins.spendCoins({
      userId,
      audience,
      amount: privileged ? 0 : price.price,
      reason: 'spend_room',
      idempotencyKey: `morada-buy:${userId}:${pieceId}`,
      now: this.clock(),
      grantInventory: { scope: 'room', itemId: pieceId },
    })
    if (!spend.ok && spend.code === 'INSUFFICIENT_BALANCE') throw new InsufficientCoinsError()
    await this.gamification.awardRoomItemBuy({
      userId,
      accountId: userId,
      itemId: pieceId,
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
