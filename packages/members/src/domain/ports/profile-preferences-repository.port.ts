import type { KidsTheme } from '@sistemazero/core/learning'
import type { LearningOwner } from './learning-repository.port'

export interface ProfilePreferencesRepository {
  getKidsTheme(userId: string): Promise<KidsTheme | null>
  setKidsTheme(owner: LearningOwner, theme: KidsTheme, now: Date): Promise<void>
}
