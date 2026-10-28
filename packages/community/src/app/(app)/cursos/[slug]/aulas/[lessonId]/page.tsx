import { creatorCourseLockFromBody } from '@sistemazero/member-shell/lib/creator-journey-presentation'
import { ArrowRight, Lock } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEnv } from '@/lib/env'
import type { LessonOutlineView } from '@/lib/types'
import { getAvatarReadonly, getLesson, getMyCourse } from '@/server/members'
import { getSession } from '@/server/session'
import { LessonPlayer } from './lesson-player-client'

export const dynamic = 'force-dynamic'

/**
 * O recado de aula fechada (423 do members) no Estúdio à noite: o cadeado num ladrilho, o porquê e
 * o caminho de volta no botão amarelo. Serve à trava sequencial e à da Jornada do Criador.
 */
function LockedNotice({
  kicker,
  title,
  message,
  href,
  cta,
}: {
  kicker: string
  title: string
  message: string
  href: string
  cta: string
}) {
  return (
    <section
      role="status"
      className="sz-card mx-auto my-10 flex w-full max-w-xl flex-col items-start gap-4 p-7 md:p-9"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-14 items-center justify-center rounded-2xl bg-(--carta-2) text-(--cta)"
      >
        <Lock className="size-7" />
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="sz-kicker">{kicker}</span>
        <h1 className="sz-h3">{title}</h1>
        <p className="m-0 text-muted-foreground">{message}</p>
      </div>
      <Link href={href} prefetch={false} className="sz-btn">
        {cta} <ArrowRight aria-hidden />
      </Link>
    </section>
  )
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const [courseRes, lessonRes, session, avatarRes] = await Promise.all([
    getMyCourse(slug),
    getLesson(slug, lessonId),
    getSession(),
    // A foto do avatar 3D p/ o passo de agradecimento do rating (claims não carregam foto; a foto
    // enviada saiu na direção de arte de 18/10/2026). Best-effort: sem ela, as iniciais.
    getAvatarReadonly().catch(() => null),
  ])
  if (courseRes.status === 404 || courseRes.status === 403) notFound()
  if (courseRes.status === 423) {
    const lock = creatorCourseLockFromBody(courseRes.body, 'adult')
    return (
      <LockedNotice
        kicker="Jornada do Criador"
        title={lock.title}
        message={lock.message}
        href={lock.href}
        cta={lock.cta}
      />
    )
  }
  if (courseRes.status !== 200 || !courseRes.body) throw new Error('Falha ao carregar o curso')
  const course = courseRes.body

  // Aula travada pela trava sequencial (members → 423): recado gentil, não erro.
  if (lessonRes.status === 423)
    return (
      <LockedNotice
        kicker={course.title}
        title="Aula bloqueada"
        message="Conclua a aula anterior para liberar esta. Você avança uma de cada vez, na ordem."
        href={`/cursos/${encodeURIComponent(course.slug)}`}
        cta="Voltar para o curso"
      />
    )
  if (lessonRes.status === 404) notFound()
  if (lessonRes.status !== 200 || !lessonRes.body) throw new Error('Falha ao carregar a aula')

  const lesson = lessonRes.body
  const avatarPhotoUrl = avatarRes?.status === 200 ? (avatarRes.body?.photoUrl ?? null) : null

  // Próxima aula após concluir; a navegação durante a aula é por seções.
  const flat: LessonOutlineView[] = course.modules.flatMap((m) => m.lessons)
  const index = flat.findIndex((l) => l.id === lesson.id)
  const href = (l: LessonOutlineView | undefined) =>
    l ? `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(l.id)}` : null
  const nextOutline = index >= 0 ? flat[index + 1] : undefined
  // Próxima aula na ORDEM (ignora a trava): concluir a atual destrava a próxima.
  const nextLessonHref = href(nextOutline)

  return (
    <LessonPlayer
      key={`${session?.id ?? 'anonymous'}:${lesson.id}`}
      course={course}
      lesson={lesson}
      nextLessonHref={nextLessonHref}
      viewerWatermark={session?.email ?? null}
      viewerId={session?.id ?? null}
      lessonDraftsEnabled={
        getEnv().LESSON_DRAFTS_ENABLED && session?.act?.mode !== 'readonly' && Boolean(session?.id)
      }
      creationSharingEnabled={Boolean(session?.id) && session?.act?.mode !== 'readonly'}
      viewer={{
        firstName: session?.firstName ?? null,
        lastName: session?.lastName ?? null,
        email: session?.email ?? null,
        avatarUrl: avatarPhotoUrl,
      }}
      // URL de compartilhar (env é server-only — resolve aqui, igual a /cursos).
      shareUrl={course.salesPageUrl ?? getEnv().FUNNEL_URL ?? null}
    />
  )
}
