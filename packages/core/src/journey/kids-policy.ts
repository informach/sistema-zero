import { z } from 'zod'
import {
  type COURSE_JOURNEY_ROLES,
  CREATOR_JOURNEY_LEVELS,
  JOURNEY_COURSE_TIERS,
  JOURNEY_LEVEL_SLUGS,
  type JourneyCourseTier,
  type JourneyLevelSlug,
  journeyLevelAtLeast,
  journeySlotsForTier,
} from './catalog'
import { AI_APPS_MIN_LEVEL, CREATIVE_TOOL_LEVELS, MOLDA_TOOL_BAND_LEVELS } from './state'

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
  z.strictObject({ kind: z.literal('course'), courseId: z.uuid(), milestone: MilestoneSchema }),
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

export const KidsJourneyActivePolicySchema = z
  .discriminatedUnion('mode', [
    z.strictObject({ schemaVersion: z.literal(1), mode: z.literal('legacy') }),
    z.strictObject({
      schemaVersion: z.literal(1),
      mode: z.literal('configured'),
      steps: z.array(StepSchema).length(KIDS_JOURNEY_ADVANCES.length).readonly(),
    }),
  ])
  .superRefine((policy, context) => {
    if (policy.mode !== 'configured') return
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
export type KidsJourneyActivePolicy = z.infer<typeof KidsJourneyActivePolicySchema>
/** Pausing retains the complete course gate policy; it is not an empty curriculum. */
export const KidsJourneyPolicySchema = z
  .union([
    KidsJourneyActivePolicySchema,
    z
      .strictObject({
        schemaVersion: z.literal(1),
        mode: z.literal('paused'),
        policy: KidsJourneyActivePolicySchema,
      })
      .readonly(),
  ])
  .readonly()
export type KidsJourneyPolicy = z.infer<typeof KidsJourneyPolicySchema>

export function pauseKidsJourneyPolicy(policy: KidsJourneyPolicy): KidsJourneyPolicy {
  const parsed = KidsJourneyPolicySchema.parse(policy)
  return parsed.mode === 'paused' ? parsed : { schemaVersion: 1, mode: 'paused', policy: parsed }
}

export function legacyKidsJourneyPolicy(): KidsJourneyPolicy {
  return { schemaVersion: 1, mode: 'legacy' }
}

/** Derives first capability availability from existing defaults, never a second rank table. */
function legacyCapabilities(level: JourneyLevelSlug): KidsCreatorCapability[] {
  const reward = CREATOR_JOURNEY_LEVELS.find((definition) => definition.slug === level)!.reward
  const available: Partial<Record<KidsCreatorCapability, boolean>> = {
    studio: reward.freeStudio,
    bridge: reward.bridge,
    pro: reward.pro,
    pinta: journeyLevelAtLeast(level, CREATIVE_TOOL_LEVELS.pinta),
    ai: journeyLevelAtLeast(level, AI_APPS_MIN_LEVEL),
    pensa: journeyLevelAtLeast(level, CREATIVE_TOOL_LEVELS.pensa),
    molda: journeyLevelAtLeast(level, MOLDA_TOOL_BAND_LEVELS.basic),
    'molda-intermediate': journeyLevelAtLeast(level, MOLDA_TOOL_BAND_LEVELS.intermediate),
    'molda-professional': journeyLevelAtLeast(level, MOLDA_TOOL_BAND_LEVELS.professional),
  }
  return KIDS_CREATOR_CAPABILITIES.filter((capability) => available[capability])
}

/** Legacy positions remain identities even when their courses do not exist yet. */
export function kidsJourneySteps(policy: KidsJourneyPolicy): readonly KidsJourneyStep[] {
  if (policy.mode === 'paused') return kidsJourneySteps(policy.policy)
  if (policy.mode === 'configured') return policy.steps
  return CREATOR_JOURNEY_LEVELS.slice(1).map((level, index) => {
    const previous = CREATOR_JOURNEY_LEVELS[index]!
    const requirements: KidsRequirement[] = []
    for (const tier of JOURNEY_COURSE_TIERS) {
      for (const slot of level.requiredSlots[tier] ?? []) {
        if (!previous.requiredSlots[tier]?.includes(slot))
          requirements.push({ kind: 'slot', tier, slot, milestone: 'showcase' })
      }
    }
    const before = new Set(legacyCapabilities(previous.slug))
    return {
      level: level.slug as Exclude<JourneyLevelSlug, 'noob'>,
      requirements,
      capabilities: legacyCapabilities(level.slug).filter((capability) => !before.has(capability)),
    }
  })
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
}
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
  }[]
  capabilities: readonly KidsCreatorCapability[]
}
export interface KidsJourneyView {
  audience: 'kids'
  policyVersion: number
  mode: KidsJourneyPolicy['mode']
  earned: KidsJourneyEarned
  nextLevel: JourneyLevelSlug | null
  missing: readonly KidsRequirement[]
  advances: readonly KidsJourneyAdvanceView[]
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
