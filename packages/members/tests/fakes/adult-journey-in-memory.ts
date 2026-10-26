import type {
  AdultCourseMilestone,
  AdultCreatorCapability,
  AdultJourneyPolicy,
} from '@sistemazero/core/journey'
import type {
  AdultJourneyPolicyRecord,
  AdultJourneyRepository,
} from '../../src/domain/ports/adult-journey-repository.port'
import { groupMilestones } from '../../src/infrastructure/persistence/drizzle/adult-journey.repository'
import type { InMemoryGamificationRepository } from './in-memory'

export class InMemoryAdultJourneyRepository implements AdultJourneyRepository {
  record: AdultJourneyPolicyRecord | null = null
  readonly grants = new Map<string, Set<AdultCreatorCapability>>()
  readonly reached = new Map<string, number>()
  readonly courseGrants = new Map<string, Set<string>>()
  constructor(private readonly gamification: Pick<InMemoryGamificationRepository, 'events'>) {}
  async getPolicy() {
    return this.record ? structuredClone(this.record) : null
  }
  async savePolicy(policy: AdultJourneyPolicy, expectedVersion: number) {
    if ((this.record?.version ?? 0) !== expectedVersion) return null
    this.record = { version: expectedVersion + 1, policy: structuredClone(policy) }
    return structuredClone(this.record)
  }
  async insertPolicyIfAbsent(policy: AdultJourneyPolicy) {
    if (this.record) return null
    this.record = { version: 1, policy: structuredClone(policy) }
    return structuredClone(this.record)
  }
  async listMilestones(userId: string): Promise<AdultCourseMilestone[]> {
    return (await this.listMilestonesForUsers([userId])).get(userId) ?? []
  }
  async listMilestonesForUsers(userIds: readonly string[]) {
    const wanted = new Set(userIds)
    return groupMilestones(
      this.gamification.events
        .filter(
          (event) =>
            wanted.has(event.userId) &&
            event.audience === 'adult' &&
            ['course_complete', 'course_showcased'].includes(event.sourceType),
        )
        .map((event) => ({
          userId: event.userId,
          courseId: event.sourceId,
          type: event.sourceType,
        })),
    )
  }
  async listGranted(userId: string) {
    return [...(this.grants.get(userId) ?? [])]
  }
  async getReached(userId: string) {
    return this.reached.get(userId) ?? null
  }
  async listCourseGrants(userId: string) {
    return [...(this.courseGrants.get(userId) ?? [])]
  }
  async listReachedForUsers(userIds: readonly string[]) {
    return new Map(
      userIds.flatMap((userId) => {
        const position = this.reached.get(userId)
        return position === undefined ? [] : [[userId, position] as const]
      }),
    )
  }
  async freezeGranted(
    userId: string,
    version: number,
    capabilities: readonly AdultCreatorCapability[],
    _now?: Date,
    reachedPosition: number | null = null,
    courseIds: readonly string[] = [],
  ) {
    if (this.record?.version !== version) return false
    const owned = this.grants.get(userId) ?? new Set<AdultCreatorCapability>()
    for (const capability of capabilities) owned.add(capability)
    this.grants.set(userId, owned)
    this.courseGrants.set(userId, new Set([...(this.courseGrants.get(userId) ?? []), ...courseIds]))
    if (reachedPosition !== null)
      this.reached.set(userId, Math.max(this.reached.get(userId) ?? 1, reachedPosition))
    return true
  }
}
