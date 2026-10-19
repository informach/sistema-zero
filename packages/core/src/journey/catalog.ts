/**
 * Contrato técnico central da Jornada do Criador.
 *
 * Este módulo é deliberadamente puro: não conhece banco, React, Estúdio ou textos
 * de apresentação. Os consumidores traduzem os ids de recompensa para a UI.
 */
export const JOURNEY_LEVEL_SLUGS = [
  'noob',
  'coder',
  'hacker',
  'explorer',
  'elite',
  'architect',
  'champion',
  'god',
] as const
export type JourneyLevelSlug = (typeof JOURNEY_LEVEL_SLUGS)[number]

/**
 * Degraus da jornada, EM ORDEM (a ordem é load-bearing: `courseIndex < learningIndex` decide
 * o que é degrau passado).
 *
 * ⚠️ `primeiros-passos-2d` é o degrau de ENTRADA, criado em 14/08 a pedido da usuária. Antes o
 * curso-base morava no `iniciante-2d` e a divisão Faísca × Construtor(a) era só apresentação no
 * kids — por isso a Faísca não podia ter curso BÔNUS (todo bônus do degrau caía na trilha do
 * Construtor). Agora ela tem degrau próprio, com 1 posição obrigatória e bônus dela.
 */
export const JOURNEY_COURSE_TIERS = [
  'primeiros-passos-2d',
  'iniciante-2d',
  'iniciante-3d',
  'intermediario-2d',
  'intermediario-3d',
  'avancado-2d',
  'avancado-3d',
] as const
export type JourneyCourseTier = (typeof JOURNEY_COURSE_TIERS)[number]

/** Papel de um curso Kids na etapa: posição, recompensa ou curso aberto por matrícula. */
export const COURSE_JOURNEY_ROLES = ['positioned', 'reward', 'extra'] as const
export type CourseJourneyRole = (typeof COURSE_JOURNEY_ROLES)[number]

export const JOURNEY_STUDIO_REWARD_IDS = [
  'studio.lesson-only',
  'studio.blocks.2d-essential',
  'studio.blocks.iniciante-2d',
  'studio.blocks.iniciante-3d',
  'studio.blocks.intermediario-2d',
  'studio.blocks.intermediario-3d',
  'studio.blocks.avancado-2d',
  'studio.pro',
] as const
export type JourneyStudioRewardId = (typeof JOURNEY_STUDIO_REWARD_IDS)[number]

export const JOURNEY_STUDIO_BLOCK_PROFILE_IDS = [
  'lesson-only',
  '2d-essential',
  'iniciante-2d',
  'iniciante-3d',
  'intermediario-2d',
  'intermediario-3d',
  'avancado-2d',
  'avancado-3d',
] as const
export type JourneyStudioBlockProfileId = (typeof JOURNEY_STUDIO_BLOCK_PROFILE_IDS)[number]

/**
 * Degrau de BLOCOS do Estúdio — espelha o `BlockLevel` do studio, que continua com SEIS
 * degraus. O `primeiros-passos-2d` é degrau de CURSO, não de bloco: quem estuda o curso de
 * entrada cura blocos no `iniciante-2d`, e criar um nível de bloco só para ele não teria o
 * que separar (a paleta do Estúdio livre vem do CURRÍCULO desde 08/2026).
 */
export type JourneyStudioBlockLevel = Exclude<JourneyCourseTier, 'primeiros-passos-2d'>
export type JourneyStudioMode = 'blocks' | 'bridge'

export interface JourneyStudioReward {
  id: JourneyStudioRewardId
  freeStudio: boolean
  blockProfileId: JourneyStudioBlockProfileId
  blockLevel: JourneyStudioBlockLevel
  modes: readonly JourneyStudioMode[]
  bridge: boolean
  pro: boolean
}

export interface CreatorJourneyLevelDefinition {
  slug: JourneyLevelSlug
  /** Requisitos cumulativos: slots específicos já concluídos + publicados. */
  requiredSlots: Readonly<Partial<Record<JourneyCourseTier, readonly number[]>>>
  /** Etapa que este nível passa a estudar. `null` no topo. */
  learningTier: JourneyCourseTier | null
  reward: JourneyStudioReward
}

const SLOTS_1 = [1] as const
// 8 posições OBRIGATÓRIAS por degrau (decisão da usuária 07/2026: 5/6 era pouco p/
// fixar a habilidade; assinatura mensal quer jornada mais longa, conteúdo pré-carregado
// no lançamento). ⚠️ UMA exceção: `primeiros-passos-2d`, o degrau de ENTRADA, tem 1 (o
// curso que a Faísca faz).
//
// ⚠️ O Iniciante 2D chegou a ter 7 entre 14/08 e 15/08: quando o curso-base saiu dele p/ o
// degrau novo, tirou-se uma posição de lá p/ o total da jornada continuar 48. A usuária
// REJEITOU essa compensação — todo degrau que não é a entrada tem 8, ponto. O total passou
// a ser 49 (1 + 8 + 8×5) e são 9 cursos de Faísca até Inventor(a). Não "restaurar" o 7
// achando que é drift: foi decisão explícita.
/**
 * Teto CANÔNICO de posições, o MAIOR de qualquer degrau. Sobrevive como limite externo
 * (DTO, CHECK do banco); a faixa fina POR DEGRAU vem de `journeySlotsForTier`.
 */
