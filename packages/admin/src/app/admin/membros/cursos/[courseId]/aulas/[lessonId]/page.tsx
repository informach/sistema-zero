import { getEnv } from '@/lib/env'
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
  // "Ver como aluno": URLs públicas dos apps (envs OPCIONAIS — ausentes → botão oculto).
  const env = getEnv()
  return (
    <LessonEditorClient
      courseId={courseId}
      lessonId={lessonId}
      currentRole={session?.role ?? ''}
      studentAppUrls={{ adult: env.COMMUNITY_URL, kids: env.KIDS_COMMUNITY_URL }}
    />
  )
}
