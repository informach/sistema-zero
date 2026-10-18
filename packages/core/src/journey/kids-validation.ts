import {
  creatorJourneyLevel,
  JOURNEY_COURSE_TIERS,
  JOURNEY_LEVEL_SLUGS,
  type JourneyCourseLock,
  type JourneyLevelSlug,
} from './catalog'
import {
  type KidsJourneyCourseFact,
  type KidsJourneyIssue,
  type KidsJourneyPolicy,
  KidsJourneyPolicySchema,
  type KidsJourneyPolicyValidation,
  type KidsJourneyReadiness,
  type KidsJourneyReadinessInput,
  type KidsRequirement,
  kidsJourneySteps,
} from './kids-policy'

export function validateKidsJourneyPolicy(input: unknown): KidsJourneyPolicyValidation {
  const parsed = KidsJourneyPolicySchema.safeParse(input)
  if (parsed.success) return { success: true, policy: parsed.data }
  return {
    success: false,
    issues: parsed.error.issues.map((issue) => {
      const index =
        issue.path[0] === 'steps' && typeof issue.path[1] === 'number' ? issue.path[1] : -1
      return {
        code: 'invalid-policy',
        level: index >= 0 ? (JOURNEY_LEVEL_SLUGS[index + 1] ?? null) : null,
        requirementIndex:
          issue.path[2] === 'requirements' && typeof issue.path[3] === 'number'
            ? issue.path[3]
            : null,
        severity: 'error',
        message: issue.message,
      }
    }),
  }
}

export function kidsFoundationRequirements(
  policy: KidsJourneyPolicy,
  foundation: KidsJourneyCourseFact,
): readonly KidsRequirement[] {
  const advance = kidsJourneySteps(policy).find(
    (step) =>
      creatorJourneyLevel(JOURNEY_LEVEL_SLUGS[JOURNEY_LEVEL_SLUGS.indexOf(step.level) - 1])
        .learningTier === foundation.tier,
  )
  const requirements =
    advance?.requirements.filter((requirement) =>
      requirement.kind === 'course'
        ? requirement.courseId === foundation.id
        : requirement.tier === foundation.tier && requirement.slot === 1,
    ) ?? []
  if (requirements.length > 0) return requirements
  return foundation.tier
    ? [{ kind: 'slot', tier: foundation.tier, slot: 1, milestone: 'showcase' }]
    : [{ kind: 'course', courseId: foundation.id, milestone: 'showcase' }]
}

/** Shared rank/base gate for configured projection and catalog readiness. No commercial checks. */
export function kidsCourseLockAtLevel(
  level: JourneyLevelSlug,
  course: KidsJourneyCourseFact,
  foundationAvailable: boolean,
  foundationSatisfied: boolean,
): JourneyCourseLock {
  if (!course.tier || course.journeyRole === 'extra') return { locked: false }
  const learningTier = creatorJourneyLevel(level).learningTier
  if (learningTier === null) return { locked: false }
  const courseIndex = JOURNEY_COURSE_TIERS.indexOf(course.tier)
  const learningIndex = JOURNEY_COURSE_TIERS.indexOf(learningTier)
  if (courseIndex < learningIndex) return { locked: false }
  if (course.slot === null) {
    if (!foundationAvailable) return { locked: false }
    return {
      locked: true,
      reason: 'tier-reward',
      requiredLevel: JOURNEY_LEVEL_SLUGS[courseIndex + 1],
      requiredTier: course.tier,
    }
  }
  if (courseIndex > learningIndex)
    return {
      locked: true,
      reason: 'future-tier',
      requiredLevel: JOURNEY_LEVEL_SLUGS[courseIndex],
      requiredTier: course.tier,
    }
  if (course.slot === 1 || foundationSatisfied || !foundationAvailable) return { locked: false }
  return { locked: true, reason: 'foundation-first', requiredTier: course.tier }
}

function requirementCourses(
  requirement: KidsRequirement,
  catalog: readonly KidsJourneyCourseFact[],
): readonly KidsJourneyCourseFact[] {
  return catalog.filter((course) =>
    requirement.kind === 'course'
      ? course.id === requirement.courseId
      : course.audience === 'kids' &&
        course.modality === 'recorded' &&
        course.tier === requirement.tier &&
        course.slot === requirement.slot,
  )
}

