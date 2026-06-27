import { notFound } from 'next/navigation'
import { KidsLockedLesson } from '@/components/kids/kids-locked-lesson'
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
  if (courseRes.status === 404 || courseRes.status === 403) notFound()
  if (courseRes.status !== 200 || !courseRes.body) throw new Error('Falha ao carregar o curso')
  const course = courseRes.body

  // Aula travada pela trava sequencial (members → 423): recado kids, não erro.
  if (lessonRes.status === 423) return <KidsLockedLesson courseSlug={course.slug} />
  if (lessonRes.status === 404) notFound()
  if (lessonRes.status !== 200 || !lessonRes.body) throw new Error('Falha ao carregar a aula')

  const lesson = lessonRes.body

  // Navegação anterior/próxima: derivada do outline (a API não fornece).
  const flat: LessonOutlineView[] = course.modules.flatMap((m) => m.lessons)
  const index = flat.findIndex((l) => l.id === lesson.id)
  const href = (l: LessonOutlineView | undefined) =>
    l ? `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(l.id)}` : null
  const nextOutline = index >= 0 ? flat[index + 1] : undefined
  // Próxima aula na ORDEM (ignora a trava): a comemoração usa este link — ao concluir,
  // a aula atual já destravou a próxima. O botão "Próxima" do rodapé (nextHref) fica travado.
  const nextLessonHref = href(nextOutline)

  return (
    <LessonPlayer
      course={course}
      lesson={lesson}
      prevHref={href(index > 0 ? flat[index - 1] : undefined)}
      nextHref={nextOutline && !nextOutline.locked ? nextLessonHref : null}
      nextLessonHref={nextLessonHref}
      viewerEmail={session?.email ?? null}
      viewerId={session?.id ?? null}
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
