import type { PlatformAction, PlatformActionResult } from '@sistemazero/core/learning'
import { canonicalizeAvatarConfig, defaultAvatarConfig } from '../../domain/avatar/avatar-config'
import type { CourseAudience } from '../../domain/course/course'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { ProfilePreferencesRepository } from '../../domain/ports/profile-preferences-repository.port'
import type { RoomRepository } from '../../domain/ports/room-repository.port'
import {
  canonicalizeRoomState,
  DEFAULT_ROOM_FLOOR,
  DEFAULT_ROOM_LIGHTING,
  DEFAULT_ROOM_THEME,
  DEFAULT_ROOM_WALL_COLORS,
} from '../../domain/room/room-catalog'
import { stableJson } from '../../domain/shared/stable-json'

function visibleAvatar(slots: Record<string, { asset: string; color?: string }>) {
  return Object.fromEntries(
    Object.entries(slots).map(([category, slot]) => [
      category,
      slot.asset.endsWith('-none') ? { asset: slot.asset } : slot,
    ]),
  )
}

export class PlatformActionService {
  constructor(
    private readonly avatars: AvatarRepository,
    private readonly rooms: RoomRepository,
    private readonly preferences: ProfilePreferencesRepository,
  ) {}

  async check(
    userId: string,
    audience: CourseAudience,
    action: PlatformAction,
  ): Promise<PlatformActionResult> {
    if (action === 'customize-avatar') {
      const saved = canonicalizeAvatarConfig(await this.avatars.getConfig(userId, audience))
      const passed =
        stableJson(visibleAvatar(saved.slots)) !==
        stableJson(visibleAvatar(defaultAvatarConfig().slots))
      return {
        action,
        passed,
        feedback: passed
          ? 'Seu avatar está com a sua cara!'
          : 'Seu avatar ainda está no padrão. Escolha uma peça ou uma cor diferente e salve.',
        ...(passed ? { avatarSlots: saved.slots } : {}),
      }
    }
    if (action === 'customize-room') {
      const [raw, inventory] = await Promise.all([
        this.rooms.getState(userId, audience),
        this.rooms.listInventory(userId, audience),
      ])
      const saved = canonicalizeRoomState(raw, new Set(inventory))
      // The default floor and lighting may be explicitly saved by the editor.
      const passed =
        saved.theme !== DEFAULT_ROOM_THEME ||
        saved.placedItems.length > 0 ||
        saved.pet !== null ||
        Boolean(
          saved.wallColors?.left &&
            saved.wallColors.left.toLowerCase() !== DEFAULT_ROOM_WALL_COLORS.left,
        ) ||
        Boolean(
          saved.wallColors?.right &&
            saved.wallColors.right.toLowerCase() !== DEFAULT_ROOM_WALL_COLORS.right,
        ) ||
        Boolean(saved.floor && saved.floor !== DEFAULT_ROOM_FLOOR) ||
        Boolean(saved.lighting && saved.lighting !== DEFAULT_ROOM_LIGHTING)
      return {
        action,
        passed,
        feedback: passed
          ? 'Seu quarto já tem o seu toque!'
          : 'Decore seu quarto com um item ou uma nova aparência e salve antes de verificar.',
      }
    }
    // ⭐ A régua é "ESCOLHEU uma cor", não "escolheu a cor X": ela sobrevive a paleta nova, a
    // paleta que sai do catálogo e ao fim do tema Pink. Antes ela cobrava `theme === 'pink'`, o
    // que um seletor de cores quebraria em silêncio — a criança escolheria roxo e a aula diria
    // que ela não fez nada. `null` = nunca escolheu.
    const palette = await this.preferences.getPalette(userId)
    const passed = palette !== null
    return {
      action,
      passed,
      feedback: passed
        ? 'Sua cor está guardada no seu perfil!'
        : 'Vá em Meu perfil, escolha a sua cor e volte aqui para eu conferir.',
      ...(palette ? { palette } : {}),
    }
  }
}
