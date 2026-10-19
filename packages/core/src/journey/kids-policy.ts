import { z } from 'zod'
import { IdentityUuidSchema } from '../identity'
import {
  type COURSE_JOURNEY_ROLES,
  JOURNEY_COURSE_TIERS,
  JOURNEY_LEVEL_SLUGS,
  type JourneyCourseTier,
  type JourneyLevelSlug,
  journeyLevelAtLeast,
  journeySlotsForTier,
} from './catalog'

/** Pedagogical rights only: no license, palette, language or runtime is granted here. */
export const KIDS_CREATOR_CAPABILITIES = [
  'studio',
  'pinta',
  'bridge',
  'pro',
  'ai',
  'pensa',
  'molda',
  'molda-intermediate',
  'molda-professional',
] as const
export type KidsCreatorCapability = (typeof KIDS_CREATOR_CAPABILITIES)[number]
/** Tool operation vocabulary only; the policy decides when each capability is earned. */
export const KIDS_MOLDA_BAND_CAPABILITIES = {
  basic: 'molda',
  intermediate: 'molda-intermediate',
  professional: 'molda-professional',
} as const satisfies Record<string, KidsCreatorCapability>

export const KIDS_JOURNEY_ADVANCES = JOURNEY_LEVEL_SLUGS.slice(1) as readonly Exclude<
  JourneyLevelSlug,
  'noob'
>[]
export const KIDS_JOURNEY_REQUIREMENTS_MAX = 200

const MilestoneSchema = z.enum(['complete', 'showcase'])
export const KidsRequirementSchema = z.discriminatedUnion('kind', [
  z
    .strictObject({
      kind: z.literal('slot'),
      tier: z.enum(JOURNEY_COURSE_TIERS),
      slot: z.number().int().min(1),
      milestone: MilestoneSchema,
    })
    .superRefine((requirement, context) => {
      if (requirement.slot > journeySlotsForTier(requirement.tier))
        context.addIssue({ code: 'custom', path: ['slot'], message: 'Posição fora da etapa.' })
    }),
  z.strictObject({
    kind: z.literal('course'),
    courseId: IdentityUuidSchema,
    milestone: MilestoneSchema,
  }),
])
export type KidsRequirement = z.infer<typeof KidsRequirementSchema>
export type KidsMilestone = z.infer<typeof MilestoneSchema>

export const KIDS_CAPABILITY_DEPENDENCIES: Readonly<
  Partial<Record<KidsCreatorCapability, KidsCreatorCapability>>
> = {
  bridge: 'studio',
  pro: 'studio',
  pensa: 'ai',
  'molda-intermediate': 'molda',
  'molda-professional': 'molda-intermediate',
}

const StepSchema = z
  .strictObject({
    level: z.enum(['coder', 'hacker', 'explorer', 'elite', 'architect', 'champion', 'god']),
    requirements: z
      .array(KidsRequirementSchema)
      .min(1)
      .max(KIDS_JOURNEY_REQUIREMENTS_MAX)
      .readonly(),
    capabilities: z
      .array(z.enum(KIDS_CREATOR_CAPABILITIES))
      .max(KIDS_CREATOR_CAPABILITIES.length)
      .readonly(),
  })
  .readonly()
export type KidsJourneyStep = z.infer<typeof StepSchema>

export function kidsRequirementKey(requirement: KidsRequirement): string {
  return requirement.kind === 'course'
    ? `course:${requirement.courseId}`
    : `slot:${requirement.tier}:${requirement.slot}`
}

const TierAccessSchema = z
  .strictObject({
    tier: z.enum(JOURNEY_COURSE_TIERS),
    opensAt: z.enum(JOURNEY_LEVEL_SLUGS),
    completedAt: z.enum(JOURNEY_LEVEL_SLUGS),
    foundation: z
      .strictObject({
        slot: z.literal(1),
        milestone: MilestoneSchema,
        whenMissing: z.enum(['open', 'locked']),
      })
      .readonly(),
  })
  .readonly()
export type KidsTierAccess = z.infer<typeof TierAccessSchema>

/** Shared transport validation for the exact published access rules, without inventing steps. */
export const KidsJourneyTierAccessSchema = z
  .array(TierAccessSchema)
  .length(JOURNEY_COURSE_TIERS.length)
  .superRefine((rules, context) => {
    if (new Set(rules.map((rule) => rule.tier)).size !== JOURNEY_COURSE_TIERS.length)
      context.addIssue({ code: 'custom', message: 'Configure cada etapa uma única vez.' })
    rules.forEach((rule, index) => {
      if (!journeyLevelAtLeast(rule.completedAt, rule.opensAt))
        context.addIssue({
          code: 'custom',
          path: [index, 'completedAt'],
          message: 'A revisão não pode preceder a entrada na etapa.',
        })
    })
  })
  .readonly()

