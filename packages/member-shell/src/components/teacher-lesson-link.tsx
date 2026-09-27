import type { TeacherThreadView } from '../lib/types'
export function TeacherLessonLink({ thread }: { thread: TeacherThreadView | null }) {
  const context = thread
    ? [...thread.messages].reverse().find((message) => message.helpContext)?.helpContext
    : null
  if (!context) return null
  return (
    <a
      className="inline-flex rounded-lg border px-3 py-2 text-sm underline"
      href={`/cursos/${encodeURIComponent(context.courseSlug)}/aulas/${encodeURIComponent(context.lessonId)}#section=${encodeURIComponent(context.sectionId)}`}
    >
      Voltar à seção: {context.sectionTitle}
    </a>
  )
}
