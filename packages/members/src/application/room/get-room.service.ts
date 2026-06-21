import type { CourseAudience } from '../../domain/course/course'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { RoomRepository } from '../../domain/ports/room-repository.port'
import { canonicalizeRoomState, ROOM_ITEMS, ROOM_THEMES } from '../../domain/room/room-catalog'
import type { RoomEditorView } from '../mappers/views'

/**
 * Estado do quarto do aluno NA VITRINE: o quarto montado (canonicalizado) + catálogo
 * COMPLETO de itens/temas com `owned`/`locked`/`price` + saldo de moedas (a lojinha).
 * Mesmo padrão do `GetAvatarService`.
 */
export class GetRoomService {
  constructor(
    private readonly room: RoomRepository,
    private readonly coins: GamificationRepository,
  ) {}

  async execute(userId: string, audience: CourseAudience): Promise<RoomEditorView> {
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
    const themes = ROOM_THEMES.map((t) => ({
      id: t.id,
      tier: t.tier,
      price: t.price,
      owned: t.tier === 'free' || ownedSet.has(t.id),
      locked: t.tier === 'coins' && !ownedSet.has(t.id),
    }))
    return { state, items, themes, balance }
  }
}
