import { IdentityUuidSchema } from '@sistemazero/core/identity'
import type { CourseAudience } from '../../domain/course/course'
import {
  computeStudentLevel,
  emptyQualifyingByTier,
  type StudentLevelSlug,
} from '../../domain/gamification/levels'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { KidsJourneyProfilesService } from '../kids-journey/kids-journey-profiles.service'

/** Rosto + aura de um autor do fórum: foto do boneco 3D (`null` = boneco padrão) + slug do nível. */
export interface ProfileAvatarView {
  photoUrl: string | null
  level: StudentLevelSlug | null
  journeyUnavailable?: true
}

/**
 * Avatar (foto) + NÍVEL (para a aura) de VÁRIOS perfis numa ida — consumido pelo BFF do
 * Clube/Mural kids para pintar rosto+aura de cada autor de tópico/comentário sem N+1.
 * Peer-viewable (como o perfil público): só dado de jogo (foto do avatar 3D que a
 * criança montou + slug do nível), NUNCA nome/e-mail/PII. Cada id pedido volta no mapa
 * (sem foto → photoUrl:null; registro Kids ausente → level:null/unavailable).
 * Faísca legítima exige earned materializado, mesmo sem XP. Adult mantém sua derivação.
 */
export class GetAvatarsByProfilesService {
  constructor(
    private readonly avatar: AvatarRepository,
    private readonly gamification: GamificationRepository,
    private readonly kidsProfiles: Pick<KidsJourneyProfilesService, 'getMany'>,
  ) {}

  /** Auth device selection needs only photos, with no pedagogical policy/rank dependency. */
  async photos(
    profileIds: readonly string[],
    audience: CourseAudience,
  ): Promise<Record<string, string | null>> {
    const unique = [
      ...new Set(profileIds.map((id) => (audience === 'kids' ? IdentityUuidSchema.parse(id) : id))),
    ]
    if (!unique.length) return {}
    const photos = await this.avatar.listPhotoUrlsByProfileIds(unique, audience)
    return Object.fromEntries(unique.map((id) => [id, photos.get(id) ?? null]))
  }

  async execute(
    profileIds: string[],
    audience: CourseAudience,
  ): Promise<Record<string, ProfileAvatarView>> {
    const unique = [
      ...new Set(profileIds.map((id) => (audience === 'kids' ? IdentityUuidSchema.parse(id) : id))),
    ]
    const result: Record<string, ProfileAvatarView> = {}
    if (unique.length === 0) return result
    const [photos, qualifying, kids] = await Promise.all([
      this.avatar.listPhotoUrlsByProfileIds(unique, audience),
      audience === 'adult'
        ? this.gamification.listQualifyingJourneySlotsForProfiles(unique, 'adult')
        : null,
      audience === 'kids' ? this.kidsProfiles.getMany(unique) : null,
    ])
    for (const id of unique) {
      result[id] = {
        photoUrl: photos.get(id) ?? null,
        level: kids
          ? (kids.get(id)?.earned.level ?? null)
          : computeStudentLevel(qualifying?.get(id) ?? emptyQualifyingByTier()).slug,
        ...(kids && !kids.has(id) ? { journeyUnavailable: true as const } : {}),
      }
    }
    return result
  }
}
