import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { Card } from '@sistemazero/ui/card'
import { CheckCircle2, Circle, Clock, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CourseDetailView, LessonOutlineView } from '@/lib/types'
import { getMyCourse } from '@/server/members'

export const dynamic = 'force-dynamic'

/**
 * Aula-alvo do "continuar de onde parei": o backend manda `continueLessonId`
 * (última acessada > 1ª não concluída > 1ª); fallback local se vier nulo.
 */
function nextLesson(course: CourseDetailView): LessonOutlineView | null {
  const all = course.modules.flatMap((m) => m.lessons)
  if (course.continueLessonId) {
    const target = all.find((l) => l.id === course.continueLessonId)
    if (target) return target
  }
  return all.find((l) => !l.completed) ?? all[0] ?? null
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { status, body } = await getMyCourse(slug)
  if (status === 404 || status === 403) notFound()
  if (status !== 200 || !body) throw new Error('Falha ao carregar o curso')
  const course = body

  const next = nextLesson(course)
  const lessonHref = (l: LessonOutlineView) =>
    `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(l.id)}`

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho do curso */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-muted md:w-80">
          {course.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-secondary to-muted" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <h1 className="sz-display text-2xl">{course.title}</h1>
            {course.subtitle ? (
              <p className="mt-1 text-muted-foreground">{course.subtitle}</p>
            ) : null}
          </div>
          {course.description ? (
            <p className="text-sm text-muted-foreground">{course.description}</p>
          ) : null}
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {course.progress.completedLessons} de {course.progress.totalLessons} aulas
                concluídas
              </span>
              <span className="sz-display">{course.progress.percent}%</span>
            </div>
            <ProgressBar value={course.progress.percent} />
          </div>
          {next ? (
            <Link href={lessonHref(next)} className="sz-btn-gradient mt-2 self-start">
              <PlayCircle className="size-4" />
              {course.progress.completedLessons > 0 ? 'Continuar de onde parei' : 'Começar agora'}
            </Link>
          ) : null}
        </div>
      </div>

      <hr className="sz-divider" />

      {/* Módulos e aulas */}
      <div className="flex flex-col gap-6">
        {course.modules.map((module, mi) => (
          <Card key={module.id} className="overflow-hidden p-0">
            <div className="border-b border-border bg-muted/40 px-5 py-3">
              <h2 className="text-sm font-semibold">
                <span className="sz-display-grad mr-2">{String(mi + 1).padStart(2, '0')}</span>
                {module.title}
              </h2>
              {module.summary ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{module.summary}</p>
              ) : null}
            </div>
            <ul>
              {module.lessons.map((lesson) => (
                <li key={lesson.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={lessonHref(lesson)}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                  >
                    {lesson.completed ? (
                      <CheckCircle2 className="size-4 shrink-0 text-accent dark:text-primary" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 text-sm">{lesson.title}</span>
                    {lesson.estimatedMinutes ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {lesson.estimatedMinutes} min
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
