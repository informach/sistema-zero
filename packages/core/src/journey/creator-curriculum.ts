import { z } from 'zod'
import { IdentityUuidSchema } from '../identity'
import { JOURNEY_LEVEL_SLUGS, type JourneyCourseLock, type JourneyLevelSlug } from './catalog'

export const CREATOR_CAPABILITIES = [
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
export type CreatorCapability = (typeof CREATOR_CAPABILITIES)[number]
export const CREATOR_POST_LEVELS = [
  'noob',
  'coder',
  'hacker',
  'explorer',
  'elite',
  'architect',
  'champion',
] as const
export type CreatorPostLevel = (typeof CREATOR_POST_LEVELS)[number]
export const CREATOR_MASTERY_IDS = [
  'python2d',
  'python3d',
  'javascript2d',
  'javascript3d',
  'arte2d',
  'modelagem3d',
] as const
export type CreatorMasteryId = (typeof CREATOR_MASTERY_IDS)[number]
const Id = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const Title = z.string().trim().min(1).max(160)
const CourseIds = z
  .array(IdentityUuidSchema)
  .min(1)
  .max(30)
  .refine((ids) => new Set(ids).size === ids.length, 'Curso repetido.')
  .readonly()
const Power = z.strictObject({ mechanicId: Id, title: Title, courseIds: CourseIds }).readonly()
const Workshop = z.strictObject({ id: Id, title: Title, courseIds: CourseIds }).readonly()
const Capabilities = z
  .array(z.enum(CREATOR_CAPABILITIES))
  .min(1)
  .max(CREATOR_CAPABILITIES.length)
  .readonly()
const Grant = z.union([
  z
    .strictObject({ after: z.enum(['base2d', 'base3d', 'pair']), capabilities: Capabilities })
    .readonly(),
  z
    .strictObject({
      after: z.literal('course'),
      courseId: IdentityUuidSchema,
      capabilities: Capabilities,
    })
    .readonly(),
])
const Rubric = z
  .strictObject({
    version: z.number().int().min(1),
    criteria: z
      .array(z.strictObject({ id: Id, title: Title }).readonly())
      .min(1)
      .max(30)
      .readonly(),
  })
  .readonly()
const MasteryLevel = z
  .strictObject({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    title: Title,
    /** Every nucleus course is required; equivalence is explicit reviewed evidence. */
    nucleusCourseIds: CourseIds,
    workshops: z.array(Workshop).length(3).readonly(),
    projectCourseId: IdentityUuidSchema.optional(),
    rubric: Rubric,
    /** Tool rights taught by the nucleus; earned before the level's final project approval. */
    grants: Capabilities.optional(),
  })
  .readonly()
const Stage = z
  .strictObject({
    level: z.enum(CREATOR_POST_LEVELS),
    title: Title,
    genre: Title.optional(),
    goal: z.string().trim().min(1).max(500).optional(),
    base2dCourseId: IdentityUuidSchema,
    base3dCourseId: IdentityUuidSchema,
    missionCourseId: IdentityUuidSchema,
    powers: z.array(Power).min(2).max(30).readonly(),
    minimumPowers: z.union([z.literal(1), z.literal(2)]),
    extras: z
      .array(z.strictObject({ courseId: IdentityUuidSchema, title: Title }).readonly())
      .max(50)
      .readonly(),
    grants: z.array(Grant).max(30).readonly(),
  })
  .readonly()

/** Stored inside the existing audience policy. Its presence selects this authority exclusively. */
export const CreatorJourneyCurriculumSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    stages: z.array(Stage).length(7).readonly(),
    masteries: z
      .array(
        z
          .strictObject({
            id: z.enum(CREATOR_MASTERY_IDS),
            title: Title,
            opensAfterPair: z.enum(CREATOR_POST_LEVELS),
            levels: z.array(MasteryLevel).length(3).readonly(),
          })
          .readonly(),
      )
      .length(6)
      .readonly(),
  })
  .superRefine((curriculum, ctx) => {
    const bound = new Map<string, string>()
    const capabilities = new Set<CreatorCapability>()
    const dependencies: Partial<Record<CreatorCapability, CreatorCapability>> = {
      bridge: 'studio',
      pro: 'studio',
      pensa: 'ai',
      'molda-intermediate': 'molda',
      'molda-professional': 'molda-intermediate',
    }
    const bind = (id: string, role: string, path: (string | number)[]) => {
      if (bound.has(id) && bound.get(id) !== role)
        ctx.addIssue({
          code: 'custom',
          path,
          message: 'Um curso não pode representar dois requisitos diferentes da jornada.',
        })
      bound.set(id, role)
    }
    for (const [index, stage] of curriculum.stages.entries()) {
      if (stage.level !== CREATOR_POST_LEVELS[index])
        ctx.addIssue({
          code: 'custom',
          path: ['stages', index, 'level'],
          message: 'Preserve a ordem dos sete postos.',
        })
      if (stage.minimumPowers !== (index === 0 ? 1 : 2))
        ctx.addIssue({
          code: 'custom',
          path: ['stages', index, 'minimumPowers'],
          message: 'Faísca exige um Poder; os demais postos exigem dois.',
        })
      for (const key of ['base2dCourseId', 'base3dCourseId', 'missionCourseId'] as const)
        bind(stage[key], `${stage.level}:${key}`, ['stages', index, key])
      if (new Set(stage.powers.map((p) => p.mechanicId)).size !== stage.powers.length)
        ctx.addIssue({
          code: 'custom',
          path: ['stages', index, 'powers'],
          message: 'Cada Poder representa uma mecânica distinta.',
        })
      stage.powers.forEach((power, powerIndex) => {
        power.courseIds.forEach((id) => {
          bind(id, `${stage.level}:power:${power.mechanicId}`, [
            'stages',
            index,
            'powers',
            powerIndex,
          ])
        })
      })
      if (new Set(stage.extras.map((e) => e.courseId)).size !== stage.extras.length)
        ctx.addIssue({
          code: 'custom',
          path: ['stages', index, 'extras'],
          message: 'Extra repetido.',
        })
      stage.extras.forEach((extra, extraIndex) => {
        bind(extra.courseId, `${stage.level}:extra`, ['stages', index, 'extras', extraIndex])
      })
      const stageCourseIds = [
        stage.base2dCourseId,
        stage.base3dCourseId,
        stage.missionCourseId,
        ...stage.powers.flatMap((power) => power.courseIds),
        ...stage.extras.map((extra) => extra.courseId),
      ]
      stage.grants.forEach((grant, grantIndex) => {
        if (grant.after === 'course' && !stageCourseIds.includes(grant.courseId))
          ctx.addIssue({
            code: 'custom',
            path: ['stages', index, 'grants', grantIndex],
            message: 'O curso que libera a ferramenta deve pertencer ao posto.',
          })
      })
      for (const after of ['base2d', 'base3d', 'pair', 'course'] as const) {
        const grants = stage.grants.filter((grant) => grant.after === after)
        for (const grant of grants)
          for (const capability of grant.capabilities) capabilities.add(capability)
        for (const grant of grants)
          for (const capability of grant.capabilities) {
            const dependency = dependencies[capability]
            if (dependency && !capabilities.has(dependency))
              ctx.addIssue({
                code: 'custom',
                path: ['stages', index, 'grants'],
                message: `${capability} exige ${dependency} antes ou no mesmo momento.`,
              })
          }
      }
    }
    if (new Set(curriculum.masteries.map((m) => m.id)).size !== 6)
      ctx.addIssue({
        code: 'custom',
        path: ['masteries'],
        message: 'Configure cada uma das seis Maestrias uma única vez.',
      })
    for (const [masteryIndex, mastery] of curriculum.masteries.entries()) {
      for (const [index, level] of mastery.levels.entries()) {
        const path = ['masteries', masteryIndex, 'levels', index]
        if (level.level !== index + 1)
          ctx.addIssue({
            code: 'custom',
            path,
            message: 'Os níveis da Maestria devem seguir I, II e III.',
          })
        if (new Set(level.workshops.map((w) => w.id)).size !== 3)
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'workshops'],
            message: 'Configure três oficinas diferentes.',
          })
        const workshopCourses = level.workshops.flatMap((w) => w.courseIds)
        if (new Set(workshopCourses).size !== workshopCourses.length)
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'workshops'],
            message: 'Um curso não pode contar como duas oficinas do mesmo nível.',
          })
        if (workshopCourses.some((id) => level.nucleusCourseIds.includes(id)))
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'workshops'],
            message: 'A conclusão do núcleo não substitui a aplicação em uma oficina.',
          })
        if (new Set(level.rubric.criteria.map((c) => c.id)).size !== level.rubric.criteria.length)
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'rubric', 'criteria'],
            message: 'Critério repetido na rubrica.',
          })
      }
    }
  })
  .readonly()
