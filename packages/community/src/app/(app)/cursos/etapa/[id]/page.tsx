import type { AdultCreatorCapability } from '@sistemazero/core/journey'
import { ArrowRight, Check, CheckCircle2, Lock, Trophy } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { CourseCover, ProgressBar } from '@/components/community/courses/course-cover'
import { JourneyRibbon } from '@/components/community/journey/stage'
import { BackLink, PageBody } from '@/components/community/page'
import { type LockedCourseLink, lockedCourseLink } from '@/lib/continuity'
import { isCourseDone } from '@/lib/course-levels'
import {
  normalizeJourney,
  type StageBadge,
  stageBadgeOf,
  stageColor,
  stageInk,
} from '@/lib/journey-stage'
import type { CatalogCourseView, CourseProgress } from '@/lib/types'
import { listCatalog, listMyCourses } from '@/server/members'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

const CAPABILITIES: Record<AdultCreatorCapability, string> = {
  studio: 'o Estúdio livre',
  pinta: 'o Pinta',
  molda: 'o Molda, a oficina 3D',
  bridge: 'a Ponte entre blocos e código',
  pro: 'o Estúdio Pro, com código',
  ai: 'o tutor Zappy no Estúdio',
  pensa: 'o Pensa',
}

/** "a, b e c" */
function joinPt(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`
}

type CourseState = 'pronto' | 'publicar' | 'andamento' | 'novo' | 'sem-acesso'

const STATE: Record<CourseState, { text: string; chip: string }> = {
  pronto: { text: 'Pronto', chip: 'sz-chip-ok' },
  publicar: { text: 'Concluído · falta publicar no Mural', chip: 'sz-chip-aviso' },
  andamento: { text: 'Em andamento', chip: 'sz-chip-acao' },
  novo: { text: 'Ainda não começou', chip: '' },
  'sem-acesso': { text: 'Ainda não faz parte do seu acesso', chip: '' },
}

/**
 * A página de uma etapa da jornada adulta (19/10/2026; a "trilha da etapa" da prancha "Jornada
 * adulta"): a cor e o nome da etapa, o que ela libera ao concluir e os cursos que ela pede, cada um
 * com o estado e o próximo passo. A jornada vem do mesmo pedido do layout; os cursos, do catálogo
 * (que traz o id) e de Meus cursos (o progresso). Etapa que não existe na jornada é 404.
 */
export default async function StagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [gamification, catalog, mine] = await Promise.all([
    shell.members.getGamificationReadonly({ withRanking: true }).catch(() => null),
    listCatalog().catch(() => null),
    listMyCourses().catch(() => null),
  ])
  // Gamificação fora do ar: um recado na página, não um "não encontrada" (a etapa existe).
  if (gamification?.status !== 200)
    return (
      <PageBody>
        <BackLink href="/progresso" label="Voltar para Seu progresso" />
        <div role="status" className="sz-card flex flex-col items-start gap-3 p-7">
          <strong className="sz-h3">Etapa indisponível agora.</strong>
          <p className="m-0 text-muted-foreground">Tente novamente em alguns instantes.</p>
          <Link href={`/cursos/etapa/${encodeURIComponent(id)}`} className="sz-btn">
            Tentar de novo
          </Link>
        </div>
      </PageBody>
    )
  const journey = normalizeJourney(gamification.body?.journey)
  const index = journey?.configured ? journey.stages.findIndex((stage) => stage.id === id) : -1
  const stage = journey && index >= 0 ? journey.stages[index] : undefined
  const current = stageBadgeOf(journey)
  if (!journey || !stage || !current) notFound()
  const currentStage = journey.stages[current.position - 1]

  const total = journey.stages.length + 1
  const badge: StageBadge = { position: index + 1, total, title: stage.title }
  const byId = new Map(
    (catalog?.status === 200 ? (catalog.body?.courses ?? []) : []).flatMap((course) =>
      course.courseId ? [[course.courseId, course] as const] : [],
    ),
  )
  const progressBySlug = new Map(
    (mine?.status === 200 ? (mine.body?.courses ?? []) : []).map((course) => [
      course.courseSlug,
      course.progress,
    ]),
  )
  const missing = new Set(stage.missing.map((item) => item.courseId))
  const rows = stage.requirements.map((requirement) => {
    const course = byId.get(requirement.courseId)
    const progress = course ? (progressBySlug.get(course.courseSlug) ?? null) : null
    // A jornada adulta não tranca curso: num curso de etapa futura vale o estado real dele (o
    // que a pessoa já fizer conta quando a etapa abrir). O aviso de etapa fechada fica na faixa.
    const state: CourseState = !missing.has(requirement.courseId)
      ? 'pronto'
      : course && !course.hasAccess
        ? 'sem-acesso'
        : requirement.milestone === 'showcase' && course && isCourseDone({ ...course, progress })
          ? 'publicar'
          : (progress?.completedLessons ?? 0) > 0
            ? 'andamento'
            : 'novo'
    return { requirement, course, progress, state }
  })
  const ready = rows.filter((row) => row.state === 'pronto').length
  const unlocks = stage.capabilities.map((capability) => CAPABILITIES[capability])
  const unlockText = unlocks.length
    ? joinPt(unlocks)
    : index === journey.stages.length - 1
      ? 'o título de Lenda'
      : 'a próxima etapa'
  const color = { '--etapa-cor': stageColor(badge) } as CSSProperties

  return (
    <>
      <section
        className="sz-band"
        style={{ ...color, borderTop: `6px solid ${stageColor(badge)}` }}
      >
        <div className="sz-page flex flex-col gap-4 pt-7 pb-9 md:pb-11">
          <BackLink href="/progresso" label="Voltar para Seu progresso" />
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex min-w-0 flex-[1_1_28rem] flex-col items-start gap-5 sm:flex-row sm:items-center">
              <span
                aria-hidden="true"
                className="inline-flex size-16 flex-none items-center justify-center rounded-full font-extrabold text-[1.6rem] [font-family:var(--font-display)] md:size-20"
                style={{
                  background: stageColor(badge),
                  color: stageInk(badge),
                  boxShadow: `0 0 0 4px var(--card), 0 0 0 7px ${stageColor(badge)}`,
                }}
              >
                {badge.position}
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="sz-kicker">
                  Etapa {badge.position} de {total}
                </span>
                <h1 className="sz-h1 break-words">{stage.title}</h1>
                <p className="sz-lead m-0">
                  <b>Ao concluir, libera:</b> {unlockText}.
                </p>
              </div>
            </div>
            <div className="sz-card-sm flex w-full flex-col gap-2.5 p-5 md:w-[19rem] md:flex-none">
              <div className="flex justify-between gap-3">
                <strong>Cursos prontos</strong>
                <span className="text-muted-foreground">
                  {ready} de {rows.length}
                </span>
              </div>
              <ProgressBar
                value={rows.length ? (ready / rows.length) * 100 : 0}
                label="Cursos prontos na etapa"
                done={stage.completed}
              />
              <span className="flex items-center gap-2 text-[0.85rem] text-muted-foreground">
                {stage.completed ? (
                  <>
                    <CheckCircle2 aria-hidden className="size-4 text-(--pen-ok-texto)" />
                    Etapa concluída
                  </>
                ) : stage.available ? (
                  'Você está nesta etapa.'
                ) : (
                  <>
                    <Lock aria-hidden className="size-4" />
                    Abre quando a etapa {badge.position - 1} for concluída.
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      <PageBody className="gap-8">
        <section aria-labelledby="etapa-onde" className="flex flex-col gap-3">
          <h2 id="etapa-onde" className="sz-h4">
            Onde você está na jornada
          </h2>
          <JourneyRibbon
            badge={current}
            currentShare={
              currentStage?.requirements.length
                ? 1 - currentStage.missing.length / currentStage.requirements.length
                : undefined
            }
          />
        </section>
        <section aria-labelledby="etapa-cursos" className="flex flex-col gap-5">
          <h2 id="etapa-cursos" className="sz-h2">
            Cursos da etapa
          </h2>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {rows.map(({ requirement, course, progress, state }) => (
              <li key={requirement.courseId}>
                <StageCourseRow
                  course={course}
                  progress={progress}
                  state={state}
                  showcase={requirement.milestone === 'showcase'}
                  locked={lockedCourseLink(course?.salesPageUrl)}
                />
              </li>
            ))}
          </ul>
          <p className="m-0 text-[0.9rem] text-muted-foreground">
            {stage.completed
              ? 'Os cursos continuam abertos para rever quando quiser.'
              : 'Pronto quer dizer concluído e, quando o curso pede, com o jogo publicado no Mural.'}
          </p>
        </section>
      </PageBody>
    </>
  )
}

function StageCourseRow({
  course,
  progress,
  state,
  showcase,
  locked,
}: {
  course: CatalogCourseView | undefined
  progress: CourseProgress | null
  state: CourseState
  showcase: boolean
  locked: LockedCourseLink
}) {
  if (!course)
    return (
      <div className="sz-card-sm flex items-center gap-4 p-5 text-muted-foreground">
        Um curso desta etapa está indisponível no momento.
      </div>
    )
  const href = `/cursos/${encodeURIComponent(course.courseSlug)}`
  const info = STATE[state]
  return (
    <article className="sz-card-sm flex flex-col gap-4 p-4 sm:flex-row sm:items-center md:p-5">
      <div className="aspect-[32/17] w-full flex-none overflow-hidden rounded-[0.8rem] bg-(--topo) sm:w-[11rem]">
        <CourseCover src={course.coverImageUrl} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="sz-h4">{course.title}</h3>
        <span className="text-[0.85rem] text-muted-foreground">
          {showcase ? 'Concluir e publicar o jogo no Mural' : 'Concluir o curso'}
          {progress && progress.totalLessons > 0 && state !== 'pronto'
            ? ` · ${progress.completedLessons} de ${progress.totalLessons} aulas`
            : ''}
        </span>
        <span className={`sz-chip ${info.chip} self-start`}>
          {state === 'pronto' ? <Check aria-hidden /> : null}
          {state === 'sem-acesso' ? <Lock aria-hidden /> : null}
          {state === 'publicar' ? <Trophy aria-hidden /> : null}
          {info.text}
        </span>
      </div>
      <div className="flex-none">
        {state === 'sem-acesso' ? (
          <a
            href={locked.href}
            target="_blank"
            rel="noopener noreferrer"
            className="sz-btn-outline"
          >
            {locked.label}
            <ArrowRight aria-hidden />
          </a>
        ) : (
          <Link
            href={href}
            prefetch={false}
            className={state === 'pronto' ? 'sz-btn-outline' : 'sz-btn'}
          >
            {state === 'pronto'
              ? 'Revisar curso'
              : state === 'publicar'
                ? 'Abrir o curso para publicar'
                : state === 'andamento'
                  ? 'Continuar'
                  : 'Começar'}
          </Link>
        )}
      </div>
    </article>
  )
}
