import { Check, ChevronRight, Clock, FileText, Lock, Play } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CourseRatingFlow } from '@/components/community/course-rating-flow'
import { CourseCover, ProgressBar } from '@/components/community/courses/course-cover'
import { BackLink } from '@/components/community/page'
import { cn } from '@/lib/cn'
import { courseKicker, trackLabel, trackOf } from '@/lib/course-levels'
import {
  lessonCountLabel,
  lessonNumbers,
  moduleDoneCount,
  moduleNumber,
  nextLessonOf,
} from '@/lib/course-outline'
import { getEnv } from '@/lib/env'
import type { LessonOutlineView } from '@/lib/types'
import { getAvatarReadonly, getMyCourse } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * O curso (direção de arte de 18/10/2026): a faixa com a capa, o eixo e o nível, o progresso, o
 * "continuar de onde parei" e a classificação; os módulos como cartões, com o atual em destaque;
 * ao lado, os materiais de apoio e o caminho para pedir ajuda. A trava das aulas é do servidor:
 * aula travada não é link.
 */
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [result, session, avatar] = await Promise.all([
    getMyCourse(slug),
    getSession(),
    // A foto do avatar 3D para o agradecimento da classificação. Best-effort: sem ela, as iniciais.
    getAvatarReadonly().catch(() => null),
  ])
  if (result.status === 404 || result.status === 403) notFound()
  if (result.status !== 200 || !result.body) throw new Error('Falha ao carregar o curso')
  const course = result.body

  const next = nextLessonOf(course)
  const numbers = lessonNumbers(course.modules)
  const materials = new Set(course.materialLessonIds ?? [])
  const lessons = course.modules.flatMap((module) => module.lessons)
  const materialLessons = lessons.filter((lesson) => materials.has(lesson.id))
  const track = trackOf(course)
  const { progress } = course
  const lessonHref = (lesson: LessonOutlineView) =>
    `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(lesson.id)}`
  const lessonLabel = (lesson: LessonOutlineView) => `${numbers.get(lesson.id)}. ${lesson.title}`
  // A primeira aula travada recebe a explicação; as outras ficam só com o cadeado.
  const firstLockedId = lessons.find((lesson) => lesson.locked)?.id

  return (
    <>
      <section className="sz-band">
        <div className="sz-page flex flex-col gap-5 pt-7 pb-9 md:pb-12">
          <BackLink href={`/cursos/trilha/${track}`} label={`Trilha ${trackLabel(track)}`} />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
            <div className="sz-card-sm relative aspect-video w-full overflow-hidden bg-(--topo) lg:w-[26rem] lg:flex-none">
              <CourseCover src={course.coverImageUrl} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
              <span className="sz-kicker">
                {courseKicker(course)} · {lessonCountLabel(progress.totalLessons)}
              </span>
              <h1 className="sz-h1">{course.title}</h1>
              {course.subtitle ? <p className="sz-lead">{course.subtitle}</p> : null}
              {course.description ? (
                <p className="text-muted-foreground">{course.description}</p>
              ) : null}
              <div className="mt-1 flex max-w-[28rem] flex-col gap-2">
                <div className="flex justify-between gap-3 text-[0.85rem]">
                  <strong>
                    {progress.completedLessons} de {lessonCountLabel(progress.totalLessons)}{' '}
                    {progress.completedLessons === 1 ? 'concluída' : 'concluídas'}
                  </strong>
                  <span className="font-bold text-(--acao-texto)">{progress.percent}%</span>
                </div>
                <ProgressBar value={progress.percent} label={`Progresso em ${course.title}`} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {next ? (
                  <Link href={lessonHref(next.lesson)} prefetch={false} className="sz-btn">
                    <Play className="fill-current" aria-hidden />
                    {progress.completedLessons > 0 ? 'Continuar de onde parei' : 'Começar agora'}
                  </Link>
                ) : null}
                {course.myRating === null ? (
                  <CourseRatingFlow
                    trigger="button"
                    courseSlug={course.slug}
                    initialRating={course.myRating}
                    shareUrl={course.salesPageUrl ?? getEnv().FUNNEL_URL ?? null}
                    viewer={{
                      firstName: session?.firstName ?? null,
                      lastName: session?.lastName ?? null,
                      email: session?.email ?? null,
                      avatarUrl: avatar?.status === 200 ? (avatar.body?.photoUrl ?? null) : null,
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="sz-page flex flex-col items-start gap-8 pt-10 pb-16 lg:flex-row">
        <section aria-labelledby="aulas" className="flex w-full min-w-0 flex-1 flex-col gap-6">
          <h2 id="aulas" className="sz-h2">
            Aulas
          </h2>
          {course.modules.map((module, moduleIndex) => {
            const current = next?.module.id === module.id && !next.lesson.completed
            const doneCount = moduleDoneCount(module)
            const allDone = module.lessons.length > 0 && doneCount === module.lessons.length
            return (
              <article
                key={module.id}
                aria-labelledby={`modulo-${module.id}`}
                className={cn(
                  'sz-card overflow-hidden',
                  current && 'shadow-[0_0_0_3px_var(--primary)]',
                )}
              >
                <div
                  className={cn(
                    'flex flex-wrap items-center gap-x-4 gap-y-2 border-border border-b p-5 md:p-6',
                    current ? 'bg-(--acao-tint)' : 'bg-background',
                  )}
                >
                  <span
                    className={cn(
                      'font-mono',
                      current ? 'text-(--acao-texto)' : 'text-muted-foreground',
                    )}
                  >
                    {moduleNumber(moduleIndex)}
                  </span>
                  <div className="flex min-w-0 flex-[1_1_10rem] flex-col gap-1">
                    <h3 id={`modulo-${module.id}`} className="sz-h3">
                      {module.title}
                    </h3>
                    {module.summary ? (
                      <span
                        className={cn(
                          'text-[0.85rem]',
                          current ? 'text-foreground/85' : 'text-muted-foreground',
                        )}
                      >
                        {module.summary}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'sz-chip',
                      allDone ? 'sz-chip-ok' : current ? 'sz-chip-acao' : null,
                    )}
                  >
                    {allDone ? <Check aria-hidden /> : null}
                    {doneCount} de {module.lessons.length}
                    <span className="sr-only"> aulas concluídas</span>
                  </span>
                </div>
                <ul>
                  {module.lessons.map((lesson, index) => {
                    const here = next?.lesson.id === lesson.id && !lesson.completed
                    const row = (
                      <>
                        <span
                          className={cn(
                            'sz-num',
                            lesson.completed ? 'sz-num-ok' : here ? 'sz-num-acao' : null,
                          )}
                        >
                          {lesson.completed ? (
                            <Check className="size-5" aria-hidden />
                          ) : lesson.locked ? (
                            <Lock className="size-[1.1rem]" aria-hidden />
                          ) : (
                            numbers.get(lesson.id)
                          )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
                          <span
                            className={cn(
                              'min-w-0 flex-[1_1_12rem]',
                              here && 'font-bold',
                              lesson.locked && 'text-foreground/85',
                            )}
                          >
                            {lessonLabel(lesson)}
                            {lesson.completed ? (
                              <span className="sr-only"> (concluída)</span>
                            ) : null}
                            {lesson.locked ? <span className="sr-only"> (travada)</span> : null}
                          </span>
                          {materials.has(lesson.id) ? (
                            <span className="sz-chip">
                              <FileText aria-hidden />
                              Material de apoio
                            </span>
                          ) : null}
                          {here ? (
                            <span className="sz-chip sz-chip-acao">Continue aqui</span>
                          ) : null}
                          {lesson.id === firstLockedId ? (
                            <span className="font-bold text-[0.85rem]">
                              Abre quando a anterior for concluída
                            </span>
                          ) : null}
                          {lesson.estimatedMinutes ? (
                            <span className="flex items-center gap-1.5 text-[0.85rem] text-muted-foreground">
                              <Clock className="size-[1em]" aria-hidden />
                              {lesson.estimatedMinutes} min
                            </span>
                          ) : null}
                        </span>
                      </>
                    )
                    const base = 'flex items-center gap-4 px-5 py-3.5 md:px-6 md:py-4'
                    return (
                      <li key={lesson.id} className={cn(index > 0 && 'border-border border-t')}>
                        {lesson.locked ? (
                          <div className={cn(base, 'text-muted-foreground')}>{row}</div>
                        ) : (
                          <Link
                            href={lessonHref(lesson)}
                            prefetch={false}
                            aria-current={here ? 'step' : undefined}
                            className={cn(
                              base,
                              'bg-card text-foreground transition-colors hover:bg-muted',
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
          })}
        </section>

        <aside
          aria-label="Apoio do curso"
          className="flex w-full flex-col gap-5 lg:sticky lg:top-[7.6rem] xl:top-[5.2rem] lg:w-[19rem] lg:flex-none"
        >
          {materialLessons.length > 0 ? (
            <article className="sz-card flex flex-col gap-3.5 p-5 md:p-7">
              <h2 className="sz-h3">Materiais de apoio</h2>
              <p className="text-[0.85rem] text-muted-foreground">
                Aulas com arquivos para baixar ou imprimir.
              </p>
              <ul className="flex flex-col gap-2.5">
                {materialLessons.map((lesson) =>
                  lesson.locked ? (
                    <li
                      key={lesson.id}
                      className="sz-soft flex items-center gap-3 px-4 py-3.5 text-muted-foreground"
                    >
                      <Lock className="size-5 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">{lessonLabel(lesson)}</span>
                    </li>
                  ) : (
                    <li key={lesson.id}>
                      <Link
                        href={lessonHref(lesson)}
                        prefetch={false}
                        className="sz-soft flex items-center gap-3 px-4 py-3.5 text-foreground transition-colors hover:bg-muted"
                      >
                        <FileText className="size-5 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1">{lessonLabel(lesson)}</span>
                        <ChevronRight className="size-5 shrink-0" aria-hidden />
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </article>
          ) : null}
          <article className="sz-card flex flex-col gap-3.5 p-5 md:p-7">
            <h2 className="sz-h3">Travou em algum ponto?</h2>
            <p className="text-[0.85rem] text-muted-foreground">
              Dentro da aula, o botão “Preciso de ajuda” manda a sua dúvida para a equipe. A
              resposta chega em Recados.
            </p>
            <Link
              href="/recados"
              prefetch={false}
              className="sz-link -my-1.5 inline-flex min-h-[2.4rem] items-center self-start"
            >
              Abrir Recados
            </Link>
          </article>
        </aside>
      </div>
    </>
  )
}
