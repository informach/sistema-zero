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
  // ⚠️ Desde 14/08 a Faísca tem degrau PRÓPRIO: o curso-base saiu do Iniciante 2D e virou
  // `primeiros-passos-2d`. Antes os dois primeiros postos dividiam o mesmo degrau e a
  // divisão era só apresentação — por isso a Faísca não podia ter curso bônus.
  noob: 'primeiros-passos-2d',
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
 * no ÚLTIMO nível que estuda o tier. Desde 14/08 **cada nível é dono de um degrau
 * INTEIRO** (a Faísca ganhou o `primeiros-passos-2d`, com 1 posição), então toda trilha
 * inclui os bônus do seu degrau — inclusive a da Faísca, que era justamente o que
 * faltava. A conformidade com o core é travada em `tests/career-conformance.test.ts`.
 *
 * ⚠️ O Construtor(a) estudou 7 posições por um dia (14/08 a 15/08), quando o Iniciante 2D
 * foi encolhido para o total da carreira continuar 48. A usuária desfez: todo degrau que
 * não é a entrada tem 8.
 */
export const LEVEL_STUDY: Record<StudentLevelSlug, LevelStudy | null> = {
  noob: { slots: [1], includeBonus: true },
  coder: { slots: [1, 2, 3, 4, 5, 6, 7, 8], includeBonus: true },
  hacker: { slots: [1, 2, 3, 4, 5, 6, 7, 8], includeBonus: true },
  explorer: { slots: [1, 2, 3, 4, 5, 6, 7, 8], includeBonus: true },
  elite: { slots: [1, 2, 3, 4, 5, 6, 7, 8], includeBonus: true },
  architect: { slots: [1, 2, 3, 4, 5, 6, 7, 8], includeBonus: true },
  champion: { slots: [1, 2, 3, 4, 5, 6, 7, 8], includeBonus: true },
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
  // ⚠️ O desvio "sem curso-base marcado, mostra o degrau inteiro" MORREU em 14/08: ele
  // existia porque Faísca e Construtor(a) dividiam o `iniciante-2d` por slot e, com o
  // catálogo não etiquetado, a Faísca ficava vazia. Agora cada nível é dono de um degrau
  // inteiro e o bônus entra em todas as trilhas, então o curso sem posição aparece igual.
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
