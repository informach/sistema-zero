import type { CreatorJourneyView, KidsCreatorCapability } from '@sistemazero/core/journey'
import {
  type CreatorEntryCardView,
  type CreatorStageView,
  creatorEntryCard,
  creatorEntryNote,
  creatorStageChecklist,
  creatorStageMissing,
  creatorStageSummary,
  creatorStageTodo,
} from '@sistemazero/member-shell/lib/creator-journey-presentation'
import { Map as MapIcon, Trophy } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { capabilityPhrase } from '@/lib/journey-rewards'
import type { CatalogCourseView, CourseTrack, MyCourseView, StudentLevelSlug } from '@/lib/types'
import { KidsBackButton } from '../back-button'
import { KidsBand } from '../kids-band'
import { KidsSectionHeader } from '../kids-section-header'
import {
  ChecklistStrip,
  checklistItems,
  KidsTag,
  MissionCard,
  PowerCard,
  StageMedal,
  TrailCourseCard,
  WideCourseCard,
} from './parts'

export type TrailCapabilities = Partial<Record<StudentLevelSlug, readonly KidsCreatorCapability[]>>

/** Quantos Poderes aparecem antes do "Ver todos": duas fileiras da grade de três. */
const POWERS_VISIBLE = 6

type StageRelation = 'current' | 'past' | 'future'

function relationOf(view: CreatorJourneyView, index: number): StageRelation {
  const stage = view.stages[index]!
  if (stage.level === view.level) return 'current'
  if (!stage.available && !stage.earned && !stage.completed) return 'future'
  return 'past'
}

const powerWord = (n: number) => (n === 1 ? 'Poder' : 'Poderes')

/**
 * A trilha de um posto (`/cursos/trilha/<slug>`), no desenho aprovado: o medalhão e o nome,
 * a faixa "Para virar…", os cursos da trilha em cartões grandes, a missão, a grade de
 * Poderes, os extras e, na trilha atual, o cartão do próximo nível. Uma trilha futura usa o
 * mesmo desenho, com cada cartão dizendo quando abre.
 */
