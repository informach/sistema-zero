import { ArrowRight, Check, Lock, MapIcon, Play, Trophy } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { CourseCover, ProgressBar } from '@/components/community/courses/course-cover'
import { BackLink, PageBand, PageBody } from '@/components/community/page'
import { cn } from '@/lib/cn'
import { type LockedCourseLink, lockedCourseLink } from '@/lib/continuity'
import {
  countWords,
  isCourseDone,
  isTrack,
  type LevelState,
  levelLabel,
  summarizeTrack,
  trackLabel,
} from '@/lib/course-levels'
import { lessonCountLabel, nextLessonOf } from '@/lib/course-outline'
import type { CatalogCourseView, CourseProgress } from '@/lib/types'
import { getMyCourse, listCatalog, listMyCourses } from '@/server/members'

export const dynamic = 'force-dynamic'

type TrackCourse = CatalogCourseView & { progress: CourseProgress | null }

const courseHref = (slug: string) => `/cursos/${encodeURIComponent(slug)}`

/**
 * A página de uma trilha (direção de arte de 18/10/2026; o equivalente adulto da trilha do Kids):
 * os cursos do eixo (2D ou 3D) nível por nível, numa linha do tempo, com o estado de cada curso e
 * o botão certo. Só dados do catálogo e de Meus cursos; nível sem curso não aparece.
 */
