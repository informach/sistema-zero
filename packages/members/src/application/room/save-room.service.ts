import type { Logger } from '@sistemazero/core/logging'
import type { CourseAudience } from '../../domain/course/course'
import type { RoomRepository } from '../../domain/ports/room-repository.port'
import { canonicalizeRoomState, type RoomState } from '../../domain/room/room-catalog'

/**
 * Salva o quarto montado. CANONICALIZA contra o inventário (descarta tema/item/pet
 * desconhecido ou NÃO possuído, posição fora da grade, excesso) — o servidor é o
 * portão (cliente não coloca o que não tem). Last-write-wins. `accountId` imutável.
 */
export class SaveRoomService {
  constructor(
    private readonly room: RoomRepository,
    private readonly clock: () => Date,
    private readonly logger?: Logger,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    raw: RoomState,
  ): Promise<RoomState> {
    const owned = new Set(await this.room.listInventory(userId, audience))
    const canonical = canonicalizeRoomState(raw, owned)
    // Descarte é TOLERÂNCIA por design (posse nunca se perde), mas silencioso
    // esconderia um bug de cliente sumindo com móveis — full review 24/07.
    const requested = raw.placedItems?.length ?? 0
    if (canonical.placedItems.length < requested) {
      this.logger?.warn('room.items_dropped', {
        userId,
        requested,
        kept: canonical.placedItems.length,
      })
    }
    await this.room.upsertState(userId, accountId, audience, canonical, this.clock())
    return canonical
  }
}