export function KidsCreatorTrail({
  view,
  level,
  catalog,
  mine,
  capabilities = {},
}: {
  view: CreatorJourneyView
  level: StudentLevelSlug
  catalog: readonly CatalogCourseView[]
  mine: readonly MyCourseView[]
  capabilities?: TrailCapabilities
}) {
  const index = view.stages.findIndex((item) => item.level === level)
  const stage = view.stages[index]!
  const next = view.stages[index + 1] ?? null
  const nextTitle = next?.title ?? 'Lenda'
  const relation = relationOf(view, index)
  const future = relation === 'future'
  const list = creatorStageChecklist(stage)
  const card = (entry: Parameters<typeof creatorEntryCard>[0]) =>
    creatorEntryCard(entry, catalog, mine)
  const base2d = card(stage.base2d)
  const base3d = card(stage.base3d)
  const mission = card(stage.mission)
  const note = (item: CreatorEntryCardView, role?: 'base3d' | 'after-pair') =>
    creatorEntryNote(item.status, future ? { futureStage: stage.title } : { role })
  const currentIndex = view.stages.findIndex((item) => item.level === view.level)
  const current = currentIndex >= 0 ? view.stages[currentIndex]! : null

  return (
    <>
      <KidsBand tone="creme">
        <KidsBackButton href="/cursos" label="Voltar ao mapa" showLabel className="mb-6" />
        <div className="flex items-center gap-4">
          <StageMedal
            slug={stage.level}
            ring={relation === 'current' ? 'var(--primary)' : `var(--level-${stage.level})`}
            dim={future}
            lock={future}
            className="size-16 md:size-[4.5rem]"
          />
          <div className="min-w-0">
            <h1 className="sz-display text-[clamp(2rem,3.6vw,3rem)]">Trilha {stage.title}</h1>
            {stage.genre ? (
              <span className="mt-2 flex flex-wrap gap-1.5">
                <KidsTag tone="amarelo">{stage.genre}</KidsTag>
              </span>
            ) : null}
          </div>
        </div>
        <p className="mt-4 max-w-4xl font-medium text-[1.0625rem] text-muted-foreground">
          {future
            ? `A trilha inteira abre quando você chegar a ${stage.title}. Os cursos daqui que você já tem continuam abertos para você.`
            : relation === 'past'
              ? stage.earned && !list.complete
                ? creatorStageSummary(stage)
                : 'Trilha concluída! Os cursos continuam abertos para você revisar e explorar.'
              : `Faça os cursos da trilha, a missão e ${stage.minimumPowers} ${powerWord(stage.minimumPowers)} para virar ${nextTitle}.`}
        </p>
        {view.paused ? (
          <p
            role="status"
            className="kids-carta mt-6 border-2 border-(--band-amarelo) p-4 font-bold text-[0.9375rem]"
          >
            A jornada está pausada por enquanto. Seus cursos e conquistas continuam guardados, e
            você pode continuar criando com o que já abriu.
          </p>
        ) : null}
        {future && current ? (
          <FutureNotice current={current} reachesHere={currentIndex === index - 1} />
        ) : (
          <ChecklistStrip
            title={relation === 'past' ? 'O que você fez aqui' : `Para virar ${nextTitle}`}
            items={checklistItems(list, mission.lessons)}
            className="mt-6"
          />
        )}
      </KidsBand>

      <KidsBand tone="creme">
        <section aria-labelledby="cursos">
          <KidsSectionHeader
            id="cursos"
            title="Cursos da trilha"
            subtitle={
              future
                ? 'Os dois cursos que abrem a trilha: primeiro o 2D, depois o 3D.'
                : 'Comece por aqui: primeiro o 2D, depois o 3D. Eles ensinam tudo o que a missão vai pedir.'
            }
          />
          <div className="grid gap-6 md:grid-cols-2">
            <TrailCourseCard card={base2d} note={note(base2d)} />
            <TrailCourseCard card={base3d} note={note(base3d, 'base3d')} />
          </div>
        </section>
      </KidsBand>

      <KidsBand tone="creme">
        <section aria-labelledby="missao">
          <KidsSectionHeader
            id="missao"
            title="Missão"
            subtitle="Um jogo novo para mostrar o que você aprendeu. Abre quando você termina os cursos da trilha."
          />
          <MissionCard card={mission} note={note(mission, 'after-pair')} />
        </section>
      </KidsBand>

      <KidsBand tone="creme">
        <PowersSection stage={stage} catalog={catalog} mine={mine} future={future} />
      </KidsBand>

      {stage.extras.length ? (
        <KidsBand tone="creme">
          <section aria-labelledby="extras">
            <KidsSectionHeader
              id="extras"
              title="Extras"
              subtitle="Para ir além. Não contam para o próximo nível."
            />
            <ul className="grid gap-4">
              {stage.extras.map((extra) => {
                const item = card(extra)
                return (
                  <li key={extra.courseId}>
                    <WideCourseCard card={item} note={note(item, 'after-pair')} eyebrow="Extra" />
                  </li>
                )
              })}
            </ul>
          </section>
        </KidsBand>
      ) : null}

      {relation === 'current' ? (
        <KidsBand tone="lilas">
          {next ? (
            <NextLevelCard
              slug={next.level}
              title={next.title}
              genre={next.genre ?? null}
              tools={capabilityPhrase(capabilities[next.level] ?? [])}
              missing={creatorStageMissing(stage)}
              percent={list.percent}
            />
          ) : (
            <LegendCard missing={creatorStageMissing(stage)} percent={list.percent} />
          )}
        </KidsBand>
      ) : null}
    </>
  )
}

function PowersSection({
  stage,
  catalog,
  mine,
  future,
}: {
  stage: CreatorStageView
  catalog: readonly CatalogCourseView[]
  mine: readonly MyCourseView[]
  future: boolean
}) {
  const cards = stage.powers.map((power) => {
    const options = power.courses.map((entry) => creatorEntryCard(entry, catalog, mine))
    const primary =
      options.find((item) => item.status === 'progress') ??
      options.find((item) => item.status === 'done') ??
      options.find((item) => item.href) ??
      options[0]
    const tracks = [
      ...new Set(options.flatMap((item) => (item.track ? [item.track] : []))),
    ].sort() as CourseTrack[]
    return { power, primary, tracks }
  })
  const required = stage.minimumPowers
  const renderCard = ({ power, primary, tracks }: (typeof cards)[number]) =>
    primary ? (
      <li key={power.mechanicId}>
        <PowerCard
          title={power.title}
          card={primary}
          tracks={tracks}
          done={power.completed}
          note={creatorEntryNote(
            primary.status,
            future ? { futureStage: stage.title } : { role: 'after-pair' },
          )}
        />
      </li>
    ) : null
  const visible = cards.slice(0, POWERS_VISIBLE)
  const rest = cards.slice(POWERS_VISIBLE)
  return (
    <section aria-labelledby="poderes">
      <KidsSectionHeader
        id="poderes"
        title="Poderes"
        subtitle={`Mecânicas novas para os seus jogos. Escolha os que quiser: ${required} ${required === 1 ? 'conta' : 'contam'} para o próximo nível. As versões 2D e 3D do mesmo Poder contam uma vez.`}
        actions={
          future ? undefined : (
            <span className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 font-extrabold text-sm">
              {Math.min(stage.powersCompleted, required)} de {required} {powerWord(required)}
            </span>
          )
        }
      />
      <ul className="grid gap-4 md:grid-cols-3">{visible.map(renderCard)}</ul>
      {rest.length ? (
        <details className="group/poderes mt-4">
          <summary className="sz-btn-gradient sz-btn-suave mx-auto flex w-fit cursor-pointer list-none gap-2 px-6 group-open/poderes:hidden">
            Ver todos os {cards.length} Poderes
          </summary>
          <ul className="grid gap-4 md:grid-cols-3">{rest.map(renderCard)}</ul>
        </details>
      ) : null}
    </section>
  )
}