export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params
  if (!isTrack(track)) notFound()
  const [catalog, mine] = await Promise.all([
    listCatalog().catch(() => null),
    listMyCourses().catch(() => null),
  ])
  // Catálogo fora do ar: um recado na página, como em /cursos, e não a tela de erro do Next.
  if (catalog?.status !== 200)
    return (
      <>
        <PageBand
          back={{ href: '/cursos', label: 'Voltar aos cursos' }}
          kicker="Trilha"
          title={trackLabel(track)}
        />
        <PageBody>
          <p role="status" className="sz-card p-6 text-muted-foreground">
            Trilha indisponível agora. Tente novamente mais tarde.
          </p>
        </PageBody>
      </>
    )
  const progressBySlug = new Map(
    (mine?.status === 200 ? (mine.body?.courses ?? []) : []).map((course) => [
      course.courseSlug,
      course.progress,
    ]),
  )
  const courses: TrackCourse[] = (catalog.body?.courses ?? []).map((course) => ({
    ...course,
    progress: progressBySlug.get(course.courseSlug) ?? null,
  }))
  const summary = summarizeTrack(courses, track)
  if (summary.courses.length === 0) notFound()

  // O curso em destaque: o que a pessoa está fazendo no nível atual (ou o próximo liberado dele).
  const currentCourses =
    summary.levels.find((level) => level.level === summary.currentLevel)?.courses ?? []
  const available = currentCourses.filter((course) => course.hasAccess && !isCourseDone(course))
  const highlighted =
    available.find((course) => (course.progress?.completedLessons ?? 0) > 0) ?? available[0]
  const highlightedDetail =
    highlighted && (highlighted.progress?.completedLessons ?? 0) > 0
      ? await getMyCourse(highlighted.courseSlug).catch(() => null)
      : null
  const highlightedNext =
    highlightedDetail?.status === 200 && highlightedDetail.body
      ? nextLessonOf(highlightedDetail.body)
      : null
  const ladder = summary.levels.filter((level) => level.level !== 'lenda')
  const total = summary.courses.length
  const where =
    summary.currentLevel === 'lenda'
      ? 'Você está nos cursos extras.'
      : summary.currentLevel !== null
        ? `Você está no nível ${levelLabel(summary.currentLevel)}.`
        : summary.finished
          ? 'Você concluiu todos os cursos da trilha.'
          : summary.owned > 0
            ? 'Você concluiu os cursos liberados para você nesta trilha.'
            : 'Os cursos desta trilha ainda não fazem parte do seu acesso.'
  const lead = `${countWords(total, 'curso', 'cursos')} em ${countWords(ladder.length || 1, 'nível', 'níveis')}. Cada curso termina com um jogo seu, pronto para jogar e mostrar.`

  return (
    <>
      <section className="sz-band">
        <div className="sz-page flex flex-col gap-4 pt-7 pb-9 md:pb-11">
          <BackLink href="/cursos" label="Voltar aos cursos" />
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex min-w-0 flex-[1_1_28rem] flex-col gap-2.5">
              <span className="sz-chip sz-chip-escuro self-start">
                <MapIcon aria-hidden />
                Trilha
              </span>
              <h1 className="sz-h1">{trackLabel(track)}</h1>
              <p className="sz-lead">{lead.charAt(0).toLocaleUpperCase('pt-BR') + lead.slice(1)}</p>
            </div>
            <div className="sz-card-sm flex w-full flex-col gap-2.5 p-5 md:w-[19rem] md:flex-none">
              <div className="flex justify-between gap-3">
                <strong>Cursos concluídos</strong>
                <span className="text-muted-foreground">
                  {summary.done} de {total}
                </span>
              </div>
              <ProgressBar
                value={(summary.done / total) * 100}
                label="Cursos concluídos na trilha"
              />
              <span className="text-[0.85rem] text-muted-foreground">{where}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="sz-page flex flex-col gap-10 pt-10 pb-16 md:pt-12">
        {summary.levels.map((level) => {
          const ladderIndex = ladder.findIndex((item) => item.level === level.level)
          const extra = level.level === 'lenda'
          const headingId = `nivel-${level.level}`
          return (
            <section key={level.level} aria-labelledby={headingId} className="flex gap-4 md:gap-7">
              <TimelineNode state={level.state} number={extra ? null : ladderIndex + 1} />
              <div className="flex min-w-0 flex-1 flex-col gap-5">
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
                  <span className="sz-kicker">{extra ? 'Extra' : `Nível ${ladderIndex + 1}`}</span>
                  <h2 id={headingId} className="sz-h2">
                    {extra ? 'Cursos extras' : levelLabel(level.level)}
                  </h2>
                  {level.state === 'done' ? (
                    <span className="sz-chip sz-chip-ok">
                      <Check aria-hidden />
                      Concluído
                    </span>
                  ) : level.state === 'current' ? (
                    <span className="sz-chip sz-chip-acao">Você está aqui</span>
                  ) : null}
                </div>
                <ul className="flex flex-col gap-5">
                  {level.courses.map((course) => (
                    <li key={course.courseSlug}>
                      <TrackCourseRow
                        course={course}
                        highlighted={course === highlighted}
                        next={course === highlighted ? highlightedNext : null}
                        locked={lockedCourseLink(course.salesPageUrl)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )
        })}

        <section className="sz-palco flex flex-col items-start gap-5 rounded-[1.2rem] p-6 md:flex-row md:items-center md:gap-6 md:p-8">
          <span className="inline-flex size-[3.2rem] shrink-0 items-center justify-center rounded-[0.8rem] bg-(--topo-borda) text-(--sz-community-yellow)">
            <Trophy className="size-7" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="sz-h3 text-white">Cada curso termina com um jogo para mostrar</h2>
            <p className="text-(--topo-texto)">
              Publique no Mural dos Criadores e veja quantas vezes ele foi jogado.
            </p>
          </div>
          <Link href="/mural-dos-criadores-adulto" prefetch={false} className="sz-btn-white">
            Ver o Mural
          </Link>
        </section>
      </div>
    </>
  )
}

/** O marco do nível na linha do tempo: ✓ verde quando feito, o número na cor de ação quando atual. */
function TimelineNode({ state, number }: { state: LevelState; number: number | null }) {
  return (
    <div aria-hidden className="flex w-[2.4rem] flex-none flex-col items-center md:w-[3.2rem]">
      <span
        className={cn(
          'inline-flex size-[2.4rem] items-center justify-center rounded-full font-bold text-[1.1rem] md:size-[3.2rem]',
          state === 'done' && 'bg-(--pen-sucesso) text-white',
          state === 'current' &&
            'bg-primary text-primary-foreground shadow-[0_0_0_6px_var(--acao-tint)]',
          state === 'upcoming' && 'bg-muted text-foreground',
        )}
      >
        {state === 'done' ? <Check className="size-6 md:size-7" /> : (number ?? '★')}
      </span>
      <span
        className={cn(
          'mt-2 min-h-[6rem] w-[0.3rem] flex-1 rounded-full',
          state === 'done' ? 'bg-(--pen-sucesso)' : 'bg-border',
        )}
      />
    </div>
  )
}

function TrackCourseRow({
  course,
  highlighted,
  next,
  locked,
}: {
  course: TrackCourse
  highlighted: boolean
  next: ReturnType<typeof nextLessonOf>
  locked: LockedCourseLink
}) {
  const { progress } = course
  const done = course.hasAccess && isCourseDone(course)
  const started = !done && (progress?.completedLessons ?? 0) > 0

  let meta: { text: string; accent?: boolean } | null = null
  let detail: ReactNode = null
  let action: ReactNode = null
  if (!course.hasAccess) {
    meta = { text: 'Ainda não faz parte do seu acesso' }
    detail = locked.note
    action = (
      <a href={locked.href} target="_blank" rel="noopener noreferrer" className="sz-btn-outline">
        {locked.label}
        <ArrowRight aria-hidden />
      </a>
    )
  } else if (done) {
    detail = progress
      ? `${progress.totalLessons} de ${lessonCountLabel(progress.totalLessons)}${course.milestones?.showcased ? ' · jogo publicado no Mural' : ''}`
      : 'Curso concluído'
    action = (
      <Link href={courseHref(course.courseSlug)} prefetch={false} className="sz-btn-outline">
        Revisar curso
      </Link>
    )
  } else if (started && progress) {
    meta = { text: 'Em andamento', accent: true }
    detail = (
      <div className="flex max-w-[21rem] flex-col gap-1.5">
        <div className="flex justify-between gap-3 text-[0.85rem] text-muted-foreground">
          <span>
            {progress.completedLessons} de {lessonCountLabel(progress.totalLessons)}
          </span>
          <span>{progress.percent}%</span>
        </div>
        <ProgressBar
          value={progress.percent}
          label={`Progresso em ${course.title}`}
          className="h-2.5"
        />
      </div>
    )
    action = next ? (
      <Link
        href={`${courseHref(course.courseSlug)}/aulas/${encodeURIComponent(next.lesson.id)}`}
        prefetch={false}
        className="sz-btn"
      >
        <Play className="fill-current" aria-hidden />
        Continuar a aula {next.number}
      </Link>
    ) : (
      <Link href={courseHref(course.courseSlug)} prefetch={false} className="sz-btn">
        Continuar
      </Link>
    )
  } else {
    meta = {
      text: progress?.totalLessons
        ? `Liberado para você · ${lessonCountLabel(progress.totalLessons)}`
        : 'Liberado para você',
    }
    detail = course.subtitle
    action = (
      <Link href={courseHref(course.courseSlug)} prefetch={false} className="sz-btn-outline">
        Começar agora
      </Link>
    )
  }

  return (
    <article
      className={cn(
        'sz-card flex flex-col overflow-hidden sm:flex-row',
        highlighted && started && 'shadow-[0_0_0_3px_var(--primary)]',
      )}
    >
      <div className="relative aspect-video bg-(--topo) sm:aspect-auto sm:min-h-[9.5rem] sm:flex-[0_0_15rem]">
        <div className="absolute inset-0">
          <CourseCover src={course.coverImageUrl} />
        </div>
        {!course.hasAccess ? (
          <span className="sz-chip sz-chip-escuro absolute top-3 left-3">
            <Lock aria-hidden />
            Bloqueado
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 md:flex-row md:items-center md:gap-6 md:p-7">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {meta ? (
            <span className={cn('sz-kicker', meta.accent && 'text-(--acao-texto)')}>
              {meta.text}
            </span>
          ) : null}
          <h3 className="sz-h3">{course.title}</h3>
          {typeof detail === 'string' ? (
            <span className="text-muted-foreground">{detail}</span>
          ) : (
            detail
          )}
        </div>
        {action ? <div className="flex-none">{action}</div> : null}
      </div>
    </article>
  )
}
