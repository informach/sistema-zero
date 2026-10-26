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
 * O Início adulto (o "Estúdio à noite", 25/10/2026): no palco, a saudação, o cartão "Continuar"
 * com a capa do jogo e o ritmo; na bancada, o módulo atual, os recados, os cursos da pessoa e, num
 * palco no pé, as novidades do Mural. Cada parte some sozinha quando o dado não existe.
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
      {/* O PALCO: a saudação, o "ponto de save" (a próxima aula, com a capa do jogo) e o ritmo. */}
      <section className="sz-band">
        <div className="sz-page flex flex-col gap-8 pt-10 pb-12 md:pt-12 md:pb-14">
          <div className="flex flex-col gap-2.5">
            {course ? (
              <span className="sz-kicker">
                {course.title} · {course.progress.completedLessons} de{' '}
                {course.progress.totalLessons} aulas concluídas
              </span>
            ) : null}
            <h1 className="sz-h1">{greeting}</h1>
            <p className="sz-lead">
              {next
                ? `Sua próxima aula é a ${next.number}: ${next.lesson.title}. Está tudo salvo do jeito que você deixou.`
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
          {next && course ? (
            <div className="flex flex-col items-stretch gap-6 lg:flex-row">
              <div className="min-w-0 flex-1">
                <ContinueCard course={course} next={next} />
              </div>
              <div className="lg:w-[19rem] lg:flex-none">
                <RhythmCard />
              </div>
            </div>
          ) : (
            <div className="md:max-w-[28rem]">
              <RhythmCard />
            </div>
          )}
        </div>
      </section>

      {/* A BANCADA: o módulo da próxima aula, os recados e os cursos. */}
      <PageBody>
        {next && course ? (
          <div className="flex flex-col items-start gap-7 lg:flex-row">
            <div className="w-full min-w-0 flex-1">
              <CurrentModuleCard course={course} next={next} />
            </div>
            <aside aria-label="Recados" className="w-full lg:w-[19rem] lg:flex-none">
              <RecadosCard threads={recentThreads} unread={unreadCount} />
            </aside>
          </div>
        ) : (
          <RecadosCard threads={recentThreads} unread={unreadCount} />
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
      </PageBody>

      {/* O Mural vem do hub: não segura o resto do Início (chega quando ficar pronta). */}
      <Suspense fallback={null}>
        <ShowcaseNews viewerId={user?.id ?? null} />
      </Suspense>
    </>
  )
}
