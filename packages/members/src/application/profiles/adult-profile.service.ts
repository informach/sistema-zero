import { ValidationError } from '@sistemazero/core/errors'
import {
  AdultProfilePreferencesSchema,
  DEFAULT_ADULT_PROFILE_PREFERENCES,
} from '@sistemazero/core/profiles'
import type { AdultProfileRepository } from '../../domain/ports/adult-profile-repository.port'

export class AdultProfileService {
  constructor(
    private readonly repository: AdultProfileRepository,
    private readonly clock: () => Date,
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
  publicIdentities(ids: string[]) {
    return this.repository.listPublic(ids)
  }
}
