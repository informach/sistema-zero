/** Página de aula nas duas comunidades, incluindo eventuais sub-rotas. */
export const LESSON_PATH = /^\/cursos\/[^/]+\/aulas\/[^/]+/

export function isLessonPath(pathname: string | null | undefined): boolean {
  return LESSON_PATH.test(pathname ?? '')
}