export const KidsJourneyPolicySchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    mode: z.enum(['active', 'paused']),
    steps: z.array(StepSchema).length(KIDS_JOURNEY_ADVANCES.length).readonly(),
    tierAccess: KidsJourneyTierAccessSchema,
  })
  .superRefine((policy, context) => {
    const earned = new Set<KidsCreatorCapability>()
    policy.steps.forEach((step, index) => {
      if (step.level !== KIDS_JOURNEY_ADVANCES[index])
        context.addIssue({
          code: 'custom',
          path: ['steps', index, 'level'],
          message: 'Preserve a ordem dos postos da jornada.',
        })
      const keys = step.requirements.map(kidsRequirementKey)
      if (new Set(keys).size !== keys.length)
        context.addIssue({
          code: 'custom',
          path: ['steps', index, 'requirements'],
          message: 'Requisito repetido no avanço.',
        })
      if (new Set(step.capabilities).size !== step.capabilities.length)
        context.addIssue({
          code: 'custom',
          path: ['steps', index, 'capabilities'],
          message: 'Capacidade repetida no avanço.',
        })
      for (const capability of step.capabilities) earned.add(capability)
      for (const capability of step.capabilities) {
        const dependency = KIDS_CAPABILITY_DEPENDENCIES[capability]
        if (dependency && !earned.has(dependency))
          context.addIssue({
            code: 'custom',
            path: ['steps', index, 'capabilities'],
            message: `${capability} exige ${dependency} neste posto ou em um anterior.`,
          })
      }
    })
  })
  .readonly()
export type KidsJourneyPolicy = z.infer<typeof KidsJourneyPolicySchema>

export function pauseKidsJourneyPolicy(policy: KidsJourneyPolicy): KidsJourneyPolicy {
  const parsed = KidsJourneyPolicySchema.parse(policy)
  return { ...parsed, mode: 'paused' }
}

export interface KidsCourseMilestone {
  courseId: string
  completed: boolean
  showcased: boolean
  /** Resolved by the repository using showcase → complete → legacy catalog fallback. */
  qualifiedTier: JourneyCourseTier | null
  qualifiedSlot: number | null
}
export interface KidsJourneyEarned {
  level: JourneyLevelSlug
  capabilities: readonly KidsCreatorCapability[]
  courseAccess: KidsJourneyCourseAccess
}
export interface KidsJourneyCourseAccess {
  entry: readonly JourneyCourseTier[]
  expanded: readonly JourneyCourseTier[]
  reward: readonly JourneyCourseTier[]
}
const CourseAccessTiersSchema = z
  .array(z.enum(JOURNEY_COURSE_TIERS))
  .max(JOURNEY_COURSE_TIERS.length)
  .refine((tiers) => new Set(tiers).size === tiers.length, 'Etapa repetida na concessão.')
  .readonly()
export const KidsJourneyCourseAccessSchema = z
  .strictObject({
    entry: CourseAccessTiersSchema,
    expanded: CourseAccessTiersSchema,
    reward: CourseAccessTiersSchema,
  })
  .superRefine((access, context) => {
    if (access.expanded.some((tier) => !access.entry.includes(tier)))
      context.addIssue({
        code: 'custom',
        path: ['expanded'],
        message: 'A expansão exige entrada na mesma etapa.',
      })
  })
  .readonly()
export const KidsJourneyEarnedSchema = z
  .strictObject({
    level: z.enum(JOURNEY_LEVEL_SLUGS),
    capabilities: z
      .array(z.enum(KIDS_CREATOR_CAPABILITIES))
      .max(KIDS_CREATOR_CAPABILITIES.length)
      .refine(
        (capabilities) => new Set(capabilities).size === capabilities.length,
        'Capacidade repetida.',
      )
      .readonly(),
    courseAccess: KidsJourneyCourseAccessSchema,
  })
  .readonly()
