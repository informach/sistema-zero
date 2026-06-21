import type { CourseAudience } from '../../domain/course/course'
import { InsufficientCoinsError } from '../../domain/gamification/coins.errors'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { RoomRepository } from '../../domain/ports/room-repository.port'
import { RoomItemFreeError, RoomItemNotFoundError } from '../../domain/room/room.errors'
import { ROOM_ITEMS_BY_ID, ROOM_THEMES_BY_ID } from '../../domain/room/room-catalog'

export interface BuyRoomItemResult {
  alreadyOwned: boolean
  balance: number
}

/** Item OU tema do quarto (catálogos distintos, ids sem colisão). */
function roomThing(id: string): { tier: 'free' | 'coins'; price: number } | null {
  const item = ROOM_ITEMS_BY_ID.get(id)
  if (item) return { tier: item.tier, price: item.price }
  const theme = ROOM_THEMES_BY_ID.get(id)
  if (theme) return { tier: theme.tier, price: theme.price }
  return null
}

/**
 * Compra um item OU tema PAGO do quarto com moedas Zappy. Robusto a duplo-clique:
 * cobra ANTES (idempotente por `room-buy:<user>:<id>`) e garante o inventário depois.
 * Já possuído → no-op (não cobra). Cosmético puro. Espelha o `BuyAvatarPartService`.
 */
export class BuyRoomItemService {
  constructor(
    private readonly room: RoomRepository,
    private readonly coins: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    itemId: string,
  ): Promise<BuyRoomItemResult> {
    const thing = roomThing(itemId)
    if (!thing) throw new RoomItemNotFoundError()
    if (thing.tier === 'free') throw new RoomItemFreeError()

    const owned = await this.room.listInventory(userId, audience)
    if (owned.includes(itemId)) {
      return { alreadyOwned: true, balance: await this.coins.getBalance(userId, audience) }
    }

    const now = this.clock()
    const spend = await this.coins.spendCoins({
      userId,
      audience,
      amount: thing.price,
      reason: 'spend_room',
      idempotencyKey: `room-buy:${userId}:${itemId}`,
      now,
    })
    if (!spend.ok && spend.code === 'INSUFFICIENT_BALANCE') throw new InsufficientCoinsError()

    await this.room.addToInventory(userId, audience, itemId, now)
    return { alreadyOwned: false, balance: spend.ok ? spend.balanceAfter : spend.balance }
  }
}
