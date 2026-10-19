import { ValidationError } from '@sistemazero/core/errors'
import {
  AdultProfilePreferencesSchema,
  DEFAULT_ADULT_PROFILE_PREFERENCES,
} from '@sistemazero/core/profiles'
import type { AdultProfileRepository } from '../../domain/ports/adult-profile-repository.port'
import type { AvatarRepository } from '../../domain/ports/avatar-repository.port'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'
import { adultJourneysFor, badgeOf } from '../gamification/get-ranking-leaderboard.service'
import type { AdultJourneyBadgeView } from '../mappers/views'

export interface AdultPublicIdentityView {
  userId: string
  displayName: string
  /** A foto do avatar 3D de quem mostra o perfil (ausente sem foto). */
  photoUrl?: string
  /** A etapa da jornada adulta (ausente sem jornada configurada). */
  journey?: AdultJourneyBadgeView
}

export class AdultProfileService {
  constructor(
    private readonly repository: AdultProfileRepository,
    private readonly clock: () => Date,
    private readonly avatars?: Pick<AvatarRepository, 'listPhotoUrlsByProfileIds'>,
    private readonly journey?: Pick<AdultJourneyService, 'positions'>,
  ) {}
  async read(userId: string) {
    return (await this.repository.get(userId)) ?? { ...DEFAULT_ADULT_PROFILE_PREFERENCES }
  }
  async save(userId: string, input: unknown) {
    const parsed = AdultProfilePreferencesSchema.safeParse(input)
    if (!parsed.success)
      throw new ValidationError('Confira o nome e as preferências do seu perfil.')
    await this.repository.save(userId, parsed.data, this.clock())
    return parsed.data
  }
  /**
   * As identidades de quem mostra o perfil (as outras pessoas NUNCA aparecem aqui), com a foto do
   * avatar e a etapa da jornada para o anel da cor no Mural e no Clube. Foto e etapa são
   * best-effort: sem elas, a lista segue só com o nome.
   */
  async publicIdentities(ids: string[]): Promise<AdultPublicIdentityView[]> {
    const identities = await this.repository.listPublic(ids)
    if (identities.length === 0) return identities
    const publicIds = identities.map((identity) => identity.userId)
    const [photos, journeys] = await Promise.all([
      this.avatars
        ? this.avatars
            .listPhotoUrlsByProfileIds(publicIds, 'adult')
            .catch(() => new Map<string, string>())
        : Promise.resolve(new Map<string, string>()),
      adultJourneysFor(this.journey, 'adult', publicIds),
    ])
    return identities.map((identity) => {
      const photoUrl = photos.get(identity.userId)
      const journey = journeys.get(identity.userId)
      return {
        userId: identity.userId,
        displayName: identity.displayName,
        ...(photoUrl ? { photoUrl } : {}),
        ...(journey ? { journey: badgeOf(journey) } : {}),
      }
    })
  }
}
