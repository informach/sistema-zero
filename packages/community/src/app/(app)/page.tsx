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
        <h1 className="sz-display text-2xl">
          Olá{user?.firstName ? `, ${user.firstName}` : ''} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Continue de onde parou — seus cursos estão aqui.
        </p>
      </div>

      {next ? (
        <section className="rounded-2xl border border-primary/25 bg-card p-6">
          <p className="font-semibold text-primary text-sm">Sua próxima aula</p>
          <h2 className="sz-display mt-2 text-2xl">{next.title}</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            {next.progress.completedLessons} de {next.progress.totalLessons} aulas concluídas
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href={`/cursos/${encodeURIComponent(next.courseSlug)}${next.continueLessonId ? `/aulas/${encodeURIComponent(next.continueLessonId)}` : ''}`}
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground"
            >
              Continuar aprendendo
            </Link>
            <Link
              href="/recados"
              prefetch={false}
              className="inline-flex min-h-11 items-center font-semibold text-primary"
            >
              Ver devolutivas
            </Link>
          </div>
        </section>
      ) : null}
      {!next && courses.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card p-6">
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
        <h2 className="text-lg font-semibold">Meus cursos</h2>
        {courses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
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
