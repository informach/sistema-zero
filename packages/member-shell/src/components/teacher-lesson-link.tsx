'use client'

import type { TeacherThreadView } from '../lib/types'
import { useLessonCopy } from './lesson-copy-context'

/**
 * O caminho de um recado de ajuda de volta à seção em que a dúvida nasceu. O rótulo vem do
 * vocabulário do app (`LessonCopy`): no Kids a parte é "parte".
 */
export function TeacherLessonLink({
  thread,
  courseBasePath = '/cursos',
}: {
  thread: TeacherThreadView | null
  /** `/pais/cursos` na Ajuda da área dos pais (cursos para pais, 14/11/2026). */
  courseBasePath?: string
}) {
  const copy = useLessonCopy()
  const context = thread
    ? [...thread.messages].reverse().find((message) => message.helpContext)?.helpContext
    : null
  if (!context) return null
  return (
    <a
      className="inline-flex rounded-lg border px-3 py-2 text-sm underline"
      href={`${courseBasePath}/${encodeURIComponent(context.courseSlug)}/aulas/${encodeURIComponent(context.lessonId)}#section=${encodeURIComponent(context.sectionId)}`}
    >
      {copy.secoes.voltarParaSecao}: {context.sectionTitle}
    </a>
  )
}
