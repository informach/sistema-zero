import { type CourseTierSlug, courseTierOf } from '@sistemazero/member-shell/lib/course-tier'
import { LEVEL_ORDER } from '@/lib/level-info'
import type { CatalogCourseView, StudentLevelSlug, StudentLevelView } from '@/lib/types'

/**
 * Regras PURAS do Mapa da Carreira (/cursos): que trilha cada nível estuda, o
 * estado de cada nó e quando uma trilha está bloqueada. A APRESENTAÇÃO vive em
 * `components/kids/career-map.tsx`; a régua real de acesso é do members (a
 * página da trilha só decide o que MOSTRAR).
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

export type CareerNodeState = 'done' | 'current' | 'locked'

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

/** O 1º nível que estuda a trilha (o "dono" do nó — noob p/ iniciante-2d). */
export function levelForTier(tier: CourseTierSlug): StudentLevelSlug {
  return LEVEL_ORDER.find((slug) => LEVEL_TIER[slug] === tier) ?? 'noob'
}

/**
 * Trilha bloqueada p/ deep-link em `/cursos/trilha/[tier]`: o nível dono está
 * acima do atual E nenhum curso do tier veio liberado. A 2ª condição é o escape
 * p/ EQUIPE (privileged chega sem travas do members) e p/ estados estranhos —
 * quem tem conteúdo acessível de verdade nunca é murado pela apresentação.
 */
export function trilhaLocked(
  level: StudentLevelView | null | undefined,
  tier: CourseTierSlug,
  courses: readonly CatalogCourseView[],
): boolean {
  if (!level) return false
  const currentIndex = Math.max(0, LEVEL_ORDER.indexOf(level.slug))
  if (currentIndex >= LEVEL_ORDER.indexOf(levelForTier(tier))) return false
  const anyOpen = courses.some(
    (course) =>
      courseTierOf(course.level, course.track) === tier &&
      course.hasAccess &&
      course.careerLock?.locked !== true,
  )
  return !anyOpen
}
