'use client'

import { BookOpen, Check, Gift, Lock } from 'lucide-react'
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

function CourseCard({ course, mine }: { course: CatalogCourseView; mine?: MyCourseView }) {
  const done = mine?.progress.percent === 100
  const started = Boolean(mine && mine.progress.percent > 0 && !done)
  const gift = (mine?.accessReason ?? course.accessReason) === 'gift'
  return (
    <li className="flex">
      <Link
        href={parentCourseHref(course.courseSlug)}
        className="kids-carta flex w-full flex-col gap-3 p-4 text-foreground transition-transform hover:-translate-y-0.5"
      >
        <ParentCourseCover url={course.coverImageUrl} className="h-40" />
        <div className="flex flex-wrap gap-2">
          {!course.hasAccess ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-bold text-muted-foreground text-xs">
              <Lock className="size-3.5" aria-hidden="true" /> Fechado
            </span>
          ) : gift ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--kids-lilas-bg) px-2.5 py-0.5 font-bold text-xs">
              <Gift className="size-3.5" aria-hidden="true" /> Presente
            </span>
          ) : null}
          {done ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-(--kids-menta-bg) px-2.5 py-0.5 font-bold text-xs">
              <Check className="size-3.5" aria-hidden="true" /> Concluído
            </span>
          ) : null}
        </div>
        <h3 className="sz-display text-xl leading-tight">{course.title}</h3>
        {course.subtitle ? (
          <p className="text-muted-foreground text-sm">{course.subtitle}</p>
        ) : null}
        {started && mine ? (
          <p className="mt-auto font-bold text-sm">
            {mine.progress.completedLessons} de {mine.progress.totalLessons} aulas concluídas
          </p>
        ) : null}
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
  mine,
  failed,
}: {
  parentName?: string
  catalog: CatalogCourseView[]
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
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.map((course) => (
              <CourseCard
                key={course.courseSlug}
                course={course}
                mine={bySlug.get(course.courseSlug)}
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