export type CreatorJourneyCurriculum = z.infer<typeof CreatorJourneyCurriculumSchema>
export type CreatorJourneyStage = CreatorJourneyCurriculum['stages'][number]
export type CreatorMastery = CreatorJourneyCurriculum['masteries'][number]
export type CreatorMasteryLevel = CreatorMastery['levels'][number]
export type CreatorCourseState = 'locked' | 'available' | 'completed' | 'unavailable'
export interface CreatorCourseView {
  courseId: string
  state: CreatorCourseState
  title?: string
}
export interface CreatorJourneyCourseFact {
  id: string
  title?: string
  audience: 'kids' | 'adult'
  modality: 'recorded' | 'live'
  status: 'draft' | 'published' | 'archived'
}
export interface CreatorPowerView {
  mechanicId: string
  title: string
  courseIds: readonly string[]
  courses: readonly CreatorCourseView[]
  completed: boolean
  available: boolean
}
export interface CreatorStageView {
  level: CreatorPostLevel
  title: string
  genre?: string
  goal?: string
  available: boolean
  completed: boolean
  earned: boolean
  pairCompleted: boolean
  base2d: CreatorCourseView
  base3d: CreatorCourseView
  mission: CreatorCourseView
  powers: readonly CreatorPowerView[]
  minimumPowers: number
  powersCompleted: number
  extras: readonly (CreatorCourseView & { title: string })[]
}
/** Immutable review supplied by the application after verifying owner, reviewer and snapshot. */
export interface CreatorMasteryApproval {
  masteryId: CreatorMasteryId
  level: 1 | 2 | 3
  rubricVersion: number
  submissionId: string
  decision: 'approved' | 'changes-requested'
  approvedCriteriaIds: readonly string[]
  nucleusEquivalent?: boolean
  workshopCredits?: readonly string[]
}
/** Award is historical evidence, not inferred from a mutable submission or current rubric. */
export interface CreatorMasteryAward {
  masteryId: CreatorMasteryId
  level: 1 | 2 | 3
  /** Capabilities from the reviewed definition snapshot, never from a later policy edit. */
  capabilities?: readonly CreatorCapability[]
}
/** A server-owned submission proves admission to its level, not completion or a later level. */
export interface CreatorMasteryAdmission {
  masteryId: CreatorMasteryId
  level: 1 | 2 | 3
}
export interface CreatorMasteryDefinition {
  masteryId: CreatorMasteryId
  definition: CreatorMasteryLevel
}
/** Verified immutable learning facts, scoped to one learner by the application. */
export interface CreatorMasteryJourneyFacts {
  masteryAwards: readonly CreatorMasteryAward[]
  masteryApprovals: readonly CreatorMasteryApproval[]
  masteryAdmissions: readonly CreatorMasteryAdmission[]
  masteryDefinitions: readonly CreatorMasteryDefinition[]
}
export interface CreatorWorkshopView {
  id: string
  title: string
  courseIds: readonly string[]
  courses: readonly CreatorCourseView[]
  completed: boolean
  available: boolean
}
export interface CreatorMasteryLevelView {
  level: 1 | 2 | 3
  title: string
  available: boolean
  completed: boolean
  earned: boolean
  nucleusCourseIds: readonly string[]
  nucleusCourses: readonly CreatorCourseView[]
  nucleusCompleted: boolean
  workshops: readonly CreatorWorkshopView[]
  workshopsCompleted: number
  project: CreatorCourseView | null
  rubric: CreatorMasteryLevel['rubric']
  approvedCriteriaIds: readonly string[]
  approvedSubmissionId: string | null
  approval: 'pending' | 'changes-requested' | 'approved'
}
export interface CreatorMasteryView {
  id: CreatorMasteryId
  title: string
  opensAfterPair: CreatorPostLevel
  available: boolean
  levels: readonly CreatorMasteryLevelView[]
}
export interface CreatorJourneyView {
  level: JourneyLevelSlug
  nextLevel: JourneyLevelSlug | null
  paused: boolean
  capabilities: readonly CreatorCapability[]
  retainedCourseIds: readonly string[]
  stages: readonly CreatorStageView[]
  masteries: readonly CreatorMasteryView[]
}
export interface CreatorJourneyProjectionInput {
  curriculum: CreatorJourneyCurriculum
  completedCourseIds: readonly string[]
  earnedLevel?: JourneyLevelSlug
  earnedCapabilities?: readonly CreatorCapability[]
  retainedCourseIds?: readonly string[]
  paused?: boolean
  catalog?: readonly CreatorJourneyCourseFact[] | null
  audience?: 'kids' | 'adult'
  masteryApprovals?: readonly CreatorMasteryApproval[]
  masteryAwards?: readonly CreatorMasteryAward[]
  masteryAdmissions?: readonly CreatorMasteryAdmission[]
  masteryDefinitions?: readonly CreatorMasteryDefinition[]
}
export interface CreatorCoursePlacement {
  role:
    | 'base2d'
    | 'base3d'
    | 'mission'
    | 'power'
    | 'extra'
    | 'mastery-nucleus'
    | 'mastery-workshop'
    | 'mastery-project'
  level: CreatorPostLevel | null
  mechanicId?: string
  masteryId?: CreatorMasteryId
  masteryLevel?: 1 | 2 | 3
  workshopId?: string
}

