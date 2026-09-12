import type { KidsTheme } from '@sistemazero/core/learning'
import type { LearningOwner } from '../../domain/ports/learning-repository.port'
import type { ProfilePreferencesRepository } from '../../domain/ports/profile-preferences-repository.port'

export class ProfilePreferencesService {
  constructor(
    private readonly repository: ProfilePreferencesRepository,
    private readonly clock: () => Date,
  ) {}
  async read(userId: string) {
    return { theme: await this.repository.getKidsTheme(userId) }
  }
  async save(owner: LearningOwner, theme: KidsTheme) {
    await this.repository.setKidsTheme(owner, theme, this.clock())
    return { theme }
  }
}
