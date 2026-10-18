import type {
  AdultCourseMilestone,
  AdultCreatorCapability,
  AdultJourneyPolicy,
} from '@sistemazero/core/journey'
import type {
  AdultJourneyPolicyRecord,
  AdultJourneyRepository,
} from '../../src/domain/ports/adult-journey-repository.port'
import type { InMemoryGamificationRepository } from './in-memory'

export class InMemoryAdultJourneyRepository implements AdultJourneyRepository {
  record: AdultJourneyPolicyRecord | null = null
  readonly grants = new Map<string, Set<AdultCreatorCapability>>()
  constructor(private readonly gamification: Pick<InMemoryGamificationRepository, 'events'>) {}
  async getPolicy() {
    return this.record ? structuredClone(this.record) : null
  }
  async savePolicy(policy: AdultJourneyPolicy, expectedVersion: number) {
    if ((this.record?.version ?? 0) !== expectedVersion) return null
    this.record = { version: expectedVersion + 1, policy: structuredClone(policy) }
    return structuredClone(this.record)
  }
  async listMilestones(userId: string): Promise<AdultCourseMilestone[]> {
    const result = new Map<string, AdultCourseMilestone>()
    for (const event of this.gamification.events) {
      if (
        event.userId !== userId ||
        event.audience !== 'adult' ||
        !['course_complete', 'course_showcased'].includes(event.sourceType)
      )
        continue
      const milestone = result.get(event.sourceId) ?? {
        courseId: event.sourceId,
        completed: false,
        showcased: false,
      }
      if (event.sourceType === 'course_complete') milestone.completed = true
      if (event.sourceType === 'course_showcased') milestone.showcased = true
      result.set(event.sourceId, milestone)
    }
    return [...result.values()]
  }
  async listGranted(userId: string) {
    return [...(this.grants.get(userId) ?? [])]
  }
  async freezeGranted(
    userId: string,
    version: number,
    capabilities: readonly AdultCreatorCapability[],
  ) {
    if (this.record?.version !== version) return false
    const owned = this.grants.get(userId) ?? new Set<AdultCreatorCapability>()
    for (const capability of capabilities) owned.add(capability)
    this.grants.set(userId, owned)
    return true
  }
}
