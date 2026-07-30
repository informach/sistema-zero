/** Página de aula: `/cursos/<slug>/aulas/<lessonId>` (e sub-rotas). */
export const LESSON_PATH = /^\/cursos\/[^/]+\/aulas\/[^/]+/

/** `true` na página de aula (e sub-rotas). Tolera `null`/`undefined` (SSR/1º render). */
export function isLessonPath(pathname: string | null | undefined): boolean {
  return LESSON_PATH.test(pathname ?? '')
}
