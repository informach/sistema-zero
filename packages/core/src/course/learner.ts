import type { LessonDraftIssue } from '../learning'

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

/** Blocos que só abrem na sessão de uma criança (precisam do Estúdio ou do Pinta dela). */
const CHILD_ONLY_BLOCK_KINDS = new Set(['studio', 'pinta'])

/**
 * A aula de um curso para pais não publica Estúdio nem Pinta: a conta do responsável não abre as
 * ferramentas da criança. Vídeo, texto, fala do Zappy, quiz, materiais, livro, experiências e
 * certificado funcionam.
 */
export function parentsLessonIssues(
  blocks: readonly { id: string; content: { kind: string } }[],
): LessonDraftIssue[] {
  return blocks
    .filter((block) => CHILD_ONLY_BLOCK_KINDS.has(block.content.kind))
    .map((block) => ({
      blockId: block.id,
      message:
        'Curso para pais não usa Estúdio nem Pinta: essas ferramentas abrem só para as crianças. Use vídeo, texto, quiz, materiais ou certificado.',
    }))
}
