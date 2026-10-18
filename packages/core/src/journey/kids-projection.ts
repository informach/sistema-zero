import {
  creatorJourneyLevel,
  JOURNEY_LEVEL_SLUGS,
  type JourneyCourseLock,
  type JourneyCourseTier,
  type JourneyLevelSlug,
  resolveJourneyCourseLock,
} from './catalog'
import {
  KIDS_CREATOR_CAPABILITIES,
  type KidsCreatorCapability,
  type KidsJourneyComparisonInput,
  type KidsJourneyCourseFact,
  type KidsJourneyImpact,
  KidsJourneyPolicySchema,
  type KidsJourneyProjectionInput,
  type KidsJourneyView,
  kidsJourneySteps,
  kidsRequirementKey,
  kidsRequirementSatisfied,
} from './kids-policy'
import {
  analyzeKidsJourneyReadiness,
  kidsCourseLockAtLevel,
  kidsFoundationRequirements,
} from './kids-validation'

export function projectKidsJourney(input: KidsJourneyProjectionInput): KidsJourneyView {
  const policy = KidsJourneyPolicySchema.parse(input.policy)
  const steps = kidsJourneySteps(policy)
  const floor = JOURNEY_LEVEL_SLUGS.indexOf(input.earned.level)
  let current = Math.max(0, floor)
  const earned = new Set<KidsCreatorCapability>(input.earned.capabilities)
  const readiness = analyzeKidsJourneyReadiness(input)
  let previousComplete = true
  const advances = steps.map((step, index) => {
    const requirements = step.requirements.map((requirement, requirementIndex) => ({
      requirement,
      state: kidsRequirementSatisfied(requirement, input.milestones)
        ? ('satisfied' as const)
        : input.catalog === null ||
            readiness.issues.some(
              (issue) => issue.level === step.level && issue.requirementIndex === requirementIndex,
            )
          ? ('unavailable' as const)
          : ('pending' as const),
    }))
    const alreadyEarned = index + 1 <= floor
    const available = alreadyEarned || previousComplete
    const completed =
      alreadyEarned ||
      (available && requirements.every((requirement) => requirement.state === 'satisfied'))
    if (completed) {
      current = index + 1
      for (const capability of step.capabilities) earned.add(capability)
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
    earned: {
      level,
      capabilities: KIDS_CREATOR_CAPABILITIES.filter((capability) => earned.has(capability)),
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

export function resolveKidsJourneyCourseLock(
  input: Omit<KidsJourneyProjectionInput, 'catalog'> & {
    catalog: readonly KidsJourneyCourseFact[]
    course: KidsJourneyCourseFact
  },
): JourneyCourseLock {
  if (input.catalog === null) throw new Error('O catálogo da jornada está indisponível.')
  if (
    input.course.audience !== 'kids' ||
    input.course.modality !== 'recorded' ||
    !input.course.tier
  )
    return { locked: false }
  const view = projectKidsJourney(input)
  const foundation = input.catalog.find(
    (course) =>
      course.audience === 'kids' &&
      course.modality === 'recorded' &&
      course.status === 'published' &&
      course.tier === input.course.tier &&
      course.slot === 1,
  )
  if (input.policy.mode === 'legacy') {
    const qualified: Partial<Record<JourneyCourseTier, number[]>> = {}
    for (const milestone of input.milestones) {
      if (
        milestone.completed &&
        milestone.showcased &&
        milestone.qualifiedTier &&
        milestone.qualifiedSlot !== null
      ) {
        qualified[milestone.qualifiedTier] ??= []
        qualified[milestone.qualifiedTier]!.push(milestone.qualifiedSlot)
      }
    }
    // A materialized rank remains a floor when historical catalog metadata is gone.
    const floor = creatorJourneyLevel(input.earned.level).requiredSlots
    for (const [tier, slots] of Object.entries(floor)) {
      const key = tier as JourneyCourseTier
      qualified[key] ??= []
      qualified[key]!.push(...slots)
    }
    return resolveJourneyCourseLock(
      qualified,
      input.course.tier,
      input.course.slot,
      Boolean(foundation),
      input.course.journeyRole,
    )
  }
  const satisfied = foundation
    ? kidsFoundationRequirements(input.policy, foundation).every((requirement) =>
        kidsRequirementSatisfied(requirement, input.milestones),
      )
    : false
  return kidsCourseLockAtLevel(view.earned.level, input.course, Boolean(foundation), satisfied)
}

/** A read-only preview carries the current policy's virtual baseline into the proposed one. */
export function compareKidsJourney(input: KidsJourneyComparisonInput): KidsJourneyImpact {
  const before = projectKidsJourney(input)
  const after = projectKidsJourney({
    ...input,
    policy: input.proposedPolicy,
    earned: before.earned,
  })
  const previous = kidsJourneySteps(input.policy)
  const proposed = kidsJourneySteps(input.proposedPolicy)
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
  }
}
