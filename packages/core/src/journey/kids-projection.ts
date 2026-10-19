import { JOURNEY_LEVEL_SLUGS, type JourneyCourseLock, type JourneyLevelSlug } from './catalog'
import {
  KIDS_CREATOR_CAPABILITIES,
  type KidsCreatorCapability,
  type KidsJourneyComparisonInput,
  type KidsJourneyCourseFact,
  type KidsJourneyImpact,
  KidsJourneyPolicySchema,
  type KidsJourneyProjectionInput,
  type KidsJourneyView,
  kidsRequirementKey,
  kidsRequirementSatisfied,
} from './kids-policy'
import {
  analyzeKidsJourneyReadiness,
  kidsCourseLockAtLevel,
  kidsFoundationCourse,
  kidsFoundationRequirements,
  kidsRequirementCourseId,
  projectKidsCourseAccess,
} from './kids-validation'

export function projectKidsJourney(input: KidsJourneyProjectionInput): KidsJourneyView {
  const policy = KidsJourneyPolicySchema.parse(input.policy)
  const paused = policy.mode === 'paused'
  const steps = policy.steps
  const floor = JOURNEY_LEVEL_SLUGS.indexOf(input.earned.level)
  let current = Math.max(0, floor)
  const earned = new Set<KidsCreatorCapability>(input.earned.capabilities)
  const readiness = analyzeKidsJourneyReadiness(input)
  let previousComplete = true
  const advances = steps.map((step, index) => {
    const requirements = step.requirements.map((requirement, requirementIndex) => {
      const state = kidsRequirementSatisfied(requirement, input.milestones)
        ? ('satisfied' as const)
        : input.catalog === null ||
            readiness.issues.some(
              (issue) => issue.level === step.level && issue.requirementIndex === requirementIndex,
            )
          ? ('unavailable' as const)
          : ('pending' as const)
      return {
        requirement,
        state,
        resolvedCourseId:
          state === 'unavailable' ? null : kidsRequirementCourseId(requirement, input.catalog),
      }
    })
    const alreadyEarned = index + 1 <= floor
    const available = alreadyEarned || (!paused && previousComplete)
    const completed =
      alreadyEarned ||
      (!paused &&
        available &&
        requirements.every((requirement) => requirement.state === 'satisfied'))
    if (completed) {
      current = index + 1
      if (!paused) for (const capability of step.capabilities) earned.add(capability)
    }
    previousComplete = completed
    return {
      level: step.level,
      earned: completed,
      available,
      requirements,
      capabilities: [...step.capabilities],
    }
  })
  const level = JOURNEY_LEVEL_SLUGS[current]!
  const nextLevel = JOURNEY_LEVEL_SLUGS[current + 1] ?? null
  const next = advances.find((advance) => advance.level === nextLevel)
  return {
    audience: 'kids',
    policyVersion: input.policyVersion,
    mode: policy.mode,
    tierAccess: policy.tierAccess.map((rule) => ({ ...rule, foundation: { ...rule.foundation } })),
    earned: {
      level,
      capabilities: KIDS_CREATOR_CAPABILITIES.filter((capability) => earned.has(capability)),
      courseAccess: projectKidsCourseAccess(
        policy,
        level,
        input.milestones,
        input.catalog,
        input.earned.courseAccess,
      ),
    },
    nextLevel,
    missing:
      next?.requirements
        .filter((requirement) => requirement.state !== 'satisfied')
        .map((requirement) => requirement.requirement) ?? [],
    advances,
    readiness,
  }
}

