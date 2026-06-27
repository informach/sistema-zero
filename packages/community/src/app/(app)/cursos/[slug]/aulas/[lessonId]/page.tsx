import { Card } from '@sistemazero/ui/card'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEnv } from '@/lib/env'
import type { LessonOutlineView } from '@/lib/types'
import { getMeReadonly } from '@/server/auth'
import { getLesson, getMyCourse } from '@/server/members'
import { getSession } from '@/server/session'
import { LessonPlayer } from './lesson-player-client'

export const dynamic = 'force-dynamic'

/** Recado gentil quando o aluno tenta abrir uma aula travada (423 do members). */
function LessonLockedNotice({ courseSlug }: { courseSlug: string }) {
  return (
    <Card className="mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Lock className="size-7 text-muted-foreground" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="sz-display text-xl">Aula bloqueada</h1>
        <p className="text-sm text-muted-foreground">
          Conclua a aula anterior para liberar esta. Você avança uma de cada vez, na ordem.
        </p>
      </div>
      <Link
        href={`/cursos/${encodeURIComponent(courseSlug)}`}
        className="sz-btn-gradient mt-1 self-center"
      >
        Voltar para o curso
      </Link>
    </Card>
  )
}

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
  if (courseRes.status === 404 || courseRes.status === 403) notFound()
  if (courseRes.status !== 200 || !courseRes.body) throw new Error('Falha ao carregar o curso')
  const course = courseRes.body

  // Aula travada pela trava sequencial (members → 423): recado gentil, não erro.
  if (lessonRes.status === 423) return <LessonLockedNotice courseSlug={course.slug} />
  if (lessonRes.status === 404) notFound()
  if (lessonRes.status !== 200 || !lessonRes.body) throw new Error('Falha ao carregar a aula')

  const lesson = lessonRes.body
  const me = meRes.status === 200 ? meRes.body?.user : undefined

  // Navegação anterior/próxima: derivada do outline (a API não fornece).
  const flat: LessonOutlineView[] = course.modules.flatMap((m) => m.lessons)
  const index = flat.findIndex((l) => l.id === lesson.id)
  const href = (l: LessonOutlineView | undefined) =>
    l ? `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(l.id)}` : null
  const nextOutline = index >= 0 ? flat[index + 1] : undefined
  // Próxima aula na ORDEM (ignora a trava): destino do avanço APÓS concluir — concluir
  // a atual destrava a próxima. O botão "Próxima" do rodapé (nextHref) segue travado.
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