export function creatorJourneyCourseIds(curriculum: CreatorJourneyCurriculum): string[] {
  return [
    ...new Set([
      ...curriculum.stages.flatMap((stage) => [
        stage.base2dCourseId,
        stage.base3dCourseId,
        stage.missionCourseId,
        ...stage.powers.flatMap((p) => p.courseIds),
        ...stage.extras.map((e) => e.courseId),
      ]),
      ...curriculum.masteries.flatMap((m) =>
        m.levels.flatMap((l) => [
          ...l.nucleusCourseIds,
          ...l.workshops.flatMap((w) => w.courseIds),
          ...(l.projectCourseId ? [l.projectCourseId] : []),
        ]),
      ),
    ]),
  ]
}

/** A submitted level retains its contract; untouched levels continue to follow the current policy. */
export function withCreatorMasteryDefinitions(
  curriculum: CreatorJourneyCurriculum,
  definitions: readonly CreatorMasteryDefinition[] = [],
): CreatorJourneyCurriculum {
  if (!definitions.length) return curriculum
  return {
    ...curriculum,
    masteries: curriculum.masteries.map((mastery) => ({
      ...mastery,
      levels: mastery.levels.map(
        (level) =>
          definitions.find(
            (snapshot) =>
              snapshot.masteryId === mastery.id && snapshot.definition.level === level.level,
          )?.definition ?? level,
      ),
    })),
  }
}

