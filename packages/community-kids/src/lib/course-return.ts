import { courseTierOf } from '@sistemazero/member-shell/lib/course-tier'
import { LEVEL_TIER, levelForTier } from '@/lib/career-map'
import { LEVEL_ORDER } from '@/lib/level-info'
import type { CourseLevelSlug, CourseTrack, StudentLevelSlug } from '@/lib/types'

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
 * Não basta o degrau: o Iniciante 2D é DIVIDIDO entre dois níveis (`LEVEL_STUDY`
 * em `career-map.ts`) — a Faísca estuda só o curso-base (slot 1) e o Construtor,
 * o resto + os bônus. Mandar a criança para a trilha errada a faria procurar o
 * curso numa lista que não o contém.
 *
 * `lenda` fica FORA da carreira (bônus da formatura) e vive na trilha da Lenda.
 * Curso sem `level` (members antigo) → `null`, e a volta cai no mapa.
 */
export function trilhaHrefForCourse(
  course: CourseBackInput,
  /** Nível do aluno — desempata o Iniciante 2D durante o rollout (ver abaixo). */
  viewerLevel?: StudentLevelSlug | null,
): string | null {
  if (course.level === 'lenda') return '/cursos/trilha/god'
  const tier = courseTierOf(course.level, course.track)
  if (!tier) return null
  if (tier === 'iniciante-2d') {
    const derivado: StudentLevelSlug = course.careerSlot === 1 ? 'noob' : 'coder'
    // Fail-open de rollout: enquanto a etapa não tem curso-base etiquetado
    // (`careerSlot === 1`), o `coursesForLevel` NÃO divide — Faísca e Construtor
    // mostram o degrau inteiro. Dividir pelo slot ali manda uma Faísca para a trilha
    // do Construtor, que o mapa mostra com cadeado. Quando o derivado fica ACIMA do
    // nível do aluno e ele estuda este mesmo degrau, a trilha DELE é a certa — e no
    // catálogo já etiquetado essa condição praticamente não dispara (a trava de
    // carreira barra a Faísca nos slots 2+ antes de chegar aqui; equipe ignora a trava
    // e pode cair na trilha do próprio nível, que é cosmético).
    // O `LEVEL_TIER[viewerLevel] === tier` parece redundante para os 8 slugs conhecidos
    // (quem é de outro degrau já tem índice maior), mas é ele que segura o slug
    // DESCONHECIDO — `indexOf` devolve -1, `0 > -1` passa, e a volta iria para uma
    // trilha inexistente. Travado por teste.
    const sobeDeNivel =
      viewerLevel !== null &&
      viewerLevel !== undefined &&
      LEVEL_TIER[viewerLevel] === tier &&
      LEVEL_ORDER.indexOf(derivado) > LEVEL_ORDER.indexOf(viewerLevel)
    return `/cursos/trilha/${sobeDeNivel ? viewerLevel : derivado}`
  }
  return `/cursos/trilha/${levelForTier(tier)}`
}

export function resolveCourseBack(
  from: string | undefined,
  course: CourseBackInput,
  viewerLevel?: StudentLevelSlug | null,
): CourseBackTarget {
  if (from === 'inicio') return { href: '/', label: 'Voltar ao início' }
  const trilha = trilhaHrefForCourse(course, viewerLevel)
  return trilha ? { href: trilha, label: 'Voltar à trilha' } : MAPA
}
