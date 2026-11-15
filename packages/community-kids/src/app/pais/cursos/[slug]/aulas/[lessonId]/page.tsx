import { notFound, redirect } from 'next/navigation'
import { LessonPlayer } from '@/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client'
import { KidsLockedLesson } from '@/components/kids/kids-locked-lesson'
import type { LessonOutlineView } from '@/lib/types'
import { getLesson, getMyCourse } from '@/server/members'
import { getSession } from '@/server/session'
import { parentCourseHref } from '../../../../parent-routes'
import { ParentLessonFrame } from './parent-lesson-frame'

export const dynamic = 'force-dynamic'

/**
 * A aula de um curso para pais (14/11/2026): a MESMA tela da aula da criança (o `LessonPlayer`
 * do Kids, com as partes, os blocos, o rodapé e a lista de aulas), dentro da moldura da área dos
 * pais. Sem fala nem rascunho na conta (são da criança); a marca d'água é a da conta e a resposta
 * do "Preciso de ajuda" aparece na Ajuda dos pais.
 */
export default async function ParentLessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const { slug, lessonId } = await params
  const [courseRes, lessonRes] = await Promise.all([getMyCourse(slug), getLesson(slug, lessonId)])
  if (courseRes.status === 403) redirect(parentCourseHref(slug))
  if (courseRes.status === 404 || courseRes.status === 423) notFound()
  if (courseRes.status !== 200 || !courseRes.body) throw new Error('Falha ao carregar o curso')
  const course = courseRes.body
  if (lessonRes.status === 423)
    return (
      <ParentLessonFrame viewerId={session.id} parentName={session.firstName}>
        <KidsLockedLesson courseSlug={course.slug} courseHref={parentCourseHref(course.slug)} />
      </ParentLessonFrame>
    )
  if (lessonRes.status === 404) notFound()
  if (lessonRes.status !== 200 || !lessonRes.body) throw new Error('Falha ao carregar a aula')
  const lesson = lessonRes.body
  const flat: LessonOutlineView[] = course.modules.flatMap((m) => m.lessons)
  const index = flat.findIndex((l) => l.id === lesson.id)
  const nextOutline = index >= 0 ? flat[index + 1] : undefined
  return (
    <ParentLessonFrame viewerId={session.id} parentName={session.firstName}>
      <LessonPlayer
        key={`${session.id}:${lesson.id}`}
        course={course}
        lesson={lesson}
        nextLessonHref={nextOutline ? parentCourseHref(course.slug, nextOutline.id) : null}
        viewerWatermark={`Conta ${session.id.slice(0, 8)}`}
        viewerId={session.id}
        ratingViewer={{ name: session.firstName ?? null, age: null, avatarUrl: null }}
        shareUrl={null}
        courseBasePath="/pais/cursos"
        helpThreadPath="/pais/ajuda/duvidas"
      />
    </ParentLessonFrame>
  )
}
