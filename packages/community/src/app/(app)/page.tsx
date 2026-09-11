import { nextCareerCourse } from '@sistemazero/core/career'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { CourseCard } from '@/components/community/course-card'
import { listMyCourses } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getSession()
  const { status, body } = await listMyCourses()
  if (status !== 200) throw new Error('Não foi possível consultar seus cursos. Tente novamente.')
  const courses = status === 200 ? (body?.courses ?? []) : []
  const next = nextCareerCourse(courses)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="sz-display text-2xl md:text-3xl">
          Olá{user?.firstName ? `, ${user.firstName}` : ''} 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Continue de onde parou — seus cursos estão aqui.
        </p>
      </div>

      {next ? (
        // O herói do Pen: fundo na cor de ação, texto claro e o botão branco.
        <section className="rounded-[2rem] bg-primary p-6 text-primary-foreground shadow-[0_10px_24px_color-mix(in_oklab,var(--primary)_22%,transparent)] md:p-7">
          <p className="font-bold text-(--on-primary-soft) text-xs uppercase tracking-[0.1em]">
            Sua próxima aula
          </p>
          <h2 className="sz-display mt-3 text-2xl md:text-3xl">{next.title}</h2>
          <p className="mt-2 text-(--on-primary-soft) text-sm">
            {next.progress.completedLessons} de {next.progress.totalLessons} aulas concluídas
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              href={`/cursos/${encodeURIComponent(next.courseSlug)}${next.continueLessonId ? `/aulas/${encodeURIComponent(next.continueLessonId)}` : ''}`}
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-full bg-white px-6 font-semibold text-primary transition-colors hover:bg-white/90"
            >
              Continuar aprendendo
            </Link>
            <Link
              href="/recados"
              prefetch={false}
              className="inline-flex min-h-11 items-center font-semibold text-white underline-offset-4 hover:underline"
            >
              Ver devolutivas
            </Link>
          </div>
        </section>
      ) : null}
      {!next && courses.length > 0 ? (
        <section className="rounded-[1.75rem] bg-card p-6">
          <h2 className="text-lg font-semibold">Continue a conversa sobre suas criações</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Consulte as devolutivas do professor e retome um curso sempre que quiser revisar.
          </p>
          <Link
            href="/recados"
            prefetch={false}
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary"
          >
            Ver devolutivas
          </Link>
        </section>
      ) : null}
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-xl tracking-tight">Meus cursos</h2>
        {courses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border-2 border-border border-dashed bg-card py-16 text-center">
            <BookOpen className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Nenhum curso liberado ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Assim que sua compra for confirmada, seu acesso aparece aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.courseSlug} course={course} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
