import type { KidsTheme } from '@sistemazero/core/learning'
import type { LearningOwner } from '../../src/domain/ports/learning-repository.port'
import type { ProfilePreferencesRepository } from '../../src/domain/ports/profile-preferences-repository.port'

export class InMemoryProfilePreferencesRepository implements ProfilePreferencesRepository {
  readonly themes = new Map<string, KidsTheme>()
  async getKidsTheme(userId: string) {
    return this.themes.get(userId) ?? null
  }
  async setKidsTheme(owner: LearningOwner, theme: KidsTheme) {
    this.themes.set(owner.userId, theme)
  }
}
