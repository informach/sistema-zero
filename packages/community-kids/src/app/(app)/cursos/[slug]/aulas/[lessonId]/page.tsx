import { notFound } from 'next/navigation'
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
  const [courseRes, lessonRes, session, me] = await Promise.all([
    getMyCourse(slug),
    getLesson(slug, lessonId),
    getSession(),
    // Avatar p/ o passo de agradecimento da classificação (não vive nas claims).
    getMeReadonly(),
  ])
  if (courseRes.status === 404 || courseRes.status === 403 || lessonRes.status === 404) notFound()
  if (courseRes.status !== 200 || !courseRes.body) throw new Error('Falha ao carregar o curso')
  if (lessonRes.status !== 200 || !lessonRes.body) throw new Error('Falha ao carregar a aula')

  const course = courseRes.body
  const lesson = lessonRes.body

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
      ratingViewer={{
        firstName: session?.firstName ?? null,
        lastName: session?.lastName ?? null,
        email: session?.email ?? null,
        avatarUrl: me.status === 200 ? (me.body?.user?.avatarUrl ?? null) : null,
      }}
      // Compartilhar usa a página de vendas do curso; kids não tem FUNNEL_URL
      // (decisão da v1) — sem salesPageUrl o botão fica oculto.
      shareUrl={course.salesPageUrl}
    />
  )
}
