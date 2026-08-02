import type { StudioTutorLessonReference } from '@sistemazero/studio'

export function studioZappyLessonPath(reference: StudioTutorLessonReference): string | null {
  const slug = reference.courseSlug?.trim()
  if (!slug || !reference.lessonId) return null
  return `/cursos/${encodeURIComponent(slug)}/aulas/${encodeURIComponent(reference.lessonId)}`
}

export function openStudioZappyLesson(reference: StudioTutorLessonReference): void {
  const path = studioZappyLessonPath(reference)
  if (path) window.open(path, '_blank', 'noopener,noreferrer')
}
