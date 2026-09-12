import type { KidsTheme } from '@sistemazero/core/learning'
import { eq } from 'drizzle-orm'
import type { LearningOwner } from '../../../domain/ports/learning-repository.port'
import type { ProfilePreferencesRepository } from '../../../domain/ports/profile-preferences-repository.port'
import type { Database } from './db'
import { lockLearningOwner } from './learning-owner-lock'
import { profilePreferences } from './schema'

export class DrizzleProfilePreferencesRepository implements ProfilePreferencesRepository {
  constructor(private readonly db: Database) {}
  async getKidsTheme(userId: string) {
    const [row] = await this.db
      .select({ theme: profilePreferences.kidsTheme })
      .from(profilePreferences)
      .where(eq(profilePreferences.userId, userId))
      .limit(1)
    return row?.theme ?? null
  }
  async setKidsTheme(owner: LearningOwner, theme: KidsTheme, now: Date) {
    await this.db.transaction(async (tx) => {
      await lockLearningOwner(tx, owner)
      await tx
        .insert(profilePreferences)
        .values({ ...owner, kidsTheme: theme, updatedAt: now })
        .onConflictDoUpdate({
          target: profilePreferences.userId,
          set: { kidsTheme: theme, updatedAt: now },
          setWhere: eq(profilePreferences.accountId, owner.accountId),
        })
    })
  }
}
