import { notFound } from 'next/navigation'
import { getEnv } from '@/lib/env'
import type { LessonOutlineView } from '@/lib/types'
import { getMeReadonly } from '@/server/auth'
import { getLesson, getMyCourse } from '@/server/members'
import { getSession } from '@/server/session'
import { LessonPlayer } from './lesson-player-client'

export const dynamic = 'force-dynamic'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const [courseRes, lessonRes, session, meRes] = await Promise.all([
    getMyCourse(slug),
    getLesson(slug, lessonId),
    getSession(),
    // Avatar fresco p/ o passo de agradecimento do rating (claims não carregam foto).
    getMeReadonly(),
  ])
  if (courseRes.status === 404 || courseRes.status === 403 || lessonRes.status === 404) notFound()
  if (courseRes.status !== 200 || !courseRes.body) throw new Error('Falha ao carregar o curso')
  if (lessonRes.status !== 200 || !lessonRes.body) throw new Error('Falha ao carregar a aula')

  const course = courseRes.body
  const lesson = lessonRes.body
  const me = meRes.status === 200 ? meRes.body?.user : undefined

  // Navegação anterior/próxima: derivada do outline (a API não fornece).
  const flat: LessonOutlineView[] = course.modules.flatMap((m) => m.lessons)
  const index = flat.findIndex((l) => l.id === lesson.id)
  const href = (l: LessonOutlineView | undefined) =>
    l ? `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(l.id)}` : null

  return (
    <LessonPlayer
      course={course}
      lesson={lesson}
      prevHref={href(index > 0 ? flat[index - 1] : undefined)}
      nextHref={href(index >= 0 ? flat[index + 1] : undefined)}
      viewerEmail={session?.email ?? null}
      viewer={{
        firstName: session?.firstName ?? null,
        lastName: session?.lastName ?? null,
        email: session?.email ?? null,
        avatarUrl: me?.avatarUrl ?? null,
      }}
      // URL de compartilhar (env é server-only — resolve aqui, igual a /cursos).
      shareUrl={course.salesPageUrl ?? getEnv().FUNNEL_URL ?? null}
    />
  )
}
