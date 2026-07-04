import type { CourseAudience } from '../../domain/course/course'
import { computeStudentLevel, type StudentLevelSlug } from '../../domain/gamification/levels'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'

/** Rosto + aura de um autor do fórum: foto do boneco 3D (`null` = boneco padrão) + slug do nível. */
export interface ProfileAvatarView {
  photoUrl: string | null
  level: StudentLevelSlug
}

/**
 * Avatar (foto) + NÍVEL (para a aura) de VÁRIOS perfis numa ida — consumido pelo BFF do
 * Clube/Mural kids para pintar rosto+aura de cada autor de tópico/comentário sem N+1.
 * Peer-viewable (como o perfil público): só dado de jogo (foto do avatar 3D que a
 * criança montou + slug do nível), NUNCA nome/e-mail/PII. Cada id pedido volta no mapa
 * (perfil sem foto → `photoUrl: null`; sem marcos → nível `noob`/Faísca).
 */
export class GetAvatarsByProfilesService {
  constructor(
    private readonly avatar: AvatarRepository,
    private readonly gamification: GamificationRepository,
  ) {}

  async execute(
    profileIds: string[],
    audience: CourseAudience,
  ): Promise<Record<string, ProfileAvatarView>> {
    const unique = [...new Set(profileIds)]
    const result: Record<string, ProfileAvatarView> = {}
    if (unique.length === 0) return result
    const [photos, qualifying] = await Promise.all([
      this.avatar.listPhotoUrlsByProfileIds(unique, audience),
      this.gamification.countQualifyingByLevelForProfiles(unique, audience),
    ])
    const EMPTY = { iniciante: 0, intermediario: 0, avancado: 0 }
    for (const id of unique) {
      result[id] = {
        photoUrl: photos.get(id) ?? null,
        level: computeStudentLevel(qualifying.get(id) ?? EMPTY).slug,
      }
    }
    return result
  }
}
