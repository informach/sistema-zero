import { IdentityUuidSchema } from '@sistemazero/core/identity'
import {
  analyzeKidsJourneyReadiness,
  KIDS_CREATOR_CAPABILITIES,
  type KidsCourseMilestone,
  type KidsJourneyStaffPreview,
  type KidsJourneyView,
  projectKidsJourney,
  resolveKidsJourneyCourseLocks,
  withCreatorMasteryDefinitions,
} from '@sistemazero/core/journey'
import {
  KidsJourneyInitializingError,
  KidsJourneyUnavailableError,
} from '../../domain/kids-journey/kids-journey.errors'
import type {
  KidsJourneyOwner,
  KidsJourneyPolicyRecord,
  KidsJourneyRepository,
} from '../../domain/ports/kids-journey-repository.port'
import { creatorCourseContexts } from '../creator-journey/course-context'
import {
  type MasteryJourneyFactsReader,
  noMasteryJourneyFacts,
} from '../creator-journey/mastery-journey-facts'

function assertPublished(policy: KidsJourneyPolicyRecord): void {
  if (policy.phase === 'initializing' && policy.version === 0)
    throw new KidsJourneyInitializingError()
  if (policy.phase !== 'published' || !Number.isInteger(policy.version) || policy.version < 1)
    throw new KidsJourneyUnavailableError()
}

export interface KidsJourneyProfileState {
  journey: KidsJourneyView
  milestones: readonly KidsCourseMilestone[]
}

/**
 * Normal readers require a materialized Members registry row. Preview/bootstrap may simulate a
 * new learner separately, but a missing row must never look like a child lost their earned rank.
 */
export class KidsJourneyQueryService {
  constructor(
    private readonly journey: Pick<KidsJourneyRepository, 'readSnapshot'>,
    private readonly readMasteryFacts: MasteryJourneyFactsReader = noMasteryJourneyFacts,
  ) {}

  /** Explicit read-only team inspection. No child/rank/progress/earned simulation or persistence. */
  async staffPreview(): Promise<KidsJourneyStaffPreview> {
    const snapshot = await this.journey.readSnapshot([])
    assertPublished(snapshot.policy)
    return {
      audience: 'kids' as const,
      kind: 'staff-preview' as const,
      policyVersion: snapshot.policy.version,
      mode: snapshot.policy.policy.mode,
      tierAccess: snapshot.policy.policy.tierAccess.map((rule) => ({
        ...rule,
        foundation: { ...rule.foundation },
      })),
      capabilities: [...KIDS_CREATOR_CAPABILITIES],
      readiness: analyzeKidsJourneyReadiness({
        policy: snapshot.policy.policy,
        catalog: snapshot.catalog,
      }),
    }
  }

  async get(owner: KidsJourneyOwner): Promise<KidsJourneyView> {
    const captured = {
      userId: IdentityUuidSchema.parse(owner.userId),
      accountId: IdentityUuidSchema.parse(owner.accountId),
    }
    const views = await this.getMany([captured])
    const view = views.get(captured.userId)
    if (!view) throw new KidsJourneyUnavailableError()
    return view
  }

  async getMany(
    inputOwners: readonly KidsJourneyOwner[],
  ): Promise<ReadonlyMap<string, KidsJourneyView>> {
    const states = await this.getManyStates(inputOwners)
    return new Map([...states].map(([id, state]) => [id, state.journey]))
  }

  /** Trusted batch consumers also need the ledger identity when explaining pending publications. */
  async getManyStates(
    inputOwners: readonly KidsJourneyOwner[],
  ): Promise<ReadonlyMap<string, KidsJourneyProfileState>> {
    const owners = inputOwners.map((owner) => ({
      userId: IdentityUuidSchema.parse(owner.userId),
      accountId: IdentityUuidSchema.parse(owner.accountId),
    }))
    const snapshot = await this.journey.readSnapshot(owners)
    assertPublished(snapshot.policy)
    const views = new Map<string, KidsJourneyProfileState>()
    for (const owner of owners) {
      const profile = snapshot.profiles.get(owner.userId)
      if (
        !profile?.registered ||
        profile.userId !== owner.userId ||
        profile.accountId !== owner.accountId
      )
        throw new KidsJourneyUnavailableError()
      views.set(owner.userId, {
        journey: projectKidsJourney({
          policy: snapshot.policy.policy,
          policyVersion: snapshot.policy.version,
          catalog: snapshot.catalog,
          milestones: profile.milestones,
          earned: profile.earned,
          ...(profile.masteryFacts ??
            (snapshot.policy.policy.curriculum
              ? await this.readMasteryFacts({ ...owner, audience: 'kids' })
              : await noMasteryJourneyFacts({ ...owner, audience: 'kids' }))),
        }),
        milestones: profile.milestones.map((milestone) => ({ ...milestone })),
      })
    }
    return views
  }

