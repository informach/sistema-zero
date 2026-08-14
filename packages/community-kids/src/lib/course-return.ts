import { courseTierOf } from '@sistemazero/member-shell/lib/course-tier'
import { levelForTier } from '@/lib/career-map'
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

const MAPA: CourseBackTarget = { href: '/cursos', label: 'Voltar ao mapa' }

/**
 * A trilha DONA do curso — a que de fato o lista em `/cursos/trilha/[level]`.
 *
 * ⭐ Ficou de uma linha em 14/08. Antes o Iniciante 2D era DIVIDIDO entre dois postos
 * (Faísca via o curso-base, Construtor(a) via o resto), então era preciso desempatar
 * pelo `careerSlot` e ainda cobrir o fail-open do catálogo não etiquetado — mandar a
 * criança para a trilha errada a faria procurar o curso numa lista que não o contém.
 * Com o degrau de entrada próprio, **cada degrau tem UM dono**, e o dono é o destino.
 *
 * `lenda` fica FORA da carreira (bônus da formatura) e vive na trilha da Lenda.
 * Curso sem `level` (members antigo) → `null`, e a volta cai no mapa.
 */
export function trilhaHrefForCourse(course: CourseBackInput): string | null {
  if (course.level === 'lenda') return '/cursos/trilha/god'
  const tier = courseTierOf(course.level, course.track)
  if (!tier) return null
  return `/cursos/trilha/${levelForTier(tier)}`
}

export function resolveCourseBack(
  from: string | undefined,
  course: CourseBackInput,
): CourseBackTarget {
  if (from === 'inicio') return { href: '/', label: 'Voltar ao início' }
  const trilha = trilhaHrefForCourse(course)
  return trilha ? { href: trilha, label: 'Voltar à trilha' } : MAPA
}
