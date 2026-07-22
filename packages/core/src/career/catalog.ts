/**
 * Contrato técnico central da Carreira do Criador.
 *
 * Este módulo é deliberadamente puro: não conhece banco, React, Estúdio ou textos
 * de apresentação. Os consumidores traduzem os ids de recompensa para a UI.
 */
export const CAREER_LEVEL_SLUGS = [
  'noob',
  'coder',
  'hacker',
  'explorer',
  'elite',
  'architect',
  'champion',
  'god',
] as const
export type CareerLevelSlug = (typeof CAREER_LEVEL_SLUGS)[number]

export const CAREER_COURSE_TIERS = [
  'iniciante-2d',
  'iniciante-3d',
  'intermediario-2d',
  'intermediario-3d',
  'avancado-2d',
  'avancado-3d',
] as const
export type CareerCourseTier = (typeof CAREER_COURSE_TIERS)[number]

export const CAREER_STUDIO_REWARD_IDS = [
  'studio.lesson-only',
  'studio.blocks.2d-essential',
  'studio.blocks.iniciante-2d',
  'studio.blocks.iniciante-3d',
  'studio.blocks.intermediario-2d',
  'studio.blocks.intermediario-3d',
  'studio.blocks.avancado-2d',
  'studio.pro',
] as const
export type CareerStudioRewardId = (typeof CAREER_STUDIO_REWARD_IDS)[number]

export const CAREER_STUDIO_BLOCK_PROFILE_IDS = [
  'lesson-only',
  '2d-essential',
  'iniciante-2d',
  'iniciante-3d',
  'intermediario-2d',
  'intermediario-3d',
  'avancado-2d',
  'avancado-3d',
] as const
export type CareerStudioBlockProfileId = (typeof CAREER_STUDIO_BLOCK_PROFILE_IDS)[number]

export type CareerStudioBlockLevel = CareerCourseTier
export type CareerStudioMode = 'blocks' | 'bridge'

export interface CareerStudioReward {
  id: CareerStudioRewardId
  freeStudio: boolean
  blockProfileId: CareerStudioBlockProfileId
  blockLevel: CareerStudioBlockLevel
  modes: readonly CareerStudioMode[]
  bridge: boolean
  pro: boolean
}

export interface CreatorCareerLevelDefinition {
  slug: CareerLevelSlug
  /** Requisitos cumulativos: slots específicos já concluídos + publicados. */
  requiredSlots: Readonly<Partial<Record<CareerCourseTier, readonly number[]>>>
  /** Etapa que este nível passa a estudar. `null` no topo. */
  learningTier: CareerCourseTier | null
  reward: CareerStudioReward
}

const SLOTS_1 = [1] as const
const SLOTS_1_TO_5 = [1, 2, 3, 4, 5] as const
const SLOTS_1_TO_6 = [1, 2, 3, 4, 5, 6] as const

const ini2d = { 'iniciante-2d': SLOTS_1_TO_6 } as const
const ini3d = { ...ini2d, 'iniciante-3d': SLOTS_1_TO_5 } as const
const inter2d = { ...ini3d, 'intermediario-2d': SLOTS_1_TO_5 } as const
const inter3d = { ...inter2d, 'intermediario-3d': SLOTS_1_TO_5 } as const
const advanced2d = { ...inter3d, 'avancado-2d': SLOTS_1_TO_5 } as const
const advanced3d = { ...advanced2d, 'avancado-3d': SLOTS_1_TO_5 } as const

export const CREATOR_CAREER_LEVELS: readonly CreatorCareerLevelDefinition[] = [
  {
    slug: 'noob',
    requiredSlots: {},
    learningTier: 'iniciante-2d',
    reward: {
      id: 'studio.lesson-only',
      freeStudio: false,
      blockProfileId: 'lesson-only',
      blockLevel: 'iniciante-2d',
      modes: ['blocks'],
      bridge: false,
      pro: false,
    },
  },
  {
    slug: 'coder',
    requiredSlots: { 'iniciante-2d': SLOTS_1 },
    learningTier: 'iniciante-2d',
    reward: {
      id: 'studio.blocks.2d-essential',
      freeStudio: true,
      blockProfileId: '2d-essential',
      blockLevel: 'iniciante-2d',
      modes: ['blocks'],
      bridge: false,
      pro: false,
    },
  },
  {
    slug: 'hacker',
    requiredSlots: ini2d,
    learningTier: 'iniciante-3d',
    reward: {
      id: 'studio.blocks.iniciante-2d',
      freeStudio: true,
      blockProfileId: 'iniciante-2d',
      blockLevel: 'iniciante-2d',
      modes: ['blocks'],
      bridge: false,
      pro: false,
    },
  },
  {
    slug: 'explorer',
    requiredSlots: ini3d,
    learningTier: 'intermediario-2d',
    reward: {
      id: 'studio.blocks.iniciante-3d',
      freeStudio: true,
      blockProfileId: 'iniciante-3d',
      blockLevel: 'iniciante-3d',
      modes: ['blocks'],
      bridge: false,
      pro: false,
    },
  },
  {
    slug: 'elite',
    requiredSlots: inter2d,
    learningTier: 'intermediario-3d',
    reward: {
      id: 'studio.blocks.intermediario-2d',
      freeStudio: true,
      blockProfileId: 'intermediario-2d',
      blockLevel: 'intermediario-2d',
      modes: ['blocks', 'bridge'],
      bridge: true,
      pro: false,
    },
  },
  {
    slug: 'architect',
    requiredSlots: inter3d,
    learningTier: 'avancado-2d',
    reward: {
      id: 'studio.blocks.intermediario-3d',
      freeStudio: true,
      blockProfileId: 'intermediario-3d',
      blockLevel: 'intermediario-3d',
      modes: ['blocks', 'bridge'],
      bridge: true,
      pro: false,
    },
  },
  {
    slug: 'champion',
    requiredSlots: advanced2d,
    learningTier: 'avancado-3d',
    reward: {
      id: 'studio.blocks.avancado-2d',
      freeStudio: true,
      blockProfileId: 'avancado-2d',
      blockLevel: 'avancado-2d',
      modes: ['blocks', 'bridge'],
      bridge: true,
      pro: false,
    },
  },
  {
    slug: 'god',
    requiredSlots: advanced3d,
    learningTier: null,
    reward: {
      id: 'studio.pro',
      freeStudio: true,
      blockProfileId: 'avancado-3d',
      blockLevel: 'avancado-3d',
      modes: ['blocks', 'bridge'],
      bridge: true,
      pro: true,
    },
  },
] as const

