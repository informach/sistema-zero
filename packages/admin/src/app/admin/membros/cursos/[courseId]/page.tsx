import { getSession } from '@/server/session'
import { CourseEditorClient } from './course-editor-client'

export const dynamic = 'force-dynamic'

export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const session = await getSession()
  return <CourseEditorClient courseId={courseId} currentRole={session?.role ?? ''} />
}
