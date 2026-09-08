import { courseJourneyState, nextCareerCourse } from '@sistemazero/core/career'
import { ContinueHeroLink } from '@/components/kids/continue-hero-link'
import type { MyCourseView } from '@/lib/types'

interface CourseActivityView {
  continueLessonId: string | null
  progress: { completedLessons: number }
}

/** Abrir uma aula já é atividade; conclusão não é o único sinal de início. */
export function courseHasActivity(course: CourseActivityView): boolean {
  return course.continueLessonId !== null || course.progress.completedLessons > 0
}

export function hasAnyCourseActivity(courses: readonly CourseActivityView[]): boolean {
  return courses.some(courseHasActivity)
}

/** Mesma prioridade pedagógica usada pelo restante da jornada. */
export function pickContinueCourse(courses: MyCourseView[]): MyCourseView | null {
  return nextCareerCourse(courses)
}

/**
 * Card-herói "Continuar de onde parei" (estilo Duolingo): gradiente da
 * marca em largura total, progresso grande e CTA 3D direto pra aula-alvo.
 */
export function ContinueHero({ courses }: { courses: MyCourseView[] }) {
  const course = pickContinueCourse(courses)
  if (!course) return null

  const publishing = courseJourneyState(course) === 'publish'
  const courseHref = `/cursos/${encodeURIComponent(course.courseSlug)}`
  const href = publishing
    ? `${courseHref}?de=inicio#publicar`
    : course.continueLessonId
      ? `${courseHref}/aulas/${encodeURIComponent(course.continueLessonId)}`
      : // Sem aula-alvo o herói cai na página do curso: marca a origem p/ a setinha
        // de lá voltar PRA HOME (ver `lib/course-return.ts`).
        `${courseHref}?de=inicio`
  const started = courseHasActivity(course)

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card p-6 shadow-sm md:p-8">
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-primary text-sm">
            {publishing
              ? 'Seu próximo passo: publicar'
              : started
                ? 'Continue sua criação'
                : 'Sua primeira criação começa aqui'}
          </p>
          <h2 className="sz-display mt-2 text-2xl md:text-3xl">{course.title}</h2>
          {publishing ? (
            <p className="mt-3 max-w-xl text-muted-foreground text-sm">
              Você concluiu este curso. Publique o projeto no Mural para registrar essa conquista na
              carreira.
            </p>
          ) : null}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 max-w-72 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${course.progress.percent}%` }}
              />
            </div>
            <span className="text-muted-foreground text-sm">
              {course.progress.completedLessons}/{course.progress.totalLessons} aulas
            </span>
          </div>
          <ContinueHeroLink
            href={href}
            started={started}
            label={publishing ? 'Preparar publicação' : undefined}
          />
        </div>
        {course.coverImageUrl ? (
          <div className="hidden w-56 shrink-0 rotate-2 overflow-hidden rounded-2xl shadow-lg md:block">
            {/* Capa pode ser URL externa arbitrária (autoria) → <img> simples. */}
            <img
              src={course.coverImageUrl}
              alt=""
              width={224}
              height={126}
              className="aspect-video w-full object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
