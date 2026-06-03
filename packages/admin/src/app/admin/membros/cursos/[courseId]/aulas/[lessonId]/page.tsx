import { getSession } from '@/server/session'
import { LessonEditorClient } from './lesson-editor-client'

export const dynamic = 'force-dynamic'

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params
  const session = await getSession()
  return (
    <LessonEditorClient courseId={courseId} lessonId={lessonId} currentRole={session?.role ?? ''} />
  )
}