/** All placements matter: a course may provide credit in a Maestria as well as its main post. */
export function creatorJourneyCoursePlacements(
  curriculum: CreatorJourneyCurriculum,
  courseId: string,
): CreatorCoursePlacement[] {
  const placements: CreatorCoursePlacement[] = []
  for (const stage of curriculum.stages) {
    for (const role of ['base2d', 'base3d', 'mission'] as const)
      if (stage[`${role}CourseId`] === courseId) placements.push({ role, level: stage.level })
    for (const power of stage.powers)
      if (power.courseIds.includes(courseId))
        placements.push({ role: 'power', level: stage.level, mechanicId: power.mechanicId })
    if (stage.extras.some((e) => e.courseId === courseId))
      placements.push({ role: 'extra', level: stage.level })
  }
  for (const mastery of curriculum.masteries)
    for (const level of mastery.levels) {
      const common = { level: null, masteryId: mastery.id, masteryLevel: level.level } as const
      if (level.nucleusCourseIds.includes(courseId))
        placements.push({ ...common, role: 'mastery-nucleus' })
      for (const workshop of level.workshops)
        if (workshop.courseIds.includes(courseId))
          placements.push({ ...common, role: 'mastery-workshop', workshopId: workshop.id })
      if (level.projectCourseId === courseId)
        placements.push({ ...common, role: 'mastery-project' })
    }
  return placements
}
export function creatorJourneyCoursePlacement(
  curriculum: CreatorJourneyCurriculum,
  courseId: string,
): CreatorCoursePlacement | null {
  return creatorJourneyCoursePlacements(curriculum, courseId)[0] ?? null
}

