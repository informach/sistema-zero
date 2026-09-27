import type { PalettePreference } from '@sistemazero/core/palette'
import type { LearningOwner } from '../../src/domain/ports/learning-repository.port'
import type { ProfilePreferencesRepository } from '../../src/domain/ports/profile-preferences-repository.port'

export class InMemoryProfilePreferencesRepository implements ProfilePreferencesRepository {
  readonly palettes = new Map<string, PalettePreference>()
  async getPalette(userId: string) {
    return this.palettes.get(userId) ?? null
  }
  async setPalette(owner: LearningOwner, palette: PalettePreference) {
    this.palettes.set(owner.userId, palette)
  }
}
