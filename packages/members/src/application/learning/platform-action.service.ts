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
    const theme = await this.preferences.getKidsTheme(userId)
    const passed = audience === 'kids' && theme === 'pink'
    return {
      action,
      passed,
      feedback: passed
        ? 'O tema Pink está salvo no seu perfil!'
        : 'Abra o menu do seu perfil, escolha “Mudar tema” e volte para verificar.',
      ...(theme ? { theme } : {}),
    }
  }
}