function courseState(
  courseId: string,
  available: boolean,
  input: CreatorJourneyProjectionInput,
): CreatorCourseState {
  if (input.completedCourseIds.includes(courseId)) return 'completed'
  if (input.catalog !== undefined) {
    const course = input.catalog?.find((c) => c.id === courseId)
    if (
      course?.status !== 'published' ||
      course.modality !== 'recorded' ||
      (input.audience && course.audience !== input.audience)
    )
      return 'unavailable'
  }
  return available || input.retainedCourseIds?.includes(courseId) ? 'available' : 'locked'
}

function courseView(
  courseId: string,
  available: boolean,
  input: CreatorJourneyProjectionInput,
): CreatorCourseView {
  const title = input.catalog?.find((course) => course.id === courseId)?.title
  return { courseId, state: courseState(courseId, available, input), ...(title ? { title } : {}) }
}

export function evaluateCreatorMasteries(
  input: CreatorJourneyProjectionInput & { pairCompletedLevels: readonly CreatorPostLevel[] },
): CreatorMasteryView[] {
  const completed = new Set(input.completedCourseIds)
  return withCreatorMasteryDefinitions(input.curriculum, input.masteryDefinitions).masteries.map(
    (mastery) => {
      const entry =
        input.pairCompletedLevels.includes(mastery.opensAfterPair) ||
        Boolean(input.masteryAwards?.some((award) => award.masteryId === mastery.id))
      let previousComplete = true
      const levels = mastery.levels.map((level) => {
        const earned = Boolean(
          input.masteryAwards?.some((a) => a.masteryId === mastery.id && a.level === level.level),
        )
        const admitted = Boolean(
          input.masteryAdmissions?.some(
            (a) => a.masteryId === mastery.id && a.level === level.level,
          ),
        )
        const available = earned || admitted || (entry && previousComplete)
        const reviews = (input.masteryApprovals ?? []).filter(
          (a) =>
            a.masteryId === mastery.id &&
            a.level === level.level &&
            a.rubricVersion === level.rubric.version,
        )
        // A complete approval is one immutable review. Never stitch criteria from different projects.
        const approvedReviews = reviews.filter(
          (a) =>
            a.decision === 'approved' &&
            level.rubric.criteria.every((c) => a.approvedCriteriaIds.includes(c.id)),
        )
        const approved =
          approvedReviews.find(
            (review) =>
              (level.nucleusCourseIds.every((id) => completed.has(id)) ||
                review.nucleusEquivalent) &&
              level.workshops.filter(
                (workshop) =>
                  workshop.courseIds.some((id) => completed.has(id)) ||
                  review.workshopCredits?.includes(workshop.id),
              ).length >= 2,
          ) ?? approvedReviews[approvedReviews.length - 1]
        const review = approved ?? reviews[reviews.length - 1]
        const nucleusCompleted =
          level.nucleusCourseIds.every((id) => completed.has(id)) ||
          Boolean(approved?.nucleusEquivalent)
        const workshops = level.workshops.map((workshop) => ({
          ...workshop,
          courses: workshop.courseIds.map((courseId) => courseView(courseId, available, input)),
          available,
          completed:
            workshop.courseIds.some((id) => completed.has(id)) ||
            Boolean(approved?.workshopCredits?.includes(workshop.id)),
        }))
        const workshopsCompleted = workshops.filter((w) => w.completed).length
        const levelCompleted =
          earned ||
          (!input.paused &&
            available &&
            nucleusCompleted &&
            workshopsCompleted >= 2 &&
            Boolean(approved))
        previousComplete = levelCompleted
        return {
          level: level.level,
          title: level.title,
          available,
          completed: levelCompleted,
          earned,
          nucleusCourseIds: level.nucleusCourseIds,
          nucleusCourses: level.nucleusCourseIds.map((courseId) =>
            courseView(courseId, available, input),
          ),
          nucleusCompleted,
          workshops,
          workshopsCompleted,
          project: level.projectCourseId
            ? courseView(level.projectCourseId, available, input)
            : null,
          rubric: level.rubric,
          approvedCriteriaIds: review?.approvedCriteriaIds ?? [],
          approvedSubmissionId: approved?.submissionId ?? null,
          approval: approved
            ? ('approved' as const)
            : review?.decision === 'changes-requested'
              ? ('changes-requested' as const)
              : ('pending' as const),
        }
      })
      return {
        id: mastery.id,
        title: mastery.title,
        opensAfterPair: mastery.opensAfterPair,
        available: entry || levels.some((l) => l.available),
        levels,
      }
    },
  )
}

