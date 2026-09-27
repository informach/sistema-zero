import type { PalettePreference } from '@sistemazero/core/palette'
import type { LearningOwner } from './learning-repository.port'

export interface ProfilePreferencesRepository {
  /** `null` = a pessoa nunca escolheu cor; quem renderiza pinta a cor da casa. */
  getPalette(userId: string): Promise<PalettePreference>
  /** Aceita `null`: voltar para "nunca escolhi" é uma escolha válida. */
  setPalette(owner: LearningOwner, palette: PalettePreference, now: Date): Promise<void>
}
