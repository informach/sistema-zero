import { canonicalizeAvatarConfig } from '../../domain/avatar/avatar-config'
import type { CourseAudience } from '../../domain/course/course'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { RoomRepository } from '../../domain/ports/room-repository.port'
import { canonicalizeRoomState } from '../../domain/room/room-catalog'
import type { PublicProfileView } from '../mappers/views'

/**
 * Perfil PÚBLICO de uma criança (dado de jogo agregado), consumido pelo BFF do
 * `/crianca/[profileId]`. Compõe XP + colocação no ranking + conquistas QUE TEM
 * (não o catálogo) + avatar equipado; quarto vem na Fase 3 (`null`). A coorte do
 * ranking precisa da CONTA do perfil — vem do próprio registro de gamificação
 * (`accountId`). NÃO há dado sensível: nome é juntado pelo BFF (auth); e-mail/
 * telefone/nascimento/conta nunca passam por aqui.
 */
export class GetPublicProfileService {
  constructor(
    private readonly gamification: GamificationRepository,
    private readonly avatar: AvatarRepository,
    private readonly room: RoomRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(profileId: string, audience: CourseAudience): Promise<PublicProfileView> {
    const [profile, badges, avatarConfig, roomRaw, roomInventory] = await Promise.all([
      this.gamification.getProfile(profileId, audience),
      this.gamification.listBadges(profileId, audience),
      this.avatar.getConfig(profileId, audience),
      this.room.getState(profileId, audience),
      this.room.listInventory(profileId, audience),
    ])
    // Ranking só faz sentido com perfil (XP); a coorte usa a conta dona do perfil.
    const ranking = profile
      ? await this.gamification.getRanking(profileId, profile.accountId, audience, this.clock())
      : null
    const equipped = canonicalizeAvatarConfig(avatarConfig)
    // Quarto: `null` se nunca montou; senão canonicalizado (modo visualização).
    const room = roomRaw ? canonicalizeRoomState(roomRaw, new Set(roomInventory)) : null
    return {
      profileId,
      xp: profile?.xp ?? 0,
      ranking,
      // listBadges já devolve SÓ as conquistadas (≠ do /gamification/me, que traz o catálogo).
      badges: badges.map((b) => ({ slug: b.badgeSlug, unlockedAt: b.unlockedAt.toISOString() })),
      avatar: { style: equipped.style, parts: equipped.parts },
      room,
    }
  }
}