const LEVEL_BY_SLUG = new Map(CREATOR_CAREER_LEVELS.map((level) => [level.slug, level]))

export function creatorCareerLevel(slug: string | null | undefined): CreatorCareerLevelDefinition {
  return LEVEL_BY_SLUG.get(slug as CareerLevelSlug) ?? CREATOR_CAREER_LEVELS[0]!
}

export type QualifiedCareerSlots = Readonly<Partial<Record<CareerCourseTier, readonly number[]>>>

function slotSet(slots: QualifiedCareerSlots, tier: CareerCourseTier): ReadonlySet<number> {
  return new Set(slots[tier] ?? [])
}

export function meetsCareerLevel(
  qualified: QualifiedCareerSlots,
  level: CreatorCareerLevelDefinition,
): boolean {
  for (const tier of CAREER_COURSE_TIERS) {
    const required = level.requiredSlots[tier] ?? []
    const completed = slotSet(qualified, tier)
    if (required.some((slot) => !completed.has(slot))) return false
  }
  return true
}

export function computeCareerLevelSlug(qualified: QualifiedCareerSlots): CareerLevelSlug {
  let current: CareerLevelSlug = 'noob'
  for (const level of CREATOR_CAREER_LEVELS.slice(1)) {
    if (!meetsCareerLevel(qualified, level)) break
    current = level.slug
  }
  return current
}

export function missingCareerSlots(
  qualified: QualifiedCareerSlots,
  level: CreatorCareerLevelDefinition,
): Partial<Record<CareerCourseTier, number[]>> {
  const missing: Partial<Record<CareerCourseTier, number[]>> = {}
  for (const tier of CAREER_COURSE_TIERS) {
    const completed = slotSet(qualified, tier)
    const absent = (level.requiredSlots[tier] ?? []).filter((slot) => !completed.has(slot))
    if (absent.length > 0) missing[tier] = absent
  }
  return missing
}

export type CareerCourseLockReason = 'future-tier' | 'foundation-first'

export interface CareerCourseLock {
  locked: boolean
  reason?: CareerCourseLockReason
  requiredLevel?: CareerLevelSlug
  requiredTier?: CareerCourseTier
}

/**
 * Política de acesso aos cursos da carreira. Cursos bônus (`careerSlot=null`)
 * permanecem fora desta trava e seguem apenas a autorização comercial normal.
 */
export function resolveCareerCourseLock(
  qualified: QualifiedCareerSlots,
  courseTier: CareerCourseTier,
  careerSlot: number | null,
): CareerCourseLock {
  if (careerSlot === null) return { locked: false }

  const level = creatorCareerLevel(computeCareerLevelSlug(qualified))
  if (level.learningTier === null) return { locked: false }

  const learningIndex = CAREER_COURSE_TIERS.indexOf(level.learningTier)
  const courseIndex = CAREER_COURSE_TIERS.indexOf(courseTier)
  if (courseIndex < learningIndex) return { locked: false }

  const requiredLevel = CREATOR_CAREER_LEVELS.find(
    (candidate) => candidate.learningTier === courseTier,
  )?.slug
  if (courseIndex > learningIndex) {
    return {
      locked: true,
      reason: 'future-tier',
      requiredLevel,
      requiredTier: courseTier,
    }
  }

  if (careerSlot === 1 || slotSet(qualified, courseTier).has(1)) return { locked: false }
  return {
    locked: true,
    reason: 'foundation-first',
    requiredLevel,
    requiredTier: courseTier,
  }
}