export interface KidsJourneyCourseFact {
  id: string
  /** Derived from course.level === 'lenda'; tier:null alone loses this identity. */
  graduationOnly: boolean
  audience: 'kids' | 'adult'
  modality: 'recorded' | 'live'
  status: 'draft' | 'published' | 'archived'
  tier: JourneyCourseTier | null
  slot: number | null
  journeyRole: (typeof COURSE_JOURNEY_ROLES)[number]
  hasShowcaseBlock: boolean | null
}
export interface KidsJourneyReadinessInput {
  policy: KidsJourneyPolicy
  catalog: readonly KidsJourneyCourseFact[] | null
}
export interface KidsJourneyProjectionInput extends KidsJourneyReadinessInput {
  policyVersion: number
  milestones: readonly KidsCourseMilestone[]
  earned: KidsJourneyEarned
}
export interface KidsJourneyComparisonInput extends KidsJourneyProjectionInput {
  proposedPolicy: KidsJourneyPolicy
}
export const KIDS_JOURNEY_ISSUE_CODES = [
  'invalid-policy',
  'catalog-unavailable',
  'course-missing',
  'course-ineligible',
  'course-graduation-only',
  'course-unpublished',
  'course-locked',
  'showcase-missing',
  'showcase-unavailable',
  'foundation-unreachable',
  'foundation-unavailable',
] as const
export interface KidsJourneyIssue {
  code: (typeof KIDS_JOURNEY_ISSUE_CODES)[number]
  level: JourneyLevelSlug | null
  requirementIndex: number | null
  severity: 'error' | 'warning' | 'unavailable'
  message: string
}
export type KidsJourneyPolicyValidation =
  | { success: true; policy: KidsJourneyPolicy }
  | { success: false; issues: readonly KidsJourneyIssue[] }
export interface KidsJourneyReadiness {
  status: 'ready' | 'incomplete' | 'unavailable'
  horizon: JourneyLevelSlug | null
  issues: readonly KidsJourneyIssue[]
}
export interface KidsJourneyAdvanceView {
  level: Exclude<JourneyLevelSlug, 'noob'>
  earned: boolean
  available: boolean
  requirements: readonly {
    requirement: KidsRequirement
    state: 'satisfied' | 'pending' | 'unavailable'
    /** Unique eligible catalog identity from this projection; null never creates historical debt. */
    readonly resolvedCourseId: string | null
  }[]
  capabilities: readonly KidsCreatorCapability[]
}
export interface KidsJourneyView {
  audience: 'kids'
  policyVersion: number
  mode: KidsJourneyPolicy['mode']
  /** Read-only access rules from this exact published policy version, never rank constants. */
  tierAccess: readonly KidsTierAccess[]
  earned: KidsJourneyEarned
  nextLevel: JourneyLevelSlug | null
  missing: readonly KidsRequirement[]
  advances: readonly KidsJourneyAdvanceView[]
  readiness: KidsJourneyReadiness
}
/** Explicit team inspection; no student rank, earned rights or progress is simulated. */
export interface KidsJourneyStaffPreview {
  audience: 'kids'
  kind: 'staff-preview'
  policyVersion: number
  mode: KidsJourneyPolicy['mode']
  /** Read-only access rules from this exact published policy version, never rank constants. */
  tierAccess: readonly KidsTierAccess[]
  capabilities: readonly KidsCreatorCapability[]
  readiness: KidsJourneyReadiness
}
export interface KidsJourneyStepChange {
  level: Exclude<JourneyLevelSlug, 'noob'>
  requirementsAdded: readonly KidsRequirement[]
  requirementsRemoved: readonly KidsRequirement[]
  requirementsChanged: readonly { before: KidsRequirement; after: KidsRequirement }[]
  capabilitiesAdded: readonly KidsCreatorCapability[]
  capabilitiesRemoved: readonly KidsCreatorCapability[]
}
export interface KidsJourneyImpact {
  baseVersion: number
  before: KidsJourneyView
  after: KidsJourneyView
  changes: readonly KidsJourneyStepChange[]
  preservedCapabilities: readonly KidsCreatorCapability[]
  tierAccessChanges: readonly { before: KidsTierAccess; after: KidsTierAccess }[]
  preservedCourseAccess: KidsJourneyCourseAccess
}

/** Both milestones must belong to one course record; slots cannot merge evidence across IDs. */
export function kidsRequirementSatisfied(
  requirement: KidsRequirement,
  milestones: readonly KidsCourseMilestone[],
): boolean {
  return milestones.some(
    (milestone) =>
      milestone.completed &&
      (requirement.milestone === 'complete' || milestone.showcased) &&
      (requirement.kind === 'course'
        ? milestone.courseId === requirement.courseId
        : milestone.qualifiedTier === requirement.tier &&
          milestone.qualifiedSlot === requirement.slot),
  )
}
