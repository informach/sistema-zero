import { type CourseTierSlug, courseTierOf } from '@sistemazero/member-shell/lib/course-tier'
import { LEVEL_ORDER } from '@/lib/level-info'
import type { CatalogCourseView, StudentLevelSlug, StudentLevelView } from '@/lib/types'

/**
 * Regras PURAS do Mapa da Carreira (/cursos): que trilha cada nível estuda, quais
 * cursos essa trilha MOSTRA, o estado de cada nó e quando uma trilha está bloqueada.
 * A APRESENTAÇÃO vive em `components/kids/career-map.tsx`; a régua real de acesso é
 * do members (a página da trilha só decide o que MOSTRAR).
 */

/** Etapa que cada nível ESTUDA (espelha o `learningTier` do core). `null` = topo. */
export const LEVEL_TIER: Record<StudentLevelSlug, CourseTierSlug | null> = {
  noob: 'iniciante-2d',
  coder: 'iniciante-2d',
  hacker: 'iniciante-3d',
  explorer: 'intermediario-2d',
  elite: 'intermediario-3d',
  architect: 'avancado-2d',
  champion: 'avancado-3d',
  god: null,
}

export interface LevelStudy {
  /** Posições OBRIGATÓRIAS que esta trilha estuda (`careerSlot`). */
  slots: readonly number[]
  /** Inclui os cursos BÔNUS (`careerSlot` nulo = recompensa da etapa)? */
  includeBonus: boolean
}

/**
 * Slots que cada nível ESTUDA dentro do seu degrau + se a trilha dele inclui os
 * cursos bônus. Espelha a escada do core (`CREATOR_CAREER_LEVELS`): os slots são
 * `próximoNível.requiredSlots[tier] \ esteNível.requiredSlots[tier]` e o bônus entra
 * no ÚLTIMO nível que estuda o tier. Só o Iniciante 2D é DIVIDIDO — Faísca vê só o
 * curso-base (slot 1) e Construtor vê o resto (2–6) + o bônus; os demais degraus têm
 * um único nível e mostram tudo. A conformidade com o core é travada em
 * `tests/career-conformance.test.ts`.
 */
export const LEVEL_STUDY: Record<StudentLevelSlug, LevelStudy | null> = {
  noob: { slots: [1], includeBonus: false },
  coder: { slots: [2, 3, 4, 5, 6], includeBonus: true },
  hacker: { slots: [1, 2, 3, 4, 5], includeBonus: true },
  explorer: { slots: [1, 2, 3, 4, 5], includeBonus: true },
  elite: { slots: [1, 2, 3, 4, 5], includeBonus: true },
  architect: { slots: [1, 2, 3, 4, 5], includeBonus: true },
  champion: { slots: [1, 2, 3, 4, 5], includeBonus: true },
  god: null,
}

export type CareerNodeState = 'done' | 'current' | 'locked'

/** Normaliza um slug possivelmente desconhecido (forward-compat) → Faísca. */
function asLevelSlug(slug: StudentLevelSlug | string): StudentLevelSlug {
  return (LEVEL_ORDER as string[]).includes(slug) ? (slug as StudentLevelSlug) : 'noob'
}

/** Estado do nó no mapa. Nível atual desconhecido (forward-compat) → trata como Faísca. */
export function careerNodeState(
  current: StudentLevelSlug | string,
  node: StudentLevelSlug,
): CareerNodeState {
  const currentIndex = Math.max(0, LEVEL_ORDER.indexOf(current as StudentLevelSlug))
  const nodeIndex = LEVEL_ORDER.indexOf(node)
  if (nodeIndex === currentIndex) return 'current'
  return nodeIndex < currentIndex ? 'done' : 'locked'
}

/** O 1º nível que estuda a trilha (o "dono" do degrau — noob p/ iniciante-2d). */
export function levelForTier(tier: CourseTierSlug): StudentLevelSlug {
  return LEVEL_ORDER.find((slug) => LEVEL_TIER[slug] === tier) ?? 'noob'
}

/**
 * Cursos que a trilha de um NÍVEL mostra. O degrau (`level`+`track`) define o
 * conjunto; o `careerSlot` divide DENTRO dele: Faísca vê só o curso-base (slot 1),
 * Construtor vê os demais (2–6) + o bônus. Fail-open de rollout: se a etapa ainda
 * não tem curso-base marcado (nenhum `careerSlot === 1`), NÃO divide — mostra o
 * degrau inteiro (espelha `foundationAvailable` do core), então a Faísca nunca fica
 * vazia enquanto o catálogo não está etiquetado. `god` (topo) não tem trilha.
 */
/**
 * Cursos da trilha da LENDA (`god`): os cursos de NÍVEL `lenda` — bônus "de formatura"
 * FORA da carreira (não são degrau, não contam, não travam). Aparecem só ao clicar na
 * Lenda no mapa (nó liberado só p/ quem chegou à Lenda).
 */
export function lendaCourses(courses: readonly CatalogCourseView[]): CatalogCourseView[] {
  return courses.filter((course) => course.level === 'lenda')
}

export function coursesForLevel(
  levelSlug: StudentLevelSlug | string,
  courses: readonly CatalogCourseView[],
): CatalogCourseView[] {
  const slug = asLevelSlug(levelSlug)
  // A Lenda (topo) não estuda um degrau da carreira: a trilha dela são os cursos
  // de nível `lenda` (bônus da formatura). `LEVEL_TIER.god` segue `null`.
  if (slug === 'god') return lendaCourses(courses)
  const tier = LEVEL_TIER[slug]
  if (!tier) return []
  const inTier = courses.filter((course) => courseTierOf(course.level, course.track) === tier)
  const study = LEVEL_STUDY[slug]
  if (!study) return inTier
  const hasFoundation = inTier.some((course) => course.careerSlot === 1)
  if (!hasFoundation) return inTier
  const slots = new Set(study.slots)
  return inTier.filter(
    (course) =>
      (typeof course.careerSlot === 'number' && slots.has(course.careerSlot)) ||
      (course.careerSlot == null && study.includeBonus),
  )
}

/**
 * Trilha bloqueada p/ deep-link em `/cursos/trilha/[level]`: o nível da rota está
 * ACIMA do atual E nenhum curso da trilha dele veio liberado. A 2ª condição é o
 * escape p/ EQUIPE (privileged chega sem travas do members) e p/ estados estranhos —
 * quem tem conteúdo acessível de verdade nunca é murado pela apresentação.
 */
export function trilhaLocked(
  level: StudentLevelView | null | undefined,
  levelSlug: StudentLevelSlug | string,
  courses: readonly CatalogCourseView[],
): boolean {
  if (!level) return false
  const currentIndex = Math.max(0, LEVEL_ORDER.indexOf(level.slug as StudentLevelSlug))
  if (currentIndex >= LEVEL_ORDER.indexOf(asLevelSlug(levelSlug))) return false
  const anyOpen = coursesForLevel(levelSlug, courses).some(
    (course) => course.hasAccess && course.careerLock?.locked !== true,
  )
  return !anyOpen
}
