import { courseTierOf } from '@sistemazero/member-shell/lib/course-tier'
import { type JourneyCoursePolicy, levelForTier } from '@/lib/journey-map'
import type { CourseLevelSlug, CourseTrack } from '@/lib/types'

/**
 * Para onde a setinha da página do curso volta.
 *
 * A página é alcançável por vários caminhos (home, trilha, card de curso-base,
 * aula, celebração) e antes não tinha saída nenhuma. A origem viaja na URL
 * (`?de=`), emitida só pelas saídas da HOME; sem ela — link direto, favorito,
 * volta da aula — o destino é a TRILHA que lista este curso, que é a migalha de
 * pão natural (curso → trilha → mapa).
 *
 * `?de=` vem da URL, então é ALLOWLIST, nunca um caminho livre (mesma régua do
 * `resolveAvatarReturnPath`): valor desconhecido cai no default em silêncio.
 */

/** O que a volta precisa saber do curso — subconjunto de `CourseDetailView`. */
export interface CourseBackInput {
  level?: CourseLevelSlug
  track?: CourseTrack
  careerSlot?: number | null
}

export interface CourseBackTarget {
  href: string
  label: string
}

const MAPA: CourseBackTarget = { href: '/cursos', label: 'Voltar aos cursos' }

/** The canonical policy determines where a tier is shown; unknown state returns to the map. */
export function trilhaHrefForCourse(
  course: CourseBackInput,
  journey: JourneyCoursePolicy | null,
): string | null {
  if (!journey) return null
  if (course.level === 'lenda') return '/cursos/trilha/god'
  const tier = courseTierOf(course.level, course.track)
  if (!tier) return null
  const level = levelForTier(tier, journey)
  return level ? `/cursos/trilha/${level}` : null
}

export function resolveCourseBack(
  from: string | undefined,
  course: CourseBackInput,
  journey: JourneyCoursePolicy | null,
): CourseBackTarget {
  if (from === 'inicio') return { href: '/', label: 'Voltar ao início' }
  const trilha = trilhaHrefForCourse(course, journey)
  return trilha ? { href: trilha, label: 'Voltar à trilha' } : MAPA
}
