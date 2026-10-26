import { Check, Lock, Play } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { lessonNumbers, moduleDoneCount, type NextLesson } from '@/lib/course-outline'
import type { CourseDetailView } from '@/lib/types'
import { CourseCover, ProgressBar } from '../courses/course-cover'

const lessonHref = (courseSlug: string, lessonId: string) =>
  `/cursos/${encodeURIComponent(courseSlug)}/aulas/${encodeURIComponent(lessonId)}`

/**
 * O cartão "Continuar" do Início (direção de arte de 18/10/2026): a capa, a próxima aula com o
 * módulo e a duração, o resumo do módulo, o progresso no curso e os dois botões.
 */
export function ContinueCard({ course, next }: { course: CourseDetailView; next: NextLesson }) {
  const { progress } = course
  const meta = [
    `Aula ${next.number}`,
    `Módulo ${next.moduleIndex + 1}`,
    next.lesson.estimatedMinutes ? `cerca de ${next.lesson.estimatedMinutes} min` : null,
  ].filter(Boolean)

  return (
    <article className="sz-card flex flex-col overflow-hidden md:flex-row">
      <div className="sz-mira relative aspect-video bg-(--topo) md:aspect-auto md:min-h-[16.5rem] md:flex-[0_0_42%]">
        <div className="absolute inset-0">
          <CourseCover src={course.coverImageUrl} />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 p-5 md:p-8">
        <span className="sz-kicker">{meta.join(' · ')}</span>
        <h2 className="sz-h2 text-[1.55rem] md:text-[1.7rem]">{next.lesson.title}</h2>
        {next.module.summary ? (
          <p className="text-muted-foreground">Do módulo: {next.module.summary}</p>
        ) : null}
        <div className="mt-1 flex flex-col gap-2">
          <div className="flex flex-wrap justify-between gap-x-4 text-[0.85rem]">
            <strong>Progresso no curso</strong>
            <span className="text-muted-foreground">
              {progress.completedLessons} de {progress.totalLessons} aulas · {progress.percent}%
            </span>
          </div>
          <ProgressBar value={progress.percent} label={`Progresso em ${course.title}`} />
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href={lessonHref(course.slug, next.lesson.id)} prefetch={false} className="sz-btn">
            <Play className="fill-current" aria-hidden />
            Continuar a aula {next.number}
          </Link>
          <Link
            href={`/cursos/${encodeURIComponent(course.slug)}`}
            prefetch={false}
            className="sz-btn-outline"
          >
            Ver todas as aulas
          </Link>
        </div>
      </div>
    </article>
  )
}

/**
 * O módulo da próxima aula, com as aulas dele: concluída, "Continue aqui", liberada ou travada
 * ("Conclua a anterior"). A aula travada não é link: a trava é do servidor.
 */
export function CurrentModuleCard({
  course,
  next,
}: {
  course: CourseDetailView
  next: NextLesson
}) {
  const numbers = lessonNumbers(course.modules)
  const { module } = next
  return (
    <article className="sz-card flex flex-col gap-2 p-5 md:px-8 md:py-7">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="sz-h3">
          Módulo {next.moduleIndex + 1} · {module.title}
        </h2>
        <span className="sz-kicker">
          {moduleDoneCount(module)} de {module.lessons.length}
        </span>
      </div>
      <ul className="mt-1.5 flex flex-col">
        {module.lessons.map((lesson, index) => {
          const current = lesson.id === next.lesson.id
          const number = numbers.get(lesson.id) ?? index + 1
          const row = (
            <>
              <span
                className={cn(
                  'sz-num',
                  current ? 'sz-num-acao' : lesson.completed ? 'sz-num-ok' : null,
                )}
              >
                {lesson.completed && !current ? <Check className="size-5" aria-hidden /> : number}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
                <span
                  className={cn(
                    'min-w-0 flex-[1_1_10rem]',
                    current ? 'font-bold' : 'text-foreground/85',
                  )}
                >
                  {lesson.title}
                </span>
                {lesson.estimatedMinutes ? (
                  <span className="text-[0.85rem] text-muted-foreground">
                    {lesson.estimatedMinutes} min
                  </span>
                ) : null}
                {current ? (
                  <span className="sz-chip sz-chip-novo">Continue aqui</span>
                ) : lesson.locked ? (
                  <span className="sz-chip">
                    <Lock aria-hidden />
                    Conclua a anterior
                  </span>
                ) : lesson.completed ? (
                  <span className="sz-chip sz-chip-ok">Concluída</span>
                ) : null}
              </span>
            </>
          )
          const base = 'flex items-center gap-4 py-3.5'
          return (
            <li key={lesson.id} className={cn(index > 0 && !current && 'border-border border-t')}>
              {lesson.locked ? (
                <div className={base}>{row}</div>
              ) : (
                <Link
                  href={lessonHref(course.slug, lesson.id)}
                  prefetch={false}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    base,
                    '-mx-4 rounded-[0.7rem] px-4 text-foreground transition-colors',
                    current ? 'bg-(--aviso-tint)' : 'hover:bg-muted',
                  )}
                >
                  {row}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </article>
  )
}