export const JOURNEY_SLOT_MAX = 8
const SLOTS_1_TO_8 = [1, 2, 3, 4, 5, 6, 7, 8] as const

const passos = { 'primeiros-passos-2d': SLOTS_1 } as const
const ini2d = { ...passos, 'iniciante-2d': SLOTS_1_TO_8 } as const
const ini3d = { ...ini2d, 'iniciante-3d': SLOTS_1_TO_8 } as const
const inter2d = { ...ini3d, 'intermediario-2d': SLOTS_1_TO_8 } as const
const inter3d = { ...inter2d, 'intermediario-3d': SLOTS_1_TO_8 } as const
const advanced2d = { ...inter3d, 'avancado-2d': SLOTS_1_TO_8 } as const
const advanced3d = { ...advanced2d, 'avancado-3d': SLOTS_1_TO_8 } as const

export const CREATOR_JOURNEY_LEVELS: readonly CreatorJourneyLevelDefinition[] = [
  {
    slug: 'noob',
    requiredSlots: {},
    learningTier: 'primeiros-passos-2d',
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
    requiredSlots: passos,
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
      // Ponte (código lado a lado) só abre no Gênio (decisão 26/07): Mestre e
      // Arquiteto ficam só-Blocos; o salto pro código concentra-se no topo da escada.
      modes: ['blocks'],
      bridge: false,
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
      // Ainda só-Blocos: a Ponte abre no Gênio (o degrau seguinte).
      modes: ['blocks'],
      bridge: false,
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

const LEVEL_BY_SLUG = new Map(CREATOR_JOURNEY_LEVELS.map((level) => [level.slug, level]))

export function creatorJourneyLevel(
  slug: string | null | undefined,
): CreatorJourneyLevelDefinition {
  return LEVEL_BY_SLUG.get(slug as JourneyLevelSlug) ?? CREATOR_JOURNEY_LEVELS[0]!
}

/** Compara dois degraus já resolvidos pela posição na escada canônica. */
export function journeyLevelAtLeast(
  slug: string | null | undefined,
  min: JourneyLevelSlug,
): boolean {
  const current = JOURNEY_LEVEL_SLUGS.indexOf(slug as JourneyLevelSlug)
  if (current < 0) return false
  return current >= JOURNEY_LEVEL_SLUGS.indexOf(min)
}

const SLOTS_BY_TIER = new Map<JourneyCourseTier, number>(
  JOURNEY_COURSE_TIERS.map((tier) => [tier, tier === 'primeiros-passos-2d' ? 1 : 8]),
)

/**
 * Limites estruturais das identidades de posição: 1 na entrada e 8 nos demais tiers.
 * Não define requisitos, thresholds ou gates; estes pertencem à política publicada.
 * Degrau desconhecido → 0, e quem valida recusa.
 */
export function journeySlotsForTier(tier: string): number {
  return SLOTS_BY_TIER.get(tier as JourneyCourseTier) ?? 0
}

/** O degrau é um degrau de jornada conhecido? (`lenda` e lixo caem fora.) */
export function isJourneyCourseTier(tier: string): tier is JourneyCourseTier {
  return SLOTS_BY_TIER.has(tier as JourneyCourseTier)
}

export type QualifiedJourneySlots = Readonly<Partial<Record<JourneyCourseTier, readonly number[]>>>

function slotSet(slots: QualifiedJourneySlots, tier: JourneyCourseTier): ReadonlySet<number> {
  return new Set(slots[tier] ?? [])
}

export function meetsJourneyLevel(
  qualified: QualifiedJourneySlots,
  level: CreatorJourneyLevelDefinition,
): boolean {
  for (const tier of JOURNEY_COURSE_TIERS) {
    const required = level.requiredSlots[tier] ?? []
    const completed = slotSet(qualified, tier)
    if (required.some((slot) => !completed.has(slot))) return false
  }
  return true
}

export function computeJourneyLevelSlug(qualified: QualifiedJourneySlots): JourneyLevelSlug {
  let current: JourneyLevelSlug = 'noob'
  for (const level of CREATOR_JOURNEY_LEVELS.slice(1)) {
    if (!meetsJourneyLevel(qualified, level)) break
    current = level.slug
  }
  return current
}

export function missingJourneySlots(
  qualified: QualifiedJourneySlots,
  level: CreatorJourneyLevelDefinition,
): Partial<Record<JourneyCourseTier, number[]>> {
  const missing: Partial<Record<JourneyCourseTier, number[]>> = {}
  for (const tier of JOURNEY_COURSE_TIERS) {
    const completed = slotSet(qualified, tier)
    const absent = (level.requiredSlots[tier] ?? []).filter((slot) => !completed.has(slot))
    if (absent.length > 0) missing[tier] = absent
  }
  return missing
}

export type JourneyCourseLockReason = 'future-tier' | 'foundation-first' | 'tier-reward'

export interface JourneyCourseLock {
  locked: boolean
  reason?: JourneyCourseLockReason
  requiredLevel?: JourneyLevelSlug
  requiredTier?: JourneyCourseTier
}
