import type { StudioTutorHelpReference, StudioTutorLessonReference } from '@sistemazero/studio'

export function studioZappyLessonPath(reference: StudioTutorLessonReference): string | null {
  const slug = reference.courseSlug?.trim()
  if (!slug || !reference.lessonId) return null
  return `/cursos/${encodeURIComponent(slug)}/aulas/${encodeURIComponent(reference.lessonId)}`
}

export function openStudioZappyLesson(reference: StudioTutorLessonReference): void {
  const path = studioZappyLessonPath(reference)
  if (path) window.open(path, '_blank', 'noopener,noreferrer')
}

/** O caminho de um tutorial do "Como fazer" citado pelo Zappy; `null` se o slug não é slug. */
export function studioZappyHelpPath(reference: StudioTutorHelpReference): string | null {
  const slug = reference.slug?.trim()
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null
  return `/como-fazer/${encodeURIComponent(slug)}`
}

/** Abre o passo a passo em outra aba: o Estúdio fica como está. */
export function openStudioZappyHelp(reference: StudioTutorHelpReference): void {
  const path = studioZappyHelpPath(reference)
  if (path) window.open(path, '_blank', 'noopener,noreferrer')
}
