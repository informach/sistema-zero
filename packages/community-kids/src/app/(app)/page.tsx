import { BookOpen } from 'lucide-react'
import { CourseCard } from '@/components/kids/course-card'
import { listMyCourses } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getSession()
  const { status, body } = await listMyCourses()
  const courses = status === 200 ? (body?.courses ?? []) : []

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
