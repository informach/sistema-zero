import type { AdultCreatorCapability } from '@sistemazero/core/journey'
import {
  ArrowLeftRight,
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  Code2,
  Lightbulb,
  Lock,
  type LucideIcon,
  MessageCircle,
  Palette,
  Puzzle,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { CourseCover, ProgressBar } from '@/components/community/courses/course-cover'
import { JourneyRibbon } from '@/components/community/journey/stage'
import { BackLink, PageBody } from '@/components/community/page'
import { cn } from '@/lib/cn'
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

/** Os cartões de "Ao concluir, libera": o nome, para que serve e o ícone na cor do palco. */
const UNLOCK_TILES: Record<
  AdultCreatorCapability,
  { name: string; text: string; icon: LucideIcon; tone: string }
> = {
  studio: {
    name: 'O Estúdio livre',
    text: 'Crie jogos seus, fora das aulas.',
    icon: Puzzle,
    tone: 'text-(--cta)',
  },
  pinta: {
    name: 'O Pinta',
    text: 'Desenhe os personagens do seu jogo.',
    icon: Palette,
    tone: 'text-(--rosa)',
  },
  molda: {
    name: 'O Molda',
    text: 'A oficina 3D, para modelar objetos.',
    icon: Box,
    tone: 'text-(--laranja)',
  },
  bridge: {
    name: 'A Ponte',
    text: 'Veja os blocos virarem código.',
    icon: ArrowLeftRight,
    tone: 'text-(--menta)',
  },
  pro: {
    name: 'O Estúdio Pro',
    text: 'Crie o jogo escrevendo código.',
    icon: Code2,
    tone: 'text-(--dourado)',
  },
  ai: {
    name: 'O Zappy',
    text: 'O tutor que ajuda você no Estúdio.',
    icon: MessageCircle,
    tone: 'text-(--menta)',
  },
  pensa: {
    name: 'O Pensa',
    text: 'Planeja o jogo com você, em missões.',
    icon: Lightbulb,
    tone: 'text-(--cta)',
  },
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
  const isLast = index === journey.stages.length - 1
  const nextStage = journey.stages[index + 1]
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
                ) : stage.requirements.length === 0 ? (
                  'Aguardando os cursos desta etapa.'
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
          <section aria-labelledby="etapa-libera" className="mt-2 flex flex-col gap-3">
            <h2 id="etapa-libera" className="sz-kicker">
              Ao concluir, libera
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {stage.capabilities.map((capability) => {
                const tile = UNLOCK_TILES[capability]
                return (
                  <UnlockTile
                    key={capability}
                    icon={tile.icon}
                    tone={tile.tone}
                    name={tile.name}
                    text={tile.text}
                  />
                )
              })}
              {isLast ? (
                <UnlockTile
                  icon={Trophy}
                  tone="text-(--dourado)"
                  name="O título de Lenda"
                  text="O fim da jornada, com tudo liberado."
                />
              ) : (
                <UnlockTile
                  icon={ArrowRight}
                  tone="text-(--sz-community-action-light)"
                  name={`A etapa ${badge.position + 1}`}
                  text={nextStage?.title ?? 'A próxima etapa da jornada.'}
                />
              )}
            </ul>
          </section>
        </div>
      </section>

      <PageBody className="gap-8">
        <section aria-labelledby="etapa-onde" className="sz-card flex flex-col gap-4 p-5 md:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="etapa-onde" className="sz-h4">
              Onde você está na jornada
            </h2>
            <Link href="/progresso" prefetch={false} className="sz-link">
              Ver a jornada inteira
            </Link>
          </div>
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
              : stage.requirements.length === 0
                ? 'Os cursos desta etapa ainda estão sendo preparados. Ela permanece bloqueada até eles serem vinculados.'
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
    <article
      className={cn(
        'sz-card-sm flex flex-col gap-4 p-4 sm:flex-row sm:items-center md:p-5',
        // O curso em andamento ganha a moldura amarela: é o "você está aqui" da etapa.
        state === 'andamento' && 'shadow-[0_0_0_3px_var(--cta),0_4px_0_var(--cta-degrau)]',
      )}
    >
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

function UnlockTile({
  icon: Icon,
  tone,
  name,
  text,
}: {
  icon: LucideIcon
  tone: string
  name: string
  text: string
}) {
  return (
    <li className="sz-card-sm flex items-start gap-3.5 p-4">
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex size-11 flex-none items-center justify-center rounded-xl bg-(--carta-2)',
          tone,
        )}
      >
        <Icon className="size-6" />
      </span>
      <span className="flex min-w-0 flex-col">
        <strong>{name}</strong>
        <span className="text-[0.85rem] text-muted-foreground">{text}</span>
      </span>
    </li>
  )
}