function courseIssue(
  course: KidsJourneyCourseFact,
  requirement: KidsRequirement,
  policy: KidsJourneyPolicy,
  level: JourneyLevelSlug,
  catalog: readonly KidsJourneyCourseFact[],
): Pick<KidsJourneyIssue, 'code' | 'message'> | null {
  if (course.audience !== 'kids' || course.modality !== 'recorded')
    return { code: 'course-ineligible', message: 'Escolha um curso Kids gravado.' }
  if (course.status !== 'published')
    return { code: 'course-unpublished', message: 'O curso não está publicado no catálogo.' }
  const foundation = catalog.find(
    (candidate) =>
      candidate.audience === 'kids' &&
      candidate.modality === 'recorded' &&
      candidate.status === 'published' &&
      candidate.tier === course.tier &&
      candidate.slot === 1,
  )
  const lock = kidsCourseLockAtLevel(level, course, Boolean(foundation), true)
  if (lock.locked)
    return {
      code: 'course-locked',
      message: 'O curso depende de um posto que este avanço ainda não conquistou.',
    }
  if (
    course.slot !== null &&
    course.slot !== 1 &&
    course.journeyRole !== 'extra' &&
    foundation &&
    kidsFoundationRequirements(policy, foundation).some(
      (required) => required.milestone === 'showcase',
    ) &&
    foundation.hasShowcaseBlock !== true
  )
    return foundation.hasShowcaseBlock === null
      ? {
          code: 'foundation-unavailable',
          message: 'Não foi possível conferir a vitrine do curso-base.',
        }
      : {
          code: 'foundation-unreachable',
          message: 'O curso-base precisa de uma vitrine alcançável para abrir esta aventura.',
        }
  if (requirement.milestone === 'showcase' && course.hasShowcaseBlock !== true)
    return course.hasShowcaseBlock === null
      ? { code: 'showcase-unavailable', message: 'Não foi possível conferir a vitrine do curso.' }
      : {
          code: 'showcase-missing',
          message: 'O marco de publicação exige uma vitrine em aula publicada.',
        }
  return null
}

export function analyzeKidsJourneyReadiness(
  input: KidsJourneyReadinessInput,
): KidsJourneyReadiness {
  const policy = KidsJourneyPolicySchema.parse(input.policy)
  if (policy.mode === 'paused') return { status: 'ready', horizon: null, issues: [] }
  if (input.catalog === null)
    return {
      status: 'unavailable',
      horizon: null,
      issues: [
        {
          code: 'catalog-unavailable',
          level: null,
          requirementIndex: null,
          severity: 'unavailable',
          message: 'Não foi possível conferir o catálogo.',
        },
      ],
    }
  const catalog = input.catalog
  const issues: KidsJourneyIssue[] = []
  let horizon: JourneyLevelSlug = 'noob'
  let previousReady = true
  kidsJourneySteps(policy).forEach((step, stepIndex) => {
    let ready = true
    step.requirements.forEach((requirement, requirementIndex) => {
      const candidates = requirementCourses(requirement, catalog)
      const problems = candidates.map((course) =>
        courseIssue(course, requirement, policy, JOURNEY_LEVEL_SLUGS[stepIndex]!, catalog),
      )
      if (problems.includes(null)) return
      ready = false
      const problem = problems[0] ?? {
        code: 'course-missing' as const,
        message: 'Não há curso disponível para este requisito.',
      }
      issues.push({
        ...problem,
        level: step.level,
        requirementIndex,
        severity:
          problem.code === 'showcase-unavailable' || problem.code === 'foundation-unavailable'
            ? 'unavailable'
            : problem.code === 'course-locked' || requirement.kind === 'course'
              ? 'error'
              : 'warning',
      })
    })
    previousReady &&= ready
    if (previousReady) horizon = step.level
  })
  return {
    status: issues.some((issue) => issue.severity === 'unavailable')
      ? 'unavailable'
      : issues.length
        ? 'incomplete'
        : 'ready',
    horizon,
    issues,
  }
}
