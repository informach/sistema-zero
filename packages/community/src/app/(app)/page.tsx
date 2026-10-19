import { nextJourneyCourse } from '@sistemazero/core/journey'
import { BookOpen, Play } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { CourseCard } from '@/components/community/course-card'
import { ContinueCard, CurrentModuleCard } from '@/components/community/home/continue-card'
import { RecadosCard } from '@/components/community/home/recados-card'
import { RhythmCard } from '@/components/community/home/rhythm-card'
import { ShowcaseNews } from '@/components/community/home/showcase-news'
import { PageBody, SectionHeader } from '@/components/community/page'
import { greetingFor } from '@/lib/course-levels'
import { nextLessonOf } from '@/lib/course-outline'
import {
  getMyCourse,
  getTeacherThreadsUnreadReadonly,
  listMyCourses,
  listTeacherThreadsReadonly,
} from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * O Início adulto (direção de arte de 18/10/2026): a saudação com a próxima aula na faixa, o
 * cartão "Continuar" e o módulo atual, os recados e o ritmo ao lado, os cursos da pessoa e as
 * novidades da Mostra. Cada parte some sozinha quando o dado não existe.
 */
export default async function HomePage() {
  const [user, courses, threads, unread] = await Promise.all([
    getSession(),
    listMyCourses(),
    listTeacherThreadsReadonly().catch(() => null),
    getTeacherThreadsUnreadReadonly().catch(() => null),
  ])
  if (courses.status !== 200)
    throw new Error('Não foi possível consultar seus cursos. Tente novamente.')
  const myCourses = courses.body?.courses ?? []
  const nextCourse = nextJourneyCourse(myCourses)
  const detail = nextCourse ? await getMyCourse(nextCourse.courseSlug).catch(() => null) : null
  const course = detail?.status === 200 ? detail.body : null
  const candidate = course ? nextLessonOf(course) : null
  // Curso já concluído (o "publicar" da jornada) não tem aula para continuar: o cartão sai.
  const next = candidate && !candidate.lesson.completed ? candidate : null

  const recentThreads = threads?.status === 200 ? (threads.body?.threads ?? []).slice(0, 2) : []
  const unreadCount =
    unread?.status === 200
      ? (unread.body?.count ?? 0)
      : recentThreads.filter((thread) => thread.unread).length

  const firstName = user?.firstName?.trim()
  const greeting = `${greetingFor(new Date())}${firstName ? `, ${firstName}` : ''}`

  return (
    <>
      <section className="sz-band">
        <div className="sz-page flex flex-col gap-2.5 pt-10 pb-9 md:pt-12 md:pb-11">
          {course ? (
            <div className="flex items-center gap-2.5">
              <svg
                viewBox="0 0 28 28"
                aria-hidden
                className="size-[1.2rem] shrink-0 fill-none stroke-primary"
              >
                <circle cx="14" cy="14" r="12" strokeWidth="1.5" opacity="0.5" />
                <circle cx="14" cy="14" r="5" className="fill-primary stroke-none" />
              </svg>
              <span className="sz-kicker">
                {course.title} · {course.progress.completedLessons} de{' '}
                {course.progress.totalLessons} aulas concluídas
              </span>
            </div>
          ) : null}
          <h1 className="sz-h1">{greeting}</h1>
          <p className="sz-lead">
            {next
              ? `Sua próxima aula é a ${next.number}: ${next.lesson.title}.`
              : nextCourse && !course
                ? `Continue o curso ${nextCourse.title}.`
                : myCourses.length > 0
                  ? 'Escolha um curso para continuar de onde parou.'
                  : 'Assim que sua compra for confirmada, seus cursos aparecem aqui.'}
          </p>
          {/* O detalhe do curso não veio: o "continuar" sai dos dados da lista, como antes. */}
          {nextCourse && !course ? (
            <Link
              href={`/cursos/${encodeURIComponent(nextCourse.courseSlug)}${nextCourse.continueLessonId ? `/aulas/${encodeURIComponent(nextCourse.continueLessonId)}` : ''}`}
              prefetch={false}
              className="sz-btn mt-2 self-start"
            >
              <Play className="fill-current" aria-hidden />
              Continuar
            </Link>
          ) : null}
        </div>
      </section>

      <PageBody>
        {next && course ? (
          <div className="flex flex-col items-start gap-7 lg:flex-row">
            <div className="flex w-full min-w-0 flex-1 flex-col gap-7">
              <ContinueCard course={course} next={next} />
              <CurrentModuleCard course={course} next={next} />
            </div>
            <aside
              aria-label="Recados e ritmo"
              className="flex w-full flex-col gap-5 lg:w-[19rem] lg:flex-none"
            >
              <RecadosCard threads={recentThreads} unread={unreadCount} />
              <RhythmCard />
            </aside>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <RecadosCard threads={recentThreads} unread={unreadCount} />
            <RhythmCard />
          </div>
        )}

        <section aria-labelledby="seus-cursos" className="flex flex-col gap-5">
          <SectionHeader
            id="seus-cursos"
            title="Seus cursos"
            action={
              <Link
                href="/cursos"
                prefetch={false}
                className="sz-link inline-flex min-h-[2.4rem] items-center"
              >
                Ver todos os cursos
              </Link>
            }
          />
          {myCourses.length === 0 ? (
            <div className="sz-card flex flex-col items-center gap-3 px-6 py-14 text-center">
              <BookOpen className="size-10 text-muted-foreground" aria-hidden />
              <p className="font-bold">Nenhum curso liberado ainda</p>
              <p className="text-muted-foreground">
                Assim que sua compra for confirmada, seu acesso aparece aqui.
              </p>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {myCourses.map((item) => (
                <li key={item.courseSlug}>
                  <CourseCard course={item} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* A Mostra vem do hub: não segura o resto do Início (chega quando ficar pronta). */}
        <Suspense fallback={null}>
          <ShowcaseNews viewerId={user?.id ?? null} />
        </Suspense>
      </PageBody>
    </>
  )
}
