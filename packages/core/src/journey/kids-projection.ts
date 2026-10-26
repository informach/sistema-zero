import { JOURNEY_LEVEL_SLUGS, type JourneyCourseLock, type JourneyLevelSlug } from './catalog'
import {
  creatorJourneyOpenCourseIds,
  projectCreatorJourney,
  resolveCreatorJourneyCourseLock,
} from './creator-curriculum'
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
  if (policy.curriculum) {
    const curriculum = projectCreatorJourney({
      curriculum: policy.curriculum,
      audience: 'kids',
      catalog: input.catalog,
      completedCourseIds: input.milestones.filter((m) => m.completed).map((m) => m.courseId),
      earnedLevel: input.earned.level,
      earnedCapabilities: input.earned.capabilities,
      retainedCourseIds: input.earned.courseAccess.creatorCourseIds,
      paused: policy.mode === 'paused',
      masteryApprovals: input.masteryApprovals,
      masteryAwards: input.masteryAwards,
      masteryAdmissions: input.masteryAdmissions,
      masteryDefinitions: input.masteryDefinitions,
    })
    const advances = curriculum.stages.map((stage, index) => ({
      level: JOURNEY_LEVEL_SLUGS[index + 1] as Exclude<JourneyLevelSlug, 'noob'>,
      earned: stage.completed,
      available: stage.available,
      requirements: [stage.base2d, stage.base3d, stage.mission].map((entry) => ({
        requirement: {
          kind: 'course' as const,
          courseId: entry.courseId,
          milestone: 'complete' as const,
        },
        state:
          entry.state === 'completed'
            ? ('satisfied' as const)
            : entry.state === 'unavailable'
              ? ('unavailable' as const)
              : ('pending' as const),
        resolvedCourseId: entry.state === 'unavailable' ? null : entry.courseId,
      })),
      capabilities: [
        ...new Set(policy.curriculum!.stages[index]!.grants.flatMap((grant) => grant.capabilities)),
      ],
    }))
    return {
      audience: 'kids',
      policyVersion: input.policyVersion,
      mode: policy.mode,
      tierAccess: policy.tierAccess,
      earned: {
        level: curriculum.level,
        capabilities: curriculum.capabilities,
        courseAccess: {
          ...input.earned.courseAccess,
          creatorCourseIds: creatorJourneyOpenCourseIds(policy.curriculum, curriculum),
        },
      },
      nextLevel: curriculum.nextLevel,
      missing:
        advances
          .find((advance) => advance.level === curriculum.nextLevel)
          ?.requirements.filter((r) => r.state !== 'satisfied')
          .map((r) => r.requirement) ?? [],
      advances,
      readiness: analyzeKidsJourneyReadiness(input),
      curriculum,
    }
  }
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
  if (policy.curriculum && view.curriculum) {
    return new Map(
      input.courses.map((course) => {
        // Rights already frozen under the old policy remain valid for their original catalog slot.
        const historical =
          course.tier &&
          ((course.slot !== null && input.earned.courseAccess.expanded.includes(course.tier)) ||
            (course.slot === 1 && input.earned.courseAccess.entry.includes(course.tier)) ||
            (course.slot === null && input.earned.courseAccess.reward.includes(course.tier)))
        return [
          course.id,
          historical
            ? { locked: false }
            : resolveCreatorJourneyCourseLock({
                curriculum: policy.curriculum!,
                view: view.curriculum!,
                courseId: course.id,
              }),
        ]
      }),
    )
  }
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

/** Snapshot the outgoing catalog's actual course rights before a policy change, never licenses. */
export function kidsJourneyOpenCourseIds(input: KidsJourneyProjectionInput): string[] {
  const retained = input.earned.courseAccess.creatorCourseIds ?? []
  if (input.catalog === null) return [...retained]
  const courses = input.catalog.filter(
    (course) =>
      course.audience === 'kids' && course.modality === 'recorded' && course.status !== 'draft',
  )
  const locks = resolveKidsJourneyCourseLocks({ ...input, catalog: input.catalog, courses })
  return [
    ...new Set([
      ...retained,
      ...courses.filter((course) => !locks.get(course.id)!.locked).map((course) => course.id),
    ]),
  ]
}

/** A read-only preview carries the current policy's virtual baseline into the proposed one. */
export function compareKidsJourney(input: KidsJourneyComparisonInput): KidsJourneyImpact {
  let before = projectKidsJourney(input)
  if (!input.policy.curriculum && input.proposedPolicy.curriculum) {
    before = {
      ...before,
      earned: {
        ...before.earned,
        courseAccess: {
          ...before.earned.courseAccess,
          creatorCourseIds: kidsJourneyOpenCourseIds(input),
        },
      },
    }
  }
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
    ...(input.policy.curriculum || input.proposedPolicy.curriculum
      ? {
          curriculumChanged:
            JSON.stringify(input.policy.curriculum) !==
            JSON.stringify(input.proposedPolicy.curriculum),
        }
      : {}),
  }
}
