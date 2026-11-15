/**
 * Para quem é o curso (14/11/2026, decisão da dona): no Kids, um curso é para a CRIANÇA (o de
 * sempre) ou para os PAIS (cursos de acompanhamento e desenvolvimento, feitos pelo responsável na
 * área dos pais). A audiência continua `kids`: a chave dos cursos Kids libera os dois.
 *
 * - `child`: trilha, Jornada do Criador, catálogo da criança, carreira, XP.
 * - `parents`: só existe em "Cursos para pais", na área dos pais. Quem faz é a CONTA do
 *   responsável (sessão sem perfil): sem Jornada (sem `careerSlot`), sem XP nem moedas, fora do
 *   catálogo da criança, da liberação de blocos do Estúdio e da base do Zappy. Só gravado.
 */
export const COURSE_LEARNERS = ['child', 'parents'] as const
export type CourseLearner = (typeof COURSE_LEARNERS)[number]
export const DEFAULT_COURSE_LEARNER: CourseLearner = 'child'

export function isCourseLearner(value: unknown): value is CourseLearner {
  return COURSE_LEARNERS.some((learner) => learner === value)
}

/** Ausente ou desconhecido = criança: curso anterior ao campo é da criança. */
export function courseLearnerOf(value: unknown): CourseLearner {
  return isCourseLearner(value) ? value : DEFAULT_COURSE_LEARNER
}

export function isParentsCourse(course: { learner?: unknown } | null | undefined): boolean {
  return courseLearnerOf(course?.learner) === 'parents'
}
