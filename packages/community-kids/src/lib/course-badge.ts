import type { CourseMilestonesView } from '@/lib/types'

/**
 * O selo de estado do card de curso — e, com ele, a régua de "aventura pronta".
 *
 * O contador do medalhão diz "8 de 9" e a criança entra na trilha; sem selo, os nove
 * cards são idênticos e não há como saber qual falta nem por quê. Este módulo é a
 * outra metade daquele contador: a MESMA régua, agora visível curso a curso.
 *
 * | curso | pronta quando | selo de pendência |
 * |---|---|---|
 * | de POSIÇÃO (`careerSlot`) | concluiu **e** publicou no Mural | "Publique no Mural" |
 * | BÔNUS (`careerSlot` nulo) | só concluiu | nenhum |
 *
 * ⚠️⚠️ Bônus NUNCA pede o Mural. Publicar não é exigência dele em régua nenhuma —
 * cobrar seria inventar uma dívida que não existe, exatamente a mentira que a régua
 * mista foi feita para matar.
 *
 * ⚠️ Os marcos vêm do LEDGER (members), não do progresso do curso: progresso regride
 * quando a autora publica uma aula nova, e aí o card diria "pronta" para um curso que
 * o contador não conta. Selo e contador leem daqui, então não podem divergir.
 *
 * ⚠️ Sem marcos (`milestones` ausente: members antigo, vitrine adulta ou equipe fora
 * da vitrine kids) o card não mostra selo algum. Silêncio é melhor que um selo errado.
 */

export type CourseBadge = 'pronta' | 'publicar'

export interface CourseBadgeInput {
  /** Posição na trilha; `null`/ausente = curso bônus. */
  careerSlot?: number | null
  milestones?: CourseMilestonesView
}

/** Curso de posição obrigatória (≠ bônus-recompensa). */
function isSlotCourse(course: CourseBadgeInput): boolean {
  return typeof course.careerSlot === 'number'
}

/** A aventura conta como PRONTA? É a régua mista, num curso só. */
export function courseIsDone(course: CourseBadgeInput): boolean {
  const marcos = course.milestones
  if (!marcos?.completed) return false
  return isSlotCourse(course) ? marcos.showcased : true
}

/** O selo do card: pronta, falta publicar, ou nada. */
export function courseBadge(course: CourseBadgeInput): CourseBadge | null {
  if (courseIsDone(course)) return 'pronta'
  // Só quem tem posição na trilha deve o Mural — e só depois de concluir.
  if (isSlotCourse(course) && course.milestones?.completed) return 'publicar'
  return null
}

/** Texto do selo. Curto: ele mora sobre a capa, não no rodapé. */
export const COURSE_BADGE_LABEL: Record<CourseBadge, string> = {
  pronta: 'Pronta!',
  publicar: 'Publique no Mural',
}
