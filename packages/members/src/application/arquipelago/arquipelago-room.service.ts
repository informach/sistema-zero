import type { CourseAudience } from '../../domain/course/course'
import type { RoomRepository } from '../../domain/ports/room-repository.port'
import { canonicalizeRoomState, type RoomState } from '../../domain/room/room-catalog'

/**
 * O quarto de UM perfil para a visita de um irmão no Arquipélago (30/10/2026): o mesmo estado
 * que o Meu quarto dele mostra, conferido contra o que ele tem (`canonicalizeRoomState`, como o
 * `GetRoomService`), sem catálogo nem saldo. Só leitura. Quem pode ver é o serviço do jogo, que
 * confere a conta, a permissão dos pais e o acesso antes de perguntar.
 */
export class ArquipelagoRoomService {
  constructor(private readonly room: Pick<RoomRepository, 'getState' | 'listInventory'>) {}

  async quarto(userId: string, audience: CourseAudience): Promise<RoomState> {
    const [raw, owned] = await Promise.all([
      this.room.getState(userId, audience),
      this.room.listInventory(userId, audience),
    ])
    return canonicalizeRoomState(raw, new Set(owned))
  }
}
