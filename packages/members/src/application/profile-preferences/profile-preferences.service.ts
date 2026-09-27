import type { PalettePreference } from '@sistemazero/core/palette'
import type { LearningOwner } from '../../domain/ports/learning-repository.port'
import type { ProfilePreferencesRepository } from '../../domain/ports/profile-preferences-repository.port'

export class ProfilePreferencesService {
  constructor(
    private readonly repository: ProfilePreferencesRepository,
    private readonly clock: () => Date,
  ) {}

  async read(userId: string) {
    return { palette: await this.repository.getPalette(userId) }
  }

  async save(owner: LearningOwner, palette: PalettePreference) {
    await this.repository.setPalette(owner, palette, this.clock())
    return { palette }
  }
}
