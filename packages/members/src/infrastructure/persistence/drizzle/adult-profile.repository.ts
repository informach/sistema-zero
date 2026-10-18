import type { AdultProfilePreferences } from '@sistemazero/core/profiles'
import { and, eq, inArray } from 'drizzle-orm'
import type { AdultProfileRepository } from '../../../domain/ports/adult-profile-repository.port'
import type { Database } from './db'
import { lockLearningOwner } from './learning-owner-lock'
import { adultProfiles } from './schema'

export class DrizzleAdultProfileRepository implements AdultProfileRepository {
  constructor(private readonly db: Database) {}
  async get(userId: string) {
    const [row] = await this.db
      .select({
        displayName: adultProfiles.displayName,
        publicEnabled: adultProfiles.publicEnabled,
        voiceEnabled: adultProfiles.voiceEnabled,
      })
      .from(adultProfiles)
      .where(eq(adultProfiles.userId, userId))
      .limit(1)
    return row ?? null
  }
  async save(userId: string, preferences: AdultProfilePreferences, now: Date) {
    await this.db.transaction(async (tx) => {
      await lockLearningOwner(tx, { userId, accountId: userId })
      await tx
        .insert(adultProfiles)
        .values({ userId, ...preferences, updatedAt: now })
        .onConflictDoUpdate({
          target: adultProfiles.userId,
          set: { ...preferences, updatedAt: now },
        })
    })
  }
  async listPublic(userIds: string[]) {
    if (!userIds.length) return []
    return this.db
      .select({ userId: adultProfiles.userId, displayName: adultProfiles.displayName })
      .from(adultProfiles)
      .where(and(inArray(adultProfiles.userId, userIds), eq(adultProfiles.publicEnabled, true)))
  }
}
