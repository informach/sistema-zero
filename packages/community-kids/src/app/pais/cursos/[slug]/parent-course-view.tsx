'use client'

import {
  lessonCountLabel,
  lessonNumbers,
  moduleDoneCount,
  nextLessonOf,
} from '@sistemazero/member-shell/lib/course-outline'
import { ArrowLeft, ArrowUpRight, Check, Gift, Lock, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { comunidadeContinuarUrl } from '@/lib/links'
import type { CatalogCourseView, CourseDetailView } from '@/lib/types'
import { ParentShell } from '../../_components/parent-shell'
import { PRIMARY_ACTION, SECONDARY_ACTION } from '../../_components/parent-ui'
import { PARENT_COURSES_HREF, PARENT_SUPPORT_HREF, parentCourseHref } from '../../parent-routes'
import { ParentCourseCover } from '../parent-courses-view'

function BackToCourses() {
  return (
    <Link
      href={PARENT_COURSES_HREF}
      className="-mb-4 inline-flex min-h-11 items-center gap-2 self-start font-bold text-muted-foreground text-sm hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Cursos para pais
    </Link>
  )
}

function minutesLabel(minutes: number | null | undefined): string | null {
  return minutes ? `${minutes} min` : null
}

/**
 * A página de um curso para pais (14/11/2026), no formato da página de curso do adulto: capa,
 * progresso e o "continuar", os módulos em cartões com as aulas, e os materiais de apoio.
 */
export function ParentCourseView({
  parentName,
  course,
}: {
  parentName?: string
  course: CourseDetailView
}) {
  const numbers = lessonNumbers(course.modules)
  const next = nextLessonOf(course)
  const total = course.progress.totalLessons
  const totalMinutes = course.modules
    .flatMap((module) => module.lessons)
    .reduce((sum, lesson) => sum + (lesson.estimatedMinutes ?? 0), 0)
  const materials = new Set(course.materialLessonIds ?? [])
  const materialLessons = course.modules
    .flatMap((module) => module.lessons)
    .filter((lesson) => materials.has(lesson.id))
  const gift = course.accessReason === 'gift'
  return (
    <ParentShell active="cursos" parentName={parentName}>
      <BackToCourses />
      <header className="kids-carta flex flex-wrap items-center gap-7 p-5 sm:p-7">
        <div className="w-full max-w-[19rem]">
          <ParentCourseCover url={course.coverImageUrl} className="h-48" />
        </div>
        <div className="flex min-w-[16rem] flex-1 flex-col gap-3">
          <span className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
            Curso para pais · {lessonCountLabel(total)}
            {totalMinutes ? ` · cerca de ${totalMinutes} min` : ''}
          </span>
          <h1 className="sz-display text-[2.25rem] leading-tight">{course.title}</h1>
          {course.subtitle ? <p className="text-[1.0625rem]">{course.subtitle}</p> : null}
          {course.description ? (
            <p className="whitespace-pre-line text-muted-foreground text-sm">
              {course.description}
            </p>
          ) : null}
          {gift ? (
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-(--kids-lilas-bg) px-3 py-1 font-bold text-sm">
              <Gift className="size-4" aria-hidden="true" /> Você ganhou este curso de presente
            </span>
          ) : null}
          <div className="flex items-center gap-3">
            <div
              className="h-2.5 max-w-[22rem] flex-1 overflow-hidden rounded-full bg-(--band-ceu)"
              role="progressbar"
              aria-valuenow={course.progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso no curso"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${course.progress.percent}%` }}
              />
            </div>
            <span className="text-sm">
              <strong>
                {course.progress.completedLessons} de {total} concluídas
              </strong>{' '}
              <span className="text-muted-foreground">· {course.progress.percent}%</span>
            </span>
          </div>
          {next ? (
            <Link
              href={parentCourseHref(course.slug, next.lesson.id)}
              className={`${PRIMARY_ACTION} self-start`}
            >
              {course.progress.completedLessons > 0 ? 'Continuar de onde parei' : 'Começar agora'}
            </Link>
          ) : null}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4">
          {course.modules.map((module, moduleIndex) => (
            <section
              key={module.id}
              aria-labelledby={`modulo-${module.id}`}
              className="kids-carta flex flex-col gap-1 p-5"
            >
              <div className="flex items-center gap-3 pb-2">
                <span className="rounded-full bg-(--band-ceu) px-2.5 py-0.5 font-bold text-primary text-xs">
                  Módulo {moduleIndex + 1}
                </span>
                <h2 id={`modulo-${module.id}`} className="sz-display flex-1 text-xl">
                  {module.title}
                </h2>
                <span className="font-bold text-sm">
                  {moduleDoneCount(module)} de {module.lessons.length}
                </span>
              </div>
              {module.summary ? (
                <p className="pb-2 text-muted-foreground text-sm">{module.summary}</p>
              ) : null}
              <ol className="flex flex-col">
                {module.lessons.map((lesson) => {
                  const current = next?.lesson.id === lesson.id && !lesson.completed
                  const body = (
                    <>
                      <span
                        className={
                          lesson.completed
                            ? 'flex size-9 shrink-0 items-center justify-center rounded-full bg-(--kids-menta-bg) text-(--success-foreground)'
                            : current
                              ? 'sz-display flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'
                              : 'sz-display flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-(--linha-carta) text-muted-foreground'
                        }
                        aria-hidden="true"
                      >
                        {lesson.completed ? (
                          <Check className="size-4" />
                        ) : lesson.locked ? (
                          <Lock className="size-4" />
                        ) : (
                          numbers.get(lesson.id)
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <strong className="font-bold">{lesson.title}</strong>
                        {current ? (
                          <span className="font-bold text-primary text-xs">Continue aqui</span>
                        ) : lesson.locked ? (
                          <span className="text-muted-foreground text-xs">
                            Abre quando a anterior for concluída
                          </span>
                        ) : null}
                      </span>
                      {materials.has(lesson.id) ? (
                        <span className="hidden rounded-full bg-(--kids-rosa-bg) px-2.5 py-0.5 font-bold text-xs sm:inline">
                          Material de apoio
                        </span>
                      ) : null}
                      {minutesLabel(lesson.estimatedMinutes) ? (
                        <span className="text-muted-foreground text-xs">
                          {minutesLabel(lesson.estimatedMinutes)}
                        </span>
                      ) : null}
                    </>
                  )
                  return (
                    <li key={lesson.id} className="border-(--linha-carta) border-t">
                      {lesson.locked ? (
                        <div className="flex items-center gap-3.5 px-2 py-3 opacity-70">{body}</div>
                      ) : (
                        <Link
                          href={parentCourseHref(course.slug, lesson.id)}
                          aria-label={
                            lesson.completed ? `${lesson.title} (concluída)` : lesson.title
                          }
                          className={`flex items-center gap-3.5 rounded-xl px-2 py-3 text-foreground hover:bg-(--band-ceu) ${current ? 'bg-(--band-ceu)' : ''}`}
                        >
                          {body}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
        <aside className="flex flex-col gap-6">
          {materialLessons.length ? (
            <section className="kids-carta flex flex-col gap-2 p-5">
              <h2 className="sz-display text-xl">Materiais de apoio</h2>
              <p className="text-muted-foreground text-sm">
                Ficam dentro destas aulas, para baixar e deixar perto do computador.
              </p>
              <ul className="flex flex-col">
                {materialLessons.map((lesson) => (
                  <li key={lesson.id} className="border-(--linha-carta) border-t">
                    <Link
                      href={parentCourseHref(course.slug, lesson.id)}
                      className="flex min-h-11 items-center py-2 font-bold text-sm text-foreground hover:text-primary"
                    >
                      Aula {numbers.get(lesson.id)}: {lesson.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="kids-carta flex flex-col gap-3 p-5">
            <h2 className="sz-display text-xl">Ficou com alguma dúvida?</h2>
            <p className="text-muted-foreground text-sm">
              Dentro da aula, clique em Preciso de ajuda e escreva a sua dúvida. A resposta da nossa
              equipe chega em Ajuda, na parte Suas dúvidas sobre os cursos.
            </p>
            <Link href="/pais/ajuda#duvidas" className={`${SECONDARY_ACTION} self-start`}>
              Ver suas dúvidas
            </Link>
          </section>
        </aside>
      </div>
    </ParentShell>
  )
}

/**
 * Curso para pais sem acesso (quem não assina a Comunidade): o que tem no curso e as duas formas
 * de liberar, a Comunidade dos Criadores ou a compra só deste curso (a página de venda dele).
 */
export function ParentCourseClosed({
  parentName,
  course,
}: {
  parentName?: string
  course: CatalogCourseView
}) {
  const router = useRouter()
  return (
    <ParentShell active="cursos" parentName={parentName}>
      <BackToCourses />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <header className="kids-carta flex flex-wrap items-center gap-6 p-5 sm:p-7">
          <div className="w-full max-w-[15rem]">
            <ParentCourseCover url={course.coverImageUrl} className="h-40" />
          </div>
          <div className="flex min-w-[16rem] flex-1 flex-col gap-3">
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-muted px-3 py-1 font-bold text-muted-foreground text-sm">
              <Lock className="size-4" aria-hidden="true" /> Curso para pais
            </span>
            <h1 className="sz-display text-[2rem] leading-tight">{course.title}</h1>
            {course.subtitle ? <p className="text-muted-foreground">{course.subtitle}</p> : null}
          </div>
        </header>
        <section
          aria-labelledby="liberar"
          className="kids-carta flex flex-col gap-4 border-2 border-primary p-5 sm:p-6"
        >
          <h2 id="liberar" className="sz-display text-[1.375rem]">
            Como liberar este curso
          </h2>
          <div className="flex flex-col gap-2 rounded-2xl bg-(--band-ceu) p-4">
            <strong>Na Comunidade dos Criadores</strong>
            <p className="text-muted-foreground text-sm">
              A assinatura libera todos os cursos para pais. E seus filhos ganham os cursos de
              criação de jogos, o Estúdio e o Mural.
            </p>
            <a
              href={comunidadeContinuarUrl('pais-curso-fechado')}
              target="_blank"
              rel="noopener noreferrer"
              className={`${PRIMARY_ACTION} self-start`}
            >
              Conhecer a Comunidade <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
          {course.salesPageUrl ? (
            <div className="flex flex-col gap-2 rounded-2xl border-2 border-(--linha-carta) p-4">
              <strong>Só este curso</strong>
              <p className="text-muted-foreground text-sm">Um pagamento, sem assinatura.</p>
              <a
                href={course.salesPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${SECONDARY_ACTION} self-start`}
              >
                Comprar este curso <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          ) : null}
          <p className="text-muted-foreground text-sm">
            Já comprou?{' '}
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex min-h-11 items-center gap-1 font-bold text-primary"
            >
              <RefreshCw className="size-4" aria-hidden="true" /> Atualizar o acesso
            </button>
          </p>
          <p className="text-muted-foreground text-xs">
            Alguma dúvida? <Link href={PARENT_SUPPORT_HREF}>Fale com a nossa equipe</Link>.
          </p>
        </section>
      </div>
    </ParentShell>
  )
}
