'use client'

import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'
import { money } from '@sistemazero/member-shell/components/commerce/commerce-copy'
import { ArrowRight, BookOpen, Check, Gift, Lock } from 'lucide-react'
import Link from 'next/link'
import type { CatalogCourseView, MyCourseView } from '@/lib/types'
import { ParentShell } from '../_components/parent-shell'
import {
  ParentPageTitle,
  ParentSection,
  PRIMARY_ACTION,
  SECONDARY_ACTION,
} from '../_components/parent-ui'
import { parentCourseHref } from '../parent-routes'
import { COURSE_BANDS, lessonsChip, PARENT_COURSE_PAGES } from './parent-course-pages'

/** A capa do curso, ou um ladrilho calmo quando o curso ainda não tem imagem. */
export function ParentCourseCover({
  url,
  className = '',
}: {
  url: string | null
  className?: string
}) {
  return url ? (
    <img src={url} alt="" className={`w-full rounded-2xl object-cover ${className}`} />
  ) : (
    <div
      aria-hidden="true"
      className={`flex w-full items-center justify-center rounded-2xl bg-(--band-ceu) text-primary ${className}`}
    >
      <BookOpen className="size-12" strokeWidth={1.5} />
    </div>
  )
}

function CourseCard({
  course,
  mine,
  offer,
  index,
}: {
  course: CatalogCourseView
  mine?: MyCourseView
  offer?: CommerceCatalogOffer
  index: number
}) {
  const done = mine?.progress.percent === 100
  const started = Boolean(mine && mine.progress.percent > 0 && !done)
  const gift = (mine?.accessReason ?? course.accessReason) === 'gift'
  const lessons = lessonsChip(course.lessonsCount)
  const page = PARENT_COURSE_PAGES[course.courseSlug]
  const chips = [lessons, ...(page?.chips.slice(0, 1) ?? [])].filter((chip): chip is string =>
    Boolean(chip),
  )
  return (
    <li className="flex">
      <Link
        href={parentCourseHref(course.courseSlug)}
        className="kids-carta flex w-full flex-col overflow-hidden p-0 text-foreground"
      >
        <div className={`relative h-[180px] ${COURSE_BANDS[index % COURSE_BANDS.length]}`}>
          {course.coverImageUrl ? (
            <img src={course.coverImageUrl} alt="" className="block h-full w-full object-cover" />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-full items-center justify-center text-primary"
            >
              <BookOpen className="size-12" strokeWidth={1.5} />
            </div>
          )}
          <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 font-extrabold text-[13px] shadow-sm">
            {!course.hasAccess ? <Lock className="size-3.5" aria-hidden="true" /> : null}
            Curso para pais
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 px-5 pt-[18px] pb-5">
          <h3 className="sz-display text-[1.375rem] leading-tight">{course.title}</h3>
          {course.subtitle ? (
            <p className="text-muted-foreground text-sm leading-normal">{course.subtitle}</p>
          ) : null}
          {chips.length || gift || done ? (
            <span className="flex flex-wrap gap-1.5">
              {gift ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-(--band-lilas) px-2.5 py-1 font-bold text-xs">
                  <Gift className="size-3.5" aria-hidden="true" /> Presente
                </span>
              ) : null}
              {done ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-(--band-menta) px-2.5 py-1 font-bold text-xs">
                  <Check className="size-3.5" aria-hidden="true" /> Concluído
                </span>
              ) : null}
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-muted px-2.5 py-1 font-bold text-muted-foreground text-xs"
                >
                  {chip}
                </span>
              ))}
            </span>
          ) : null}
          <span className="mt-auto flex items-center justify-between gap-2.5 border-(--linha-carta) border-t-2 border-dashed pt-3.5">
            {started && mine ? (
              <span className="font-bold text-sm">
                {mine.progress.completedLessons} de {mine.progress.totalLessons} aulas concluídas
              </span>
            ) : !course.hasAccess && offer ? (
              <strong className="sz-display text-[1.375rem]">{money(offer.priceCents)}</strong>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1.5 font-extrabold text-[15px] text-primary">
              {course.hasAccess ? 'Abrir o curso' : 'Ver o curso'}
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </span>
        </div>
      </Link>
    </li>
  )
}

/**
 * Cursos para pais (14/11/2026): o curso em andamento no alto e todos os cursos embaixo. O curso
 * fechado leva à página dele, que explica como liberar.
 */
export function ParentCoursesView({
  parentName,
  catalog,
  offers = {},
  mine,
  failed,
}: {
  parentName?: string
  catalog: CatalogCourseView[]
  /** A oferta de venda de cada curso fechado, pelo slug do curso (o preço do cartão). */
  offers?: Readonly<Record<string, CommerceCatalogOffer>>
  mine: MyCourseView[]
  failed: boolean
}) {
  const bySlug = new Map(mine.map((course) => [course.courseSlug, course]))
  const current =
    mine.find((course) => course.progress.percent > 0 && course.progress.percent < 100) ?? null
  const allIncluded = catalog.length > 0 && catalog.every((course) => course.hasAccess)
  return (
    <ParentShell active="cursos" parentName={parentName}>
      <ParentPageTitle
        title="Cursos para pais"
        text={`Seus filhos aprendem a criar jogos aqui, e estes cursos são para você. Eles mostram como ajudar sem fazer por eles, o que dizer quando algo dá errado e como transformar o que eles criam em conversa.${allIncluded ? ' Todos estão incluídos na sua assinatura.' : ''}`}
      />
      {current ? (
        <section
          aria-labelledby="continue-title"
          className="kids-carta flex flex-wrap items-center gap-6 p-5 sm:p-7"
        >
          <div className="w-full max-w-[19rem]">
            <ParentCourseCover url={current.coverImageUrl} className="h-44" />
          </div>
          <div className="flex min-w-[16rem] flex-1 flex-col gap-3">
            <span className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
              Continue de onde parou
            </span>
            <h2 id="continue-title" className="sz-display text-[1.75rem] leading-tight">
              {current.title}
            </h2>
            {current.subtitle ? <p className="text-muted-foreground">{current.subtitle}</p> : null}
            <p className="font-bold text-sm">
              {current.progress.completedLessons} de {current.progress.totalLessons} aulas
              concluídas
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={parentCourseHref(current.courseSlug, current.continueLessonId)}
                className={PRIMARY_ACTION}
              >
                Continuar de onde parei
              </Link>
              <Link href={parentCourseHref(current.courseSlug)} className={SECONDARY_ACTION}>
                Ver as aulas
              </Link>
            </div>
          </div>
        </section>
      ) : null}
      <ParentSection title="Todos os cursos" id="all-courses">
        {catalog.length ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-6">
            {catalog.map((course, index) => (
              <CourseCard
                key={course.courseSlug}
                course={course}
                mine={bySlug.get(course.courseSlug)}
                offer={offers[course.courseSlug]}
                index={index}
              />
            ))}
          </ul>
        ) : (
          <p className="kids-carta p-5 text-muted-foreground text-sm">
            {failed
              ? 'Não conseguimos carregar os cursos agora. Tente de novo daqui a pouco.'
              : 'Os cursos para pais aparecem aqui.'}
          </p>
        )}
      </ParentSection>
    </ParentShell>
  )
}
