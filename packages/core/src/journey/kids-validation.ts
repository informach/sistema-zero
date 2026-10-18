import {
  JOURNEY_COURSE_TIERS,
  JOURNEY_LEVEL_SLUGS,
  type JourneyCourseLock,
  type JourneyLevelSlug,
  journeyLevelAtLeast,
} from './catalog'
import {
  type KidsCourseMilestone,
  type KidsJourneyCourseAccess,
  type KidsJourneyCourseFact,
  type KidsJourneyIssue,
  type KidsJourneyPolicy,
  KidsJourneyPolicySchema,
  type KidsJourneyPolicyValidation,
  type KidsJourneyReadiness,
  type KidsJourneyReadinessInput,
  type KidsRequirement,
  type KidsTierAccess,
  kidsRequirementSatisfied,
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
  if (!foundation.tier) return []
  const rule = policy.tierAccess.find((access) => access.tier === foundation.tier)!
  return [
    {
      kind: 'slot',
      tier: rule.tier,
      slot: rule.foundation.slot,
      milestone: rule.foundation.milestone,
    },
  ]
}

export function kidsFoundationCourse(
  catalog: readonly KidsJourneyCourseFact[],
  tier: (typeof JOURNEY_COURSE_TIERS)[number],
): KidsJourneyCourseFact | undefined {
  return catalog.find(
    (course) =>
      course.audience === 'kids' &&
      course.modality === 'recorded' &&
      course.status === 'published' &&
      course.tier === tier &&
      course.slot === 1,
  )
}

/** One eligibility calculation for authorization and monotonic materialization. */
function tierEligibility(
  rule: KidsTierAccess,
  level: JourneyLevelSlug,
  foundationAvailable: boolean | null,
  foundationSatisfied: boolean,
  earned?: KidsJourneyCourseAccess,
) {
  const completed = journeyLevelAtLeast(level, rule.completedAt)
  const entry =
    Boolean(earned?.entry.includes(rule.tier) || earned?.expanded.includes(rule.tier)) ||
    journeyLevelAtLeast(level, rule.opensAt)
  const missingOpen = foundationAvailable === false && rule.foundation.whenMissing === 'open'
  return {
    entry,
    expanded:
      Boolean(earned?.expanded.includes(rule.tier)) ||
      completed ||
      (entry && (foundationSatisfied || missingOpen)),
    reward: Boolean(earned?.reward.includes(rule.tier)) || completed || missingOpen,
  }
}

/** Shared policy/base gate for projection and readiness. No commercial checks. */
export function kidsCourseLockAtLevel(
  policy: KidsJourneyPolicy,
  level: JourneyLevelSlug,
  course: KidsJourneyCourseFact,
  foundationAvailable: boolean,
  foundationSatisfied: boolean,
  access?: KidsJourneyCourseAccess,
): JourneyCourseLock {
  if (!course.tier || course.journeyRole === 'extra' || course.graduationOnly)
    return { locked: false }
  const rule = policy.tierAccess.find((candidate) => candidate.tier === course.tier)!
  const eligible = tierEligibility(rule, level, foundationAvailable, foundationSatisfied, access)
  if (course.slot === null) {
    if (eligible.reward) return { locked: false }
    return {
      locked: true,
      reason: 'tier-reward',
      requiredLevel: rule.completedAt,
      requiredTier: course.tier,
    }
  }
  if (!eligible.entry)
    return {
      locked: true,
      reason: 'future-tier',
      requiredLevel: rule.opensAt,
      requiredTier: course.tier,
    }
  if (course.slot === 1 || eligible.expanded) return { locked: false }
  return { locked: true, reason: 'foundation-first', requiredTier: course.tier }
}

/** Bounded monotonic pedagogical rights; unknown catalog cannot grant missing-base rights. */
export function projectKidsCourseAccess(
  policy: KidsJourneyPolicy,
  level: JourneyLevelSlug,
  milestones: readonly KidsCourseMilestone[],
  catalog: readonly KidsJourneyCourseFact[] | null,
  earned: KidsJourneyCourseAccess,
): KidsJourneyCourseAccess {
  const entry = new Set(earned.entry)
  const expanded = new Set(earned.expanded)
  const reward = new Set(earned.reward)
  for (const tier of expanded) entry.add(tier)
  for (const rule of policy.tierAccess) {
    const foundation = catalog === null ? undefined : kidsFoundationCourse(catalog, rule.tier)
    const satisfied =
      foundation !== undefined &&
      kidsFoundationRequirements(policy, foundation).every((requirement) =>
        kidsRequirementSatisfied(requirement, milestones),
      )
    const eligible = tierEligibility(
      rule,
      level,
      catalog === null ? null : Boolean(foundation),
      satisfied,
      earned,
    )
    if (eligible.entry) entry.add(rule.tier)
    if (eligible.expanded) expanded.add(rule.tier)
    if (eligible.reward) reward.add(rule.tier)
  }
  return {
    entry: JOURNEY_COURSE_TIERS.filter((tier) => entry.has(tier)),
    expanded: JOURNEY_COURSE_TIERS.filter((tier) => expanded.has(tier)),
    reward: JOURNEY_COURSE_TIERS.filter((tier) => reward.has(tier)),
  }
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
  if (course.graduationOnly)
    return {
      code: 'course-graduation-only',
      message:
        'O curso de formatura é oferecido no topo e não pode ser requisito para chegar até ele.',
    }
  if (course.status !== 'published')
    return { code: 'course-unpublished', message: 'O curso não está publicado no catálogo.' }
  const foundation = course.tier ? kidsFoundationCourse(catalog, course.tier) : undefined
  const lock = kidsCourseLockAtLevel(policy, level, course, Boolean(foundation), true)
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
    course.tier &&
    !journeyLevelAtLeast(
      level,
      policy.tierAccess.find((rule) => rule.tier === course.tier)!.completedAt,
    ) &&
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
  if (
    course.slot !== null &&
    course.slot !== 1 &&
    course.journeyRole !== 'extra' &&
    !foundation &&
    kidsCourseLockAtLevel(policy, level, course, false, false).locked
  )
    return {
      code: 'foundation-unreachable',
      message: 'A regra exige um curso-base que não está disponível.',
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
  policy.steps.forEach((step, stepIndex) => {
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
            : problem.code === 'course-locked' ||
                problem.code === 'foundation-unreachable' ||
                requirement.kind === 'course'
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
