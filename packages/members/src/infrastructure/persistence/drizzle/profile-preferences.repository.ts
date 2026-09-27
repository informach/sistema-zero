import { type PalettePreference, readPalette } from '@sistemazero/core/palette'
import { eq } from 'drizzle-orm'
import type { LearningOwner } from '../../../domain/ports/learning-repository.port'
import type { ProfilePreferencesRepository } from '../../../domain/ports/profile-preferences-repository.port'
import type { Database } from './db'
import { lockLearningOwner } from './learning-owner-lock'
import { profilePreferences } from './schema'

export class DrizzleProfilePreferencesRepository implements ProfilePreferencesRepository {
  constructor(private readonly db: Database) {}

  async getPalette(userId: string) {
    const [row] = await this.db
      .select({ palette: profilePreferences.palette })
      .from(profilePreferences)
      .where(eq(profilePreferences.userId, userId))
      .limit(1)
    // ⚠️ Leitura TOLERANTE: um id que saiu do catálogo — ou que entrou num deploy à frente e o
    // app acabou de voltar atrás — vira "nunca escolheu" e a página pinta a cor da casa, em vez
    // de derrubar a tela por causa de uma string.
    return readPalette(row?.palette)
  }

  async setPalette(owner: LearningOwner, palette: PalettePreference, now: Date) {
    await this.db.transaction(async (tx) => {
      await lockLearningOwner(tx, owner)
      await tx
        .insert(profilePreferences)
        .values({ ...owner, palette, updatedAt: now })
        .onConflictDoUpdate({
          target: profilePreferences.userId,
          set: { palette, updatedAt: now },
          setWhere: eq(profilePreferences.accountId, owner.accountId),
        })
    })
  }
}
