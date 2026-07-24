import { notFound } from 'next/navigation'
import { careerLockReason, KidsLockedCourse } from '@/components/kids/kids-locked-course'
import { KidsLockedLesson } from '@/components/kids/kids-locked-lesson'
import type { LessonOutlineView } from '@/lib/types'
import { computeAgeFromBirthDate } from '@/lib/user-display'
import { getMeReadonly } from '@/server/auth'
import { getLesson, getMyCourse } from '@/server/members'
import { listReadonly as listProfilesReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { LessonPlayer } from './lesson-player-client'

export const dynamic = 'force-dynamic'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const [courseRes, lessonRes, session, me, profilesRes] = await Promise.all([
    getMyCourse(slug),
    getLesson(slug, lessonId),
    getSession(),
    // Avatar p/ o passo de agradecimento da classificação (não vive nas claims).
    getMeReadonly(),
    // Perfis da conta → o ATIVO (a criança) dá nome + nascimento + foto p/ a
    // classificação (nunca o e-mail/nome do responsável). Best-effort.
    listProfilesReadonly(),
  ])
  if (courseRes.status === 404 || courseRes.status === 403) notFound()
  if (courseRes.status === 423)
    return <KidsLockedCourse reason={careerLockReason(courseRes.body)} />
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

  // Perfil ATIVO = a criança (id da sessão). Server-side e best-effort: o nascimento
  // só é usado p/ a idade da PRÓPRIA criança (sem vazar dados de outros perfis).
  const activeProfile =
    profilesRes.status === 200
      ? profilesRes.body?.profiles.find((p) => p.id === session?.id)
      : undefined

  return (
    <LessonPlayer
      course={course}
      lesson={lesson}
      prevHref={href(index > 0 ? flat[index - 1] : undefined)}
      nextHref={nextOutline && !nextOutline.locked ? nextLessonHref : null}
      nextLessonHref={nextLessonHref}
      viewerWatermark={session?.id ? `Perfil ${session.id.slice(0, 8)}` : null}
      viewerId={session?.id ?? null}
      ratingViewer={{
        name: activeProfile?.name ?? session?.activeProfile?.name ?? null,
        age: computeAgeFromBirthDate(activeProfile?.birthDate),
        avatarUrl:
          activeProfile?.avatarUrl ??
          (me.status === 200 ? (me.body?.user?.avatarUrl ?? null) : null),
      }}
      // Compartilhar usa a página de vendas do curso; kids não tem FUNNEL_URL
      // (decisão da v1) — sem salesPageUrl o botão fica oculto.
      shareUrl={course.salesPageUrl}
    />
  )
}
