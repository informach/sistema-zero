import type { AdultProfilePreferences } from '@sistemazero/core/profiles'
import type { AdultProfileRepository } from '../../src/domain/ports/adult-profile-repository.port'
export class InMemoryAdultProfileRepository implements AdultProfileRepository {
  readonly rows = new Map<string, AdultProfilePreferences>()
  async get(userId: string) {
    return this.rows.get(userId) ?? null
  }
  async save(userId: string, preferences: AdultProfilePreferences) {
    this.rows.set(userId, { ...preferences })
  }
  async listPublic(userIds: string[]) {
    return userIds.flatMap((userId) => {
      const profile = this.rows.get(userId)
      return profile?.publicEnabled ? [{ userId, displayName: profile.displayName }] : []
    })
  }
}