/** Na trilha que ainda não abriu: onde a criança está e o caminho até aqui. */
function FutureNotice({
  current,
  reachesHere,
}: {
  current: CreatorStageView
  reachesHere: boolean
}) {
  const todo = creatorStageTodo(current, 'kids')
  return (
    <div className="kids-carta mt-6 flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-6 md:px-6">
      <StageMedal slug={current.level} className="size-14" />
      <p className="min-w-0 flex-1 font-extrabold text-[0.9375rem] leading-snug">
        {reachesHere && todo
          ? `Para chegar aqui: ${todo} na Trilha ${current.title}.`
          : `Você está na Trilha ${current.title}. As trilhas abrem uma de cada vez, na ordem do mapa.`}
      </p>
      <Link
        href={`/cursos/trilha/${current.level}`}
        prefetch={false}
        className="sz-btn-gradient shrink-0 gap-2 px-6"
      >
        <MapIcon className="size-4" aria-hidden /> Ir para a minha trilha
      </Link>
    </div>
  )
}

/** O cartão do próximo nível, no chão alternativo que fecha a página. */
function NextLevelCard({
  slug,
  title,
  genre,
  tools,
  missing,
  percent,
}: {
  slug: StudentLevelSlug
  title: string
  genre: string | null
  tools: string | null
  missing: string | null
  percent: number
}) {
  return (
    <section
      aria-label="Próximo nível"
      className="kids-carta flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-6 md:px-7 md:py-6"
    >
      <StageMedal slug={slug} dim lock className="size-16 md:size-[4.75rem]" />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
          Próximo nível
        </p>
        <p className="sz-display mt-1 text-2xl md:text-[1.625rem]">{title}</p>
        {genre || tools ? (
          <p className="mt-1.5 text-[0.9375rem]">
            {genre ? (
              <>
                <span className="font-bold">Na trilha nova: </span>
                <span className="text-muted-foreground">{genre}.</span>{' '}
              </>
            ) : null}
            {tools ? (
              <>
                <span className="font-bold">Você ganha </span>
                <span className="text-muted-foreground">{tools}.</span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      <ProgressTo missing={missing} percent={percent} />
    </section>
  )
}

function LegendCard({ missing, percent }: { missing: string | null; percent: number }) {
  return (
    <section
      aria-label="Próximo nível"
      className="kids-carta flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-6 md:px-7 md:py-6"
    >
      <StageMedal slug="god" dim lock className="size-16 md:size-[4.75rem]" />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
          O topo da jornada
        </p>
        <p className="sz-display mt-1 text-2xl md:text-[1.625rem]">Lenda</p>
        <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">
          Na Lenda, todas as Maestrias ficam abertas para você escolher no que quer ficar craque.
        </p>
        <Link
          href="/maestrias"
          prefetch={false}
          className="mt-3 inline-flex min-h-11 items-center gap-2 font-extrabold text-primary underline-offset-4 hover:underline"
        >
          <Trophy className="size-4" aria-hidden /> Conhecer as Maestrias
        </Link>
      </div>
      <ProgressTo missing={missing} percent={percent} />
    </section>
  )
}

function ProgressTo({ missing, percent }: { missing: string | null; percent: number }) {
  return (
    <div className="w-full shrink-0 md:w-60">
      <p className={cn('font-extrabold text-sm', !missing && 'text-(--success-foreground)')}>
        {missing ?? 'Tudo pronto para subir!'}
      </p>
      <div
        className="sz-progress mt-2.5"
        role="progressbar"
        aria-label="Quanto da trilha já está feito"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
