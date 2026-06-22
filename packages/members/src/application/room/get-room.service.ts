import type { CourseAudience } from '../../domain/course/course'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { RoomRepository } from '../../domain/ports/room-repository.port'
import {
  canonicalizeRoomState,
  ROOM_FLOORS,
  ROOM_ITEMS,
  ROOM_LIGHTINGS,
  ROOM_THEMES,
  type RoomThemeDef,
} from '../../domain/room/room-catalog'
import type { RoomEditorView, RoomThemeView } from '../mappers/views'

/**
 * Estado do quarto do aluno NA VITRINE: o quarto montado (canonicalizado) + catálogo
 * COMPLETO de itens/temas/pisos/luzes com `owned`/`locked`/`price` + saldo de moedas
 * (a lojinha). Mesmo padrão do `GetAvatarService`.
 */
export class GetRoomService {
  constructor(
    private readonly room: RoomRepository,
    private readonly coins: GamificationRepository,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    privileged = false,
  ): Promise<RoomEditorView> {
    const [raw, owned, balance] = await Promise.all([
      this.room.getState(userId, audience),
      this.room.listInventory(userId, audience),
      this.coins.getBalance(userId, audience),
    ])
    const ownedSet = new Set(owned)
    const state = canonicalizeRoomState(raw, ownedSet)
    const items = ROOM_ITEMS.map((i) => ({
      id: i.id,
      category: i.category,
      tier: i.tier,
      price: i.price,
      owned: i.tier === 'free' || ownedSet.has(i.id),
      locked: i.tier === 'coins' && !ownedSet.has(i.id),
    }))
    // Temas/pisos/luzes compartilham o shape {id,tier,price} → mesma projeção.
    const choices = (list: readonly RoomThemeDef[]): RoomThemeView[] =>
      list.map((c) => ({
        id: c.id,
        tier: c.tier,
        price: c.price,
        owned: c.tier === 'free' || ownedSet.has(c.id),
        locked: c.tier === 'coins' && !ownedSet.has(c.id),
      }))
    return {
      state,
      items,
      themes: choices(ROOM_THEMES),
      floors: choices(ROOM_FLOORS),
      lightings: choices(ROOM_LIGHTINGS),
      balance,
      // Equipe = moedas VIRTUAIS ilimitadas (a UI mostra ∞; o `balance` real fica intocado).
      ...(privileged ? { balanceUnlimited: true } : {}),
    }
  }
}