export function projectCreatorJourney(input: CreatorJourneyProjectionInput): CreatorJourneyView {
  const curriculum = withCreatorMasteryDefinitions(
    CreatorJourneyCurriculumSchema.parse(input.curriculum),
    input.masteryDefinitions,
  )
  const completed = new Set(input.completedCourseIds)
  const floor = Math.max(0, JOURNEY_LEVEL_SLUGS.indexOf(input.earnedLevel ?? 'noob'))
  const frozenCapabilities = [
    ...(input.earnedCapabilities ?? []),
    ...(input.masteryAwards ?? []).flatMap((award) => award.capabilities ?? []),
  ]
  const capabilities = new Set(frozenCapabilities)
  let current = floor
  let previousComplete = true
  const stages = curriculum.stages.map((stage, index): CreatorStageView => {
    const earned = index < floor
    const available = earned || previousComplete
    const base2dCompleted = completed.has(stage.base2dCourseId)
    const base3dCompleted = completed.has(stage.base3dCourseId)
    const pairCompleted = base2dCompleted && base3dCompleted
    const expanded = earned || (available && pairCompleted)
    const powers = stage.powers.map((power) => ({
      ...power,
      courses: power.courseIds.map((courseId) => courseView(courseId, expanded, input)),
      available:
        expanded || power.courseIds.some((courseId) => input.retainedCourseIds?.includes(courseId)),
      completed: power.courseIds.some((id) => completed.has(id)),
    }))
    const powersCompleted = powers.filter((power) => power.completed).length
    const stageCompleted =
      earned ||
      (!input.paused &&
        available &&
        pairCompleted &&
        completed.has(stage.missionCourseId) &&
        powersCompleted >= stage.minimumPowers)
    // Rank floors never manufacture new grants. Each early grant needs its actual course evidence.
    if (!input.paused && available)
      for (const grant of stage.grants) {
        const satisfied =
          grant.after === 'course'
            ? completed.has(grant.courseId)
            : grant.after === 'base2d'
              ? base2dCompleted
              : grant.after === 'base3d'
                ? base3dCompleted
                : pairCompleted
        if (satisfied) for (const capability of grant.capabilities) capabilities.add(capability)
      }
    if (stageCompleted) current = Math.max(current, index + 1)
    previousComplete = stageCompleted
    const entry = (courseId: string, open: boolean): CreatorCourseView =>
      courseView(courseId, open, input)
    return {
      level: stage.level,
      title: stage.title,
      ...(stage.genre ? { genre: stage.genre } : {}),
      ...(stage.goal ? { goal: stage.goal } : {}),
      earned,
      available,
      completed: stageCompleted,
      pairCompleted,
      base2d: entry(stage.base2dCourseId, available),
      base3d: entry(stage.base3dCourseId, earned || (available && base2dCompleted)),
      mission: entry(stage.missionCourseId, expanded),
      powers,
      minimumPowers: stage.minimumPowers,
      powersCompleted,
      extras: stage.extras.map((extra) => ({
        ...entry(extra.courseId, expanded),
        title: extra.title,
      })),
    }
  })
  const masteries = evaluateCreatorMasteries({
    ...input,
    curriculum,
    pairCompletedLevels: stages
      .filter((s) => (s.available && s.pairCompleted) || s.earned)
      .map((s) => s.level),
  })
  if (!input.paused)
    for (const mastery of masteries)
      for (const level of mastery.levels) {
        if (!level.available || !level.nucleusCompleted) continue
        const definition = curriculum.masteries
          .find((candidate) => candidate.id === mastery.id)!
          .levels.find((candidate) => candidate.level === level.level)!
        for (const capability of definition.grants ?? []) capabilities.add(capability)
      }
  // Optional courses may teach dependent capabilities in a different order. Only actual earned
  // dependencies unlock a new tool band; historically frozen capabilities are never withdrawn.
  const dependencies: Partial<Record<CreatorCapability, CreatorCapability>> = {
    bridge: 'studio',
    pro: 'studio',
    pensa: 'ai',
    'molda-intermediate': 'molda',
    'molda-professional': 'molda-intermediate',
  }
  const acquired = new Set(frozenCapabilities)
  for (const capability of CREATOR_CAPABILITIES) {
    const dependency = dependencies[capability]
    if (capabilities.has(capability) && (!dependency || acquired.has(dependency)))
      acquired.add(capability)
  }
  return {
    level: JOURNEY_LEVEL_SLUGS[current]!,
    nextLevel: JOURNEY_LEVEL_SLUGS[current + 1] ?? null,
    paused: Boolean(input.paused),
    capabilities: CREATOR_CAPABILITIES.filter((capability) => acquired.has(capability)),
    retainedCourseIds: [
      ...new Set([...(input.retainedCourseIds ?? []), ...input.completedCourseIds]),
    ],
    stages,
    masteries,
  }
}