  async courseLocks(inputOwner: KidsJourneyOwner, inputCourseIds: readonly string[]) {
    return (await this.courseState(inputOwner, inputCourseIds)).locks
  }

  async masteryContext(inputOwner: KidsJourneyOwner) {
    const owner = {
      userId: IdentityUuidSchema.parse(inputOwner.userId),
      accountId: IdentityUuidSchema.parse(inputOwner.accountId),
    }
    const snapshot = await this.journey.readSnapshot([owner])
    assertPublished(snapshot.policy)
    const profile = snapshot.profiles.get(owner.userId)
    if (!profile?.registered || profile.accountId !== owner.accountId)
      throw new KidsJourneyUnavailableError()
    const masteryFacts =
      profile.masteryFacts ??
      (snapshot.policy.policy.curriculum
        ? await this.readMasteryFacts({ ...owner, audience: 'kids' })
        : await noMasteryJourneyFacts({ ...owner, audience: 'kids' }))
    const view = projectKidsJourney({
      policy: snapshot.policy.policy,
      policyVersion: snapshot.policy.version,
      catalog: snapshot.catalog,
      milestones: profile.milestones,
      earned: profile.earned,
      ...masteryFacts,
    })
    return {
      policyVersion: snapshot.policy.version,
      paused: snapshot.policy.policy.mode === 'paused',
      curriculum: snapshot.policy.policy.curriculum
        ? withCreatorMasteryDefinitions(
            snapshot.policy.policy.curriculum,
            masteryFacts.masteryDefinitions,
          )
        : null,
      catalog: snapshot.catalog,
      view: view.curriculum ?? null,
      milestones: profile.milestones,
    }
  }

  async courseState(inputOwner: KidsJourneyOwner, inputCourseIds: readonly string[]) {
    const owner = {
      userId: IdentityUuidSchema.parse(inputOwner.userId),
      accountId: IdentityUuidSchema.parse(inputOwner.accountId),
    }
    const courseIds = inputCourseIds.map((id) => IdentityUuidSchema.parse(id))
    const snapshot = await this.journey.readSnapshot([owner])
    assertPublished(snapshot.policy)
    const profile = snapshot.profiles.get(owner.userId)
    if (
      !profile?.registered ||
      profile.userId !== owner.userId ||
      profile.accountId !== owner.accountId
    )
      throw new KidsJourneyUnavailableError()
    const byId = new Map(snapshot.catalog.map((course) => [course.id, course]))
    const courses = courseIds.map((id) => {
      const course = byId.get(id)
      if (!course) throw new KidsJourneyUnavailableError()
      return course
    })
    const masteryFacts =
      profile.masteryFacts ??
      (snapshot.policy.policy.curriculum
        ? await this.readMasteryFacts({ ...owner, audience: 'kids' })
        : await noMasteryJourneyFacts({ ...owner, audience: 'kids' }))
    const curriculum = snapshot.policy.policy.curriculum
      ? withCreatorMasteryDefinitions(
          snapshot.policy.policy.curriculum,
          masteryFacts.masteryDefinitions,
        )
      : undefined
    return {
      curriculum,
      courseContexts: creatorCourseContexts(curriculum),
      locks: resolveKidsJourneyCourseLocks({
        policy: snapshot.policy.policy,
        policyVersion: snapshot.policy.version,
        catalog: snapshot.catalog,
        milestones: profile.milestones,
        earned: profile.earned,
        ...masteryFacts,
        courses,
      }),
      milestones: new Map(
        profile.milestones.map((fact) => [
          fact.courseId,
          {
            completed: fact.completed,
            showcased: fact.showcased,
          },
        ]),
      ),
    }
  }
}
