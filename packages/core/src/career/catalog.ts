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
// 8 posições OBRIGATÓRIAS por degrau (decisão da usuária 07/2026: 5/6 era pouco p/
// fixar a habilidade; assinatura mensal quer jornada mais longa, conteúdo pré-carregado
// no lançamento). O Iniciante 2D é dividido pelo curso-base (Faísca=entrada → Construtor
// pega o slot 1 → Inventor completa 1–8); os demais degraus são um nível cada.
/**
 * Teto CANÔNICO de posições por degrau da carreira. É a fonte única do "8":
 * o CHECK da migration `0053` do members, a validação do content-admin e o
 * `slotsForTier` do admin (via conformance) espelham este valor.
 */
export const CAREER_SLOT_MAX = 8
const SLOTS_1_TO_8 = [1, 2, 3, 4, 5, 6, 7, 8] as const

const ini2d = { 'iniciante-2d': SLOTS_1_TO_8 } as const
const ini3d = { ...ini2d, 'iniciante-3d': SLOTS_1_TO_8 } as const
const inter2d = { ...ini3d, 'intermediario-2d': SLOTS_1_TO_8 } as const
const inter3d = { ...inter2d, 'intermediario-3d': SLOTS_1_TO_8 } as const
const advanced2d = { ...inter3d, 'avancado-2d': SLOTS_1_TO_8 } as const
const advanced3d = { ...advanced2d, 'avancado-3d': SLOTS_1_TO_8 } as const

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

const LEVEL_BY_SLUG = new Map(CREATOR_CAREER_LEVELS.map((level) => [level.slug, level]))

export function creatorCareerLevel(slug: string | null | undefined): CreatorCareerLevelDefinition {
  return LEVEL_BY_SLUG.get(slug as CareerLevelSlug) ?? CREATOR_CAREER_LEVELS[0]!
}

/**
 * O aluno já chegou (ou passou) do degrau `min`? Compara a POSIÇÃO na escada —
 * `CAREER_LEVEL_SLUGS` é a ordem canônica, então acrescentar um degrau no meio
 * reordena esta comparação junto, sem tocar em quem a consome.
 *
 * ⚠️ Distinta de `meetsCareerLevel`, que responde outra pergunta: aquela cruza os
 * SLOTS de curso concluídos com os exigidos por um nível (é como o nível é
 * DERIVADO). Esta compara dois slugs já resolvidos, que é o que um portão de
 * produto precisa.
 *
 * Slug ausente/desconhecido cai no 1º degrau — **fail-closed**: dado ruim ou
 * gamificação fora do ar nunca DESTRAVA nada. Quem não pode rebaixar o aluno em
 * cima de uma falha transitória (portão de produto pago) deve checar a
 * indisponibilidade ANTES de chamar, em vez de tratar `false` como "não tem nível".
 */
export function careerLevelAtLeast(slug: string | null | undefined, min: CareerLevelSlug): boolean {
  const current = CAREER_LEVEL_SLUGS.indexOf(slug as CareerLevelSlug)
  if (current < 0) return false
  return current >= CAREER_LEVEL_SLUGS.indexOf(min)
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

export type CareerCourseLockReason = 'future-tier' | 'foundation-first' | 'tier-reward'

export interface CareerCourseLock {
  locked: boolean
  reason?: CareerCourseLockReason
  requiredLevel?: CareerLevelSlug
  requiredTier?: CareerCourseTier
}

/**
 * Política de acesso aos cursos da carreira.
 *
 * Cursos com POSIÇÃO seguem a trilha: etapa futura trava (`future-tier`) e, na
 * etapa atual, o curso-base (posição 1) destrava os demais (`foundation-first`).
 * Cursos BÔNUS (`careerSlot=null`) são RECOMPENSA da etapa (`tier-reward`,
 * decisão 24/07): abrem quando a etapa correspondente COMPLETA — todos os slots
 * dela qualificados, que é exatamente o momento do level-up.
 *
 * `foundationAvailable` diz se existe um curso-base (`careerSlot=1`) PUBLICADO na
 * etapa. Sem ele NÃO há como destravar (concluir+publicar os obrigatórios é a
 * única chave), então tanto `foundation-first` quanto `tier-reward` falhariam a
 * etapa — e a carreira — para sempre. Nesse caso a política falha ABERTA: a trava
 * pedagógica só vale quando existe base alcançável. (No bônus isso também protege
 * o ROLLOUT: um catálogo sem etapas montadas nasce todo-bônus e nada trava.)
 * Default `true` para compatibilidade.
 */
export function resolveCareerCourseLock(
  qualified: QualifiedCareerSlots,
  courseTier: CareerCourseTier,
  careerSlot: number | null,
  foundationAvailable = true,
): CareerCourseLock {
  const level = creatorCareerLevel(computeCareerLevelSlug(qualified))
  if (level.learningTier === null) return { locked: false }

  const learningIndex = CAREER_COURSE_TIERS.indexOf(level.learningTier)
  const courseIndex = CAREER_COURSE_TIERS.indexOf(courseTier)
  // Etapa já COMPLETADA: posição vira revisão; bônus é recompensa GANHA.
  if (courseIndex < learningIndex) return { locked: false }

  if (careerSlot === null) {
    if (!foundationAvailable) return { locked: false }
    // O nível-alvo é o que o aluno VIRA ao completar esta etapa: o 1º nível cuja
    // régua cumulativa já exige TODOS os slots dela.
    const fullSlots = CREATOR_CAREER_LEVELS.at(-1)?.requiredSlots[courseTier] ?? []
    const requiredLevel = CREATOR_CAREER_LEVELS.find(
      (candidate) => (candidate.requiredSlots[courseTier]?.length ?? 0) >= fullSlots.length,
    )?.slug
    return {
      locked: true,
      reason: 'tier-reward',
      requiredLevel,
      requiredTier: courseTier,
    }
  }

  if (courseIndex > learningIndex) {
    // O nível-alvo é o PRIMEIRO que passa a estudar esta etapa (só faz sentido
    // no future-tier; noob e coder compartilham o learningTier inicial).
    const requiredLevel = CREATOR_CAREER_LEVELS.find(
      (candidate) => candidate.learningTier === courseTier,
    )?.slug
    return {
      locked: true,
      reason: 'future-tier',
      requiredLevel,
      requiredTier: courseTier,
    }
  }

  if (careerSlot === 1 || slotSet(qualified, courseTier).has(1)) return { locked: false }
  // Sem curso-base publicado na etapa, travar as demais posições prenderia o aluno
  // para sempre (nada a concluir para liberar). Fail-open.
  if (!foundationAvailable) return { locked: false }
  // Sem `requiredLevel` aqui: a chave do foundation-first é o CURSO-BASE, não um
  // nível — o aluno já está na etapa certa.
  return {
    locked: true,
    reason: 'foundation-first',
    requiredTier: courseTier,
  }
}
