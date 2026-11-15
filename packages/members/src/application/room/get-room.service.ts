import { projectMoradaRoom } from '@sistemazero/core/morada'
import type { CourseAudience } from '../../domain/course/course'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { RoomRepository } from '../../domain/ports/room-repository.port'
import {
  canonicalizeRoomState,
  HIDDEN_UNTIL_OWNED_TROPHIES,
  ROOM_FLOORS,
  ROOM_ITEMS,
  ROOM_LIGHTINGS,
  ROOM_THEMES,
  type RoomThemeDef,
} from '../../domain/room/room-catalog'
import type { RoomEditorView, RoomThemeView } from '../mappers/views'
import type { MoradaHouseService } from './morada-house.service'

/**
 * Estado do quarto do aluno NA VITRINE: o quarto montado (canonicalizado) + catálogo
 * COMPLETO de itens/temas/pisos/luzes com `owned`/`locked`/`price` + saldo de moedas
 * (a lojinha). Mesmo padrão do `GetAvatarService`.
 */
export class GetRoomService {
  constructor(
    private readonly room: RoomRepository,
    private readonly coins: GamificationRepository,
    private readonly morada?: Pick<MoradaHouseService, 'read'>,
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
    const morada = await this.morada?.read(userId, audience)
    if (morada) state.house = projectMoradaRoom(morada.house)
    // Troféu de conquista que não se divulga (oficinas ao vivo) só entra no catálogo depois de ganho.
    const visible = ROOM_ITEMS.filter(
      (i) => !HIDDEN_UNTIL_OWNED_TROPHIES.has(i.id) || ownedSet.has(i.id),
    )
    const items = visible.map((i) => ({
      id: i.id,
      category: i.category,
      tier: i.tier,
      price: i.price,
      owned: i.tier === 'free' || ownedSet.has(i.id),
      // `coins` trava até comprar; `trophy` (07/2026) trava até GANHAR a conquista.
      locked: i.tier !== 'free' && !ownedSet.has(i.id),
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
      ...(morada ? { morada } : {}),
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