/** One projection/readiness pass for a catalog batch, shared with the single-course resolver. */
export function resolveKidsJourneyCourseLocks(
  input: Omit<KidsJourneyProjectionInput, 'catalog'> & {
    catalog: readonly KidsJourneyCourseFact[]
    courses: readonly KidsJourneyCourseFact[]
  },
): Map<string, JourneyCourseLock> {
  if (input.catalog === null) throw new Error('O catálogo da jornada está indisponível.')
  const policy = KidsJourneyPolicySchema.parse(input.policy)
  const view = projectKidsJourney({ ...input, policy })
  const foundations = new Map<string, { available: boolean; satisfied: boolean }>()
  return new Map(
    input.courses.map((course): [string, JourneyCourseLock] => {
      if (
        course.audience !== 'kids' ||
        course.modality !== 'recorded' ||
        course.graduationOnly ||
        !course.tier
      )
        return [course.id, { locked: false }]
      let foundation = foundations.get(course.tier)
      if (!foundation) {
        const base = kidsFoundationCourse(input.catalog, course.tier)
        foundation = {
          available: Boolean(base),
          satisfied: base
            ? kidsFoundationRequirements(policy, base).every((requirement) =>
                kidsRequirementSatisfied(requirement, input.milestones),
              )
            : false,
        }
        foundations.set(course.tier, foundation)
      }
      return [
        course.id,
        kidsCourseLockAtLevel(
          policy,
          view.earned.level,
          course,
          foundation.available,
          foundation.satisfied,
          view.earned.courseAccess,
        ),
      ]
    }),
  )
}

export function resolveKidsJourneyCourseLock(
  input: Omit<KidsJourneyProjectionInput, 'catalog'> & {
    catalog: readonly KidsJourneyCourseFact[]
    course: KidsJourneyCourseFact
  },
): JourneyCourseLock {
  return resolveKidsJourneyCourseLocks({ ...input, courses: [input.course] }).get(input.course.id)!
}

/** A read-only preview carries the current policy's virtual baseline into the proposed one. */
export function compareKidsJourney(input: KidsJourneyComparisonInput): KidsJourneyImpact {
  const before = projectKidsJourney(input)
  const after = projectKidsJourney({
    ...input,
    policy: input.proposedPolicy,
    earned: before.earned,
  })
  const previous = input.policy.steps
  const proposed = input.proposedPolicy.steps
  const changes = JOURNEY_LEVEL_SLUGS.slice(1)
    .map((level) => {
      const old = previous.find((step) => step.level === level)
      const next = proposed.find((step) => step.level === level)
      const oldRequirements = new Map(
        old?.requirements.map((requirement) => [kidsRequirementKey(requirement), requirement]),
      )
      const newRequirements = new Map(
        next?.requirements.map((requirement) => [kidsRequirementKey(requirement), requirement]),
      )
      return {
        level: level as Exclude<JourneyLevelSlug, 'noob'>,
        requirementsAdded: [...newRequirements]
          .filter(([key]) => !oldRequirements.has(key))
          .map(([, requirement]) => requirement),
        requirementsRemoved: [...oldRequirements]
          .filter(([key]) => !newRequirements.has(key))
          .map(([, requirement]) => requirement),
        requirementsChanged: [...oldRequirements].flatMap(([key, requirement]) => {
          const updated = newRequirements.get(key)
          return updated && updated.milestone !== requirement.milestone
            ? [{ before: requirement, after: updated }]
            : []
        }),
        capabilitiesAdded:
          next?.capabilities.filter((capability) => !old?.capabilities.includes(capability)) ?? [],
        capabilitiesRemoved:
          old?.capabilities.filter((capability) => !next?.capabilities.includes(capability)) ?? [],
      }
    })
    .filter(
      (change) =>
        change.requirementsAdded.length ||
        change.requirementsRemoved.length ||
        change.requirementsChanged.length ||
        change.capabilitiesAdded.length ||
        change.capabilitiesRemoved.length,
    )
  return {
    baseVersion: input.policyVersion,
    before,
    after,
    changes,
    preservedCapabilities: before.earned.capabilities.filter((capability) =>
      after.earned.capabilities.includes(capability),
    ),
    tierAccessChanges: input.policy.tierAccess.flatMap((previous) => {
      const proposed = input.proposedPolicy.tierAccess.find((rule) => rule.tier === previous.tier)!
      return previous.opensAt !== proposed.opensAt ||
        previous.completedAt !== proposed.completedAt ||
        previous.foundation.milestone !== proposed.foundation.milestone ||
        previous.foundation.whenMissing !== proposed.foundation.whenMissing
        ? [{ before: previous, after: proposed }]
        : []
    }),
    preservedCourseAccess: before.earned.courseAccess,
  }
}
