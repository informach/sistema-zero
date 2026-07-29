import { Play } from 'lucide-react'
import Link from 'next/link'
import type { MyCourseView } from '@/lib/types'

/** Curso do herói: 1º com "continuar" pendente; senão o 1º da lista. */
export function pickContinueCourse(courses: MyCourseView[]): MyCourseView | null {
  const unlocked = courses.filter((course) => course.careerLock?.locked !== true)
  return (
    unlocked.find((c) => c.continueLessonId !== null && c.progress.percent < 100) ??
    unlocked[0] ??
    null
  )
}

/**
 * Card-herói "Continuar de onde parei" (estilo Duolingo): gradiente da
 * marca em largura total, progresso grande e CTA 3D direto pra aula-alvo.
 */
export function ContinueHero({ courses }: { courses: MyCourseView[] }) {
  const course = pickContinueCourse(courses)
  if (!course) return null

  const courseHref = `/cursos/${encodeURIComponent(course.courseSlug)}`
  const href = course.continueLessonId
    ? `${courseHref}/aulas/${encodeURIComponent(course.continueLessonId)}`
    : courseHref
  const started = course.progress.completedLessons > 0

  return (
    <section className="kids-unit-grad relative overflow-hidden rounded-3xl p-6 [background-image:var(--sz-gradient)] text-(--sz-primary-fg) shadow-[0_5px_0_color-mix(in_oklch,var(--sz-primary)_55%,black)] md:p-8">
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="[font-family:var(--font-display)] font-bold text-xs uppercase tracking-widest opacity-80">
            {started ? 'Continue de onde parou' : 'Comece sua aventura'}
          </p>
          <h2 className="sz-display mt-1 truncate text-2xl md:text-3xl">{course.title}</h2>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 max-w-72 flex-1 overflow-hidden rounded-full bg-current/20">
              <span
                className="block h-full rounded-full bg-current transition-[width] duration-500"
                style={{ width: `${course.progress.percent}%` }}
              />
            </div>
            <span className="sz-display text-sm">{course.progress.percent}%</span>
          </div>
          <Link
            href={href}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-card px-6 font-bold text-primary shadow-[0_4px_0_rgba(0,0,0,0.25)] transition-[transform,box-shadow,filter] duration-100 hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_rgba(0,0,0,0.25)]"
          >
            <Play className="size-4 fill-current" />
            {started ? 'Continuar' : 'Começar'}
          </Link>
        </div>
        {course.coverImageUrl ? (
          <div className="hidden w-56 shrink-0 rotate-2 overflow-hidden rounded-2xl shadow-lg md:block">
            {/* Capa pode ser URL externa arbitrária (autoria) → <img> simples. */}
            <img src={course.coverImageUrl} alt="" className="aspect-video w-full object-cover" />
          </div>
        ) : null}
      </div>
    </section>
  )
}
