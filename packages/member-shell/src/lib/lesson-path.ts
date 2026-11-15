/**
 * Página de aula nas duas comunidades, incluindo eventuais sub-rotas. No Kids, a aula do curso
 * para pais (14/11/2026) mora em `/pais/cursos/...` e usa o mesmo regime (modo foco, rodapé).
 */
export const LESSON_PATH = /^(?:\/pais)?\/cursos\/[^/]+\/aulas\/[^/]+/

export function isLessonPath(pathname: string | null | undefined): boolean {
  return LESSON_PATH.test(pathname ?? '')
}
