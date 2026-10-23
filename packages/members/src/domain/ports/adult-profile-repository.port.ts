import type { AdultProfilePreferences } from '@sistemazero/core/profiles'

export interface AdultProfileRepository {
  get(userId: string): Promise<AdultProfilePreferences | null>
  save(userId: string, preferences: AdultProfilePreferences, now: Date): Promise<void>
  listPublic(userIds: string[]): Promise<Array<{ userId: string; displayName: string }>>
}
