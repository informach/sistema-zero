import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CourseTrail } from '@/components/kids/course-trail'
import { KidsLockedCourse } from '@/components/kids/kids-locked-course'
import type { CourseDetailView, LessonOutlineView } from '@/lib/types'
import { getMyCourse } from '@/server/members'

export const dynamic = 'force-dynamic'

/**
 * Aula-alvo do "continuar de onde parei": o backend manda `continueLessonId`
 * (última acessada > 1ª não concluída > 1ª); fallback local se vier nulo.
 * Pula aulas TRAVADAS (trava sequencial) — defensivo: o herói nunca aponta para um
 * cadeado (que cairia no 423). Se só sobrarem travadas, usa a 1ª (recado amigável).
 */
function nextLesson(course: CourseDetailView): LessonOutlineView | null {
  const all = course.modules.flatMap((m) => m.lessons)
  if (course.continueLessonId) {
    const target = all.find((l) => l.id === course.continueLessonId)
    if (target && !target.locked) return target
  }
  return all.find((l) => !l.completed && !l.locked) ?? all.find((l) => !l.locked) ?? all[0] ?? null
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { status, body } = await getMyCourse(slug)
  if (status === 404 || status === 403) notFound()
  if (status === 423) return <KidsLockedCourse />
  if (status !== 200 || !body) throw new Error('Falha ao carregar o curso')
  const course = body

  const next = nextLesson(course)
  const lessonHref = (l: LessonOutlineView) =>
    `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(l.id)}`

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho do curso */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-muted md:w-80">
          {course.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-secondary to-muted" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <h1 className="sz-display text-2xl md:text-3xl">{course.title}</h1>
            {course.subtitle ? (
              <p className="mt-1 text-muted-foreground">{course.subtitle}</p>
            ) : null}
          </div>
          {course.description ? (
            <p className="text-muted-foreground text-sm">{course.description}</p>
          ) : null}
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
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

      {/* Trilha de aulas (estilo Duolingo) — substitui a lista de módulos. */}
      <CourseTrail course={course} />
    </div>
  )
}
