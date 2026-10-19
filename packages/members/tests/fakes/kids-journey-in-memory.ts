import { initialKidsJourneyPolicy, JOURNEY_COURSE_TIERS, type KidsJourneyEarned } from '@sistemazero/core/journey'
import type { KidsJourneyCatalogCourse, KidsJourneyOwner, KidsJourneyProfileSnapshot, KidsJourneyRepository } from '../../src/domain/ports/kids-journey-repository.port'
import { kidsMilestonesFromEvents, type KidsJourneyEventFact } from '../../src/infrastructure/persistence/drizzle/kids-journey-facts'
import type { InMemoryCourseRepository, InMemoryGamificationRepository } from './in-memory'

/**
 * buildApp owns an already-admitted test cohort with the persisted initial seed.
 * Tests of absent registration/policy use the dedicated query/SQL boundaries instead.
 * Facts use the same ledger adapter; this fixture never calls the previous Kids engine.
 */
export class InMemoryKidsJourneySnapshots implements Pick<KidsJourneyRepository, 'readSnapshot' | 'listOwners'> {
  policy = initialKidsJourneyPolicy()
  version = 1
  snapshotReads = 0
  readonly earned = new Map<string, KidsJourneyEarned>()
  readonly owners = new Map<string, string>()
  readonly unavailableProfiles = new Set<string>()
  constructor(private readonly courses: InMemoryCourseRepository, private readonly gamification: InMemoryGamificationRepository) {}

  async listOwners(profileIds: readonly string[]) {
    return profileIds.flatMap((userId) => {
      const accountId = this.owners.get(userId) ?? this.gamification.accountIds.get(`${userId}:kids`)
      return accountId && !this.unavailableProfiles.has(userId) ? [{ userId, accountId }] : []
    })
  }

  async readSnapshot(inputOwners: readonly KidsJourneyOwner[]) {
    this.snapshotReads++
    const owners = inputOwners.map((owner) => ({ ...owner }))
    const catalog: KidsJourneyCatalogCourse[] = await Promise.all(this.courses.courses.map(async (course) => ({
      id: course.id, level: course.level, track: course.track, audience: course.audience,
      modality: course.modality, status: course.status, graduationOnly: course.level === 'lenda',
      tier: JOURNEY_COURSE_TIERS.find((tier) => tier === `${course.level}-${course.track}`) ?? null,
      slot: course.careerSlot, journeyRole: course.journeyRole,
      hasShowcaseBlock: (await this.courses.listShowcaseLessonIds(course.id)).length > 0,
    })))
    const events: KidsJourneyEventFact[] = this.gamification.events.flatMap((event) =>
      event.audience === 'kids' && (event.sourceType === 'course_complete' || event.sourceType === 'course_showcased')
        ? [{ userId: event.userId, courseId: event.sourceId, sourceType: event.sourceType,
            sourceLevel: event.sourceLevel ?? null, sourceTrack: event.sourceTrack ?? null,
            sourceCareerSlot: event.sourceCareerSlot ?? null }]
        : [],
    )
    const facts = kidsMilestonesFromEvents(events, catalog)
    const profiles = new Map<string, KidsJourneyProfileSnapshot>()
    for (const owner of owners) {
      const account = this.gamification.accountIds.get(`${owner.userId}:kids`)
      if (account && account !== owner.accountId) throw new Error('Fixture profile belongs to another account')
      profiles.set(owner.userId, { ...owner,
        registered: !this.unavailableProfiles.has(owner.userId), milestones: facts.get(owner.userId) ?? [],
        earned: structuredClone(this.earned.get(owner.userId) ?? {
          level: 'noob', capabilities: [], courseAccess: { entry: [], expanded: [], reward: [] },
        }),
      })
    }
    return { policy: { phase: 'published' as const, version: this.version, policy: this.policy, updatedAt: new Date(0) }, catalog, profiles }
  }
}