/** Pedagogy only; the application independently verifies license and approved direct-purchase exceptions. */
export function resolveCreatorJourneyCourseLock(input: {
  curriculum: CreatorJourneyCurriculum
  view: CreatorJourneyView
  courseId: string
}): JourneyCourseLock {
  if (input.view.retainedCourseIds.includes(input.courseId)) return { locked: false }
  const placements = creatorJourneyCoursePlacements(input.curriculum, input.courseId).filter(
    (placement) => placement.level !== null,
  )
  // Mastery bindings come from the effective learner view, which may preserve older UUIDs.
  for (const mastery of input.view.masteries)
    for (const level of mastery.levels) {
      if (level.nucleusCourseIds.includes(input.courseId))
        placements.push({
          role: 'mastery-nucleus',
          level: null,
          masteryId: mastery.id,
          masteryLevel: level.level,
        })
      for (const workshop of level.workshops)
        if (workshop.courseIds.includes(input.courseId))
          placements.push({
            role: 'mastery-workshop',
            level: null,
            masteryId: mastery.id,
            masteryLevel: level.level,
            workshopId: workshop.id,
          })
      if (level.project?.courseId === input.courseId)
        placements.push({
          role: 'mastery-project',
          level: null,
          masteryId: mastery.id,
          masteryLevel: level.level,
        })
    }
  if (!placements.length) return { locked: false }
  let reason: JourneyCourseLock = { locked: true, reason: 'foundation-first' }
  for (const placement of placements) {
    if (placement.level) {
      const stage = input.view.stages.find((s) => s.level === placement.level)!
      if (stage.earned) return { locked: false }
      if (!stage.available) {
        reason = { locked: true, reason: 'future-tier', requiredLevel: stage.level }
        continue
      }
      if (placement.role === 'base2d') return { locked: false }
      if (placement.role === 'base3d' && stage.base2d.state === 'completed')
        return { locked: false }
      if (placement.role !== 'base3d' && stage.pairCompleted) return { locked: false }
    } else {
      const mastery = input.view.masteries.find((m) => m.id === placement.masteryId)
      if (mastery?.levels.find((l) => l.level === placement.masteryLevel)?.available)
        return { locked: false }
    }
  }
  return reason
}

/** UUID grants to append atomically with the policy version used for this projection. */
export function creatorJourneyOpenCourseIds(
  curriculum: CreatorJourneyCurriculum,
  view: CreatorJourneyView,
): string[] {
  return [
    ...new Set([
      ...view.retainedCourseIds,
      ...[
        ...curriculum.stages.flatMap((stage) => [
          stage.base2dCourseId,
          stage.base3dCourseId,
          stage.missionCourseId,
          ...stage.powers.flatMap((power) => power.courseIds),
          ...stage.extras.map((extra) => extra.courseId),
        ]),
        ...view.masteries.flatMap((mastery) =>
          mastery.levels.flatMap((level) => [
            ...level.nucleusCourseIds,
            ...level.workshops.flatMap((workshop) => workshop.courseIds),
            ...(level.project ? [level.project.courseId] : []),
          ]),
        ),
      ].filter(
        (courseId) => !resolveCreatorJourneyCourseLock({ curriculum, view, courseId }).locked,
      ),
    ]),
  ]
}
