import { apiGet } from './api'
import type { CourseSubmissionCounts } from './types'

/**
 * Contagem de entregas do curso para os confirms de EXCLUSÃO (bloco/aula/módulo/
 * curso): as FKs em cascata apagam `studio_submissions` junto, em silêncio — o
 * confirm precisa dizer quantas entregas de alunos vão embora.
 *
 * Best-effort DE PROPÓSITO: se o members estiver fora, devolve `null` e o confirm
 * abre com a mensagem de sempre — a exclusão nunca fica bloqueada pela contagem.
 */
export async function fetchSubmissionCountsSafe(
  courseId: string,
): Promise<CourseSubmissionCounts | null> {
  try {
    return await apiGet<CourseSubmissionCounts>(
      `/api/members/courses/${encodeURIComponent(courseId)}/submission-counts`,
    )
  } catch {
    return null
  }
}

/** Soma as entregas das aulas de um módulo (o endpoint agrega por aula/bloco). */
export function moduleSubmissionCount(
  counts: CourseSubmissionCounts | null,
  lessonIds: string[],
): number {
  if (!counts) return 0
  return lessonIds.reduce((sum, id) => sum + (counts.byLesson[id] ?? 0), 0)
}

/**
 * Frase do aviso destrutivo (singular/plural). `null` quando não há entregas —
 * o confirm fica como sempre foi.
 */
export function submissionCountWarning(count: number): string | null {
  if (count <= 0) return null
  return count === 1
    ? 'Existe 1 entrega de aluno aqui, e ela será apagada junto.'
    : `Existem ${count} entregas de alunos aqui, e elas serão apagadas junto.`
}
