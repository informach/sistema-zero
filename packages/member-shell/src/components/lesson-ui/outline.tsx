'use client'
import { Check, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '../../lib/cn'
import type { CourseDetailView } from '../../lib/types'
import { CourseRatingFlow, type RatingViewer } from './course-rating-flow'
import { UNIT_THEME_CLASS, unitThemeAt } from './unit-theme'
export function LessonOutlineContent({
  course,
  courseHref,
  currentLessonId,
  shareUrl,
  viewer,
}: {
  course: Pick<CourseDetailView, 'title' | 'slug' | 'progress' | 'myRating' | 'modules'>
  courseHref: string
  currentLessonId: string
  shareUrl: string | null
  viewer: RatingViewer
}) {
  const modules = course.modules.filter((module) => module.lessons.length > 0)
  let count = 0
  const moduleStartIndexes = modules.map((module) => {
    const start = count
    count += module.lessons.length
    return start
  })
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-(--borda-carta) bg-card lg:rounded-none lg:border-0">
      {/* O índice lateral mantém o progresso geral do curso, compacto. */}
      <div className="px-5 pt-5 pb-3">
        <p className="sz-display text-lg leading-tight">{course.title}</p>
        <CourseRatingFlow
          courseSlug={course.slug}
          initialRating={course.myRating}
          shareUrl={shareUrl}
          viewer={viewer}
        />
        <div className="mt-3.5 flex items-center justify-between font-semibold text-muted-foreground text-xs">
          <span>Progresso do curso</span>
          <span className="font-extrabold">{course.progress.percent}%</span>
        </div>
        <div
          className="sz-progress mt-1.5"
          role="progressbar"
          aria-label="Progresso do curso"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={course.progress.percent}
        >
          <span style={{ width: `${course.progress.percent}%` }} />
        </div>
      </div>
      <nav
        aria-label="Lista de aulas do curso"
        className="scrollbar-subtle max-h-[28rem] overflow-y-auto px-3 pb-4 lg:max-h-none lg:min-h-0 lg:flex-1"
      >
        {modules.map((module, moduleIndex) => (
          <div key={module.id} className={UNIT_THEME_CLASS[unitThemeAt(moduleIndex)]}>
            <p
              className="px-2 pt-3 pb-1.5 font-extrabold text-[0.6875rem] uppercase tracking-[0.12em]"
              // A cor da unidade como tinta miúda reprova AA; puxada para o texto do
              // tema, mantém o matiz e passa (a régua do chip de etiqueta).
              style={{ color: 'color-mix(in oklab, var(--unit) 62%, var(--foreground))' }}
            >
              {module.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {module.lessons.map((item, lessonIndex) => {
                const active = item.id === currentLessonId
                const number = (moduleStartIndexes[moduleIndex] ?? 0) + lessonIndex + 1
                const numberBadge = (
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full font-extrabold text-[0.6875rem] tabular-nums',
                      item.completed
                        ? '[background-color:var(--unit-bg)] text-(--unit-fg)'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {item.completed ? (
                      <Check className="size-3.5" strokeWidth={3.5} />
                    ) : item.locked ? (
                      <Lock className="size-3" strokeWidth={2.5} />
                    ) : (
                      number
                    )}
                  </span>
                )
                // Aula travada: item NÃO clicável (a regra de acesso é do backend).
                if (item.locked) {
                  return (
                    <li key={item.id}>
                      <div
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-2.5 py-2 font-semibold text-muted-foreground text-sm opacity-70"
                      >
                        {numberBadge}
                        <span className="min-w-0 break-words">
                          {item.completed ? (
                            <span className="sr-only">Aula concluída. </span>
                          ) : null}
                          {item.title}
                        </span>
                        {/* Descritivo, não imperativo: a aula anterior pode ser
                                  uma "em breve", que ainda não dá para concluir. Vai
                                  em `sr-only` porque `title` não aparece no touch e
                                  um `<div>` sem role não aceita `aria-label`. */}
                        <span className="sr-only">
                          , trancada, abre quando a anterior for concluída
                        </span>
                      </div>
                    </li>
                  )
                }
                return (
                  <li key={item.id}>
                    <Link
                      href={`${courseHref}/aulas/${encodeURIComponent(item.id)}`}
                      className={cn(
                        'flex min-h-10 items-center gap-3 rounded-xl px-2.5 py-2 font-semibold text-sm transition-colors',
                        // A aula de agora: o creme com o traço laranja à esquerda, como
                        // nas telas-modelo. O traço é sombra INTERNA (não mexe no layout).
                        active
                          ? 'bg-(--band-creme) text-(--tinta) shadow-[inset_3px_0_0_var(--sz-kids-laranja-texto)]'
                          : 'text-(--tinta) hover:bg-muted',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      {numberBadge}
                      <span className="min-w-0 break-words">
                        {item.completed ? <span className="sr-only">Aula concluída. </span> : null}
                        {item.title}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}
