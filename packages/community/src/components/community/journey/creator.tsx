import type {
  AdultCreatorCapability,
  CreatorJourneyView,
  CreatorMasteryView,
} from '@sistemazero/core/journey'
import {
  CREATOR_MASTERY_ORDER,
  type CreatorEntryCardView,
  type CreatorMasteryLevelView,
  type CreatorStageView,
  creatorCurrentStage,
  creatorEntryAction,
  creatorEntryCard,
  creatorEntryNote,
  creatorJourneyHint,
  creatorMasteryApproach,
  creatorMasteryApprovalLabel,
  creatorMasteryEntryNote,
  creatorMasteryLevelStatus,
  creatorMasteryLevelTitle,
  creatorMasteryProgress,
  creatorNextStep,
  creatorStageChecklist,
  creatorStageMissing,
  creatorStageSummary,
  ROMAN_LEVEL,
} from '@sistemazero/member-shell/lib/creator-journey-presentation'
import {
  ArrowRight,
  Box,
  Braces,
  Check,
  ChevronDown,
  Circle,
  Code2,
  FlaskConical,
  Lock,
  type LucideIcon,
  Palette,
  Play,
  Shapes,
  Trophy,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { CourseCover, ProgressBar } from '@/components/community/courses/course-cover'
import { BackLink } from '@/components/community/page'
import { cn } from '@/lib/cn'
import type { StageBadge } from '@/lib/journey-stage'
import { stageColor, stageInk } from '@/lib/journey-stage'
import type { CatalogCourseView, MyCourseView } from '@/lib/types'
import { JourneyRibbon } from './stage'
import { JourneyStepper, StageMedal } from './stepper'
import { UNLOCK_TILES, UnlockTile } from './unlock'

/**
 * A Jornada do Criador na comunidade adulta, no Estúdio à noite: o palco para descobrir (a
 * etapa, a régua das etapas, as Maestrias) e a bancada clara para fazer (os cursos com o
 * estado e o próximo passo). O estado de cada curso chega pronto do `creatorEntryCard`
 * (projeção do servidor + catálogo + Meus cursos); nada aqui abre ou tranca curso.
 */

type Catalog = readonly CatalogCourseView[]
type Mine = readonly MyCourseView[]
export type StageCapabilities = Partial<Record<string, readonly AdultCreatorCapability[]>>

const powerWord = (n: number) => (n === 1 ? 'Poder' : 'Poderes')
/** O chip que carrega uma frase (o motivo do cadeado): quebra a linha em vez de passar da tela. */
const PHRASE_CHIP = 'h-auto whitespace-normal py-1 text-left'

/** A posição de uma etapa do currículo na régua de cores (7 etapas + Lenda). */
export function creatorBadge(view: CreatorJourneyView, level: string): StageBadge {
  const total = view.stages.length + 1
  const index = view.stages.findIndex((stage) => stage.level === level)
  return index < 0
    ? { position: total, total, title: null }
    : { position: index + 1, total, title: view.stages[index]!.title }
}

/* ─────────────── Os três requisitos ─────────────── */

type Row = { label: string; detail: string | null; done: boolean }

function checklistRows(stage: CreatorStageView, missionCard: CreatorEntryCardView): Row[] {
  const list = creatorStageChecklist(stage)
  return [
    {
      label: 'Cursos da trilha',
      detail:
        !list.courses.complete && list.courses.preparing
          ? 'Em preparação'
          : `${list.courses.done} de 2`,
      done: list.courses.complete,
    },
    {
      label: 'Missão',
      detail: list.mission.complete
        ? 'Concluída'
        : missionCard.lessons && missionCard.lessons.done > 0
          ? `${missionCard.lessons.done} de ${missionCard.lessons.total} aulas`
          : list.mission.preparing
            ? 'Em preparação'
            : list.mission.available
              ? 'Por fazer'
              : 'Depois dos cursos',
      done: list.mission.complete,
    },
    {
      label: powerWord(list.powers.required),
      detail: `${Math.min(list.powers.done, list.powers.required)} de ${list.powers.required}`,
      done: list.powers.complete,
    },
  ]
}

/** As três linhas com o ícone de feito e a barra da etapa, no cartão pequeno. */
function ChecklistCard({
  title,
  rows,
  percent,
  done,
  showBar = true,
}: {
  title: string
  rows: Row[]
  percent: number
  done: boolean
  showBar?: boolean
}) {
  return (
    <div className="sz-card-sm flex w-full flex-col gap-3 p-5 md:w-[21rem] md:flex-none">
      <strong>{title}</strong>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              {row.done ? (
                <Check aria-hidden className="size-5 text-(--pen-ok-texto)" strokeWidth={3} />
              ) : (
                <Circle aria-hidden className="size-5 text-muted-foreground" />
              )}
              <strong className="text-[0.95rem]">{row.label}</strong>
              {row.done ? <span className="sr-only">: feito</span> : null}
            </span>
            <span className="text-[0.85rem] text-muted-foreground">{row.detail}</span>
          </li>
        ))}
      </ul>
      {showBar ? (
        <ProgressBar value={percent} label="Quanto da etapa está feito" done={done} />
      ) : null}
    </div>
  )
}

/* ─────────────── Cursos ─────────────── */

const STATUS_CHIP: Record<CreatorEntryCardView['status'], { text: string; chip: string }> = {
  done: { text: 'Pronto', chip: 'sz-chip-ok' },
  progress: { text: 'Em andamento', chip: 'sz-chip-acao' },
  start: { text: 'Ainda não começou', chip: '' },
  locked: { text: 'Ainda fechado', chip: '' },
  'no-access': { text: 'Fora do seu acesso', chip: '' },
  planned: { text: 'Em preparação', chip: '' },
  unknown: { text: 'Indisponível agora', chip: '' },
}

function EntryAction({
  card,
  label,
  className,
}: {
  card: CreatorEntryCardView
  label?: string | null
  className?: string
}) {
  const text = label ?? creatorEntryAction(card.status)
  if (!card.continueHref || !text) return null
  return (
    <Link
      href={card.continueHref}
      prefetch={false}
      className={cn(card.status === 'done' ? 'sz-btn-outline' : 'sz-btn', className)}
    >
      {card.status === 'progress' ? <Play aria-hidden /> : null}
      {text}
      {card.status === 'start' ? <ArrowRight aria-hidden /> : null}
    </Link>
  )
}

/** A linha de um curso (curso da trilha, extra, núcleo): capa, nome, estado e o botão. */
export function CreatorCourseRow({
  card,
  note,
  eyebrow,
}: {
  card: CreatorEntryCardView
  note: string | null
  eyebrow?: string
}) {
  const status = STATUS_CHIP[card.status]
  return (
    <article
      className={cn(
        'sz-card-sm flex flex-col gap-4 p-4 sm:flex-row sm:items-center md:p-5',
        // O curso em andamento ganha a moldura amarela: é o "você está aqui" da etapa.
        card.status === 'progress' && 'shadow-[0_0_0_3px_var(--cta),0_4px_0_var(--cta-degrau)]',
      )}
    >
      <div className="aspect-[32/17] w-full flex-none overflow-hidden rounded-[0.8rem] bg-(--topo) sm:w-[11rem]">
        <CourseCover
          src={card.coverImageUrl}
          className={cn(!card.href && card.coverImageUrl && 'opacity-60 grayscale')}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {eyebrow ? <span className="sz-kicker">{eyebrow}</span> : null}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="sz-h4">{card.title}</h3>
          {card.track ? <span className="sz-chip">{card.track === '3d' ? '3D' : '2D'}</span> : null}
        </div>
        {card.subtitle ? (
          <span className="line-clamp-2 text-[0.9rem] text-muted-foreground">{card.subtitle}</span>
        ) : null}
        <span className={cn('sz-chip self-start', PHRASE_CHIP, status.chip)}>
          {card.status === 'done' ? <Check aria-hidden /> : null}
          {card.status === 'locked' || card.status === 'no-access' ? <Lock aria-hidden /> : null}
          {card.status === 'progress' && card.lessons
            ? `Em andamento · ${card.lessons.done} de ${card.lessons.total} aulas`
            : card.href
              ? status.text
              : (note ?? status.text)}
        </span>
      </div>
      <div className="flex-none">
        <EntryAction card={card} />
      </div>
    </article>
  )
}

/** A missão: o cartão maior, com as duas dimensões, o progresso e "Continuar a missão". */
export function CreatorMissionCard({
  card,
  note,
}: {
  card: CreatorEntryCardView
  note: string | null
}) {
  return (
    <article
      className={cn(
        'sz-card flex flex-col gap-5 p-6 md:flex-row md:items-center',
        card.status === 'progress' && 'shadow-[0_0_0_3px_var(--cta),0_4px_0_var(--cta-degrau)]',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="sz-kicker">Missão da trilha</span>
        <h3 className="sz-h3">{card.title}</h3>
        <p className="m-0 text-muted-foreground">
          {card.subtitle ??
            'Um jogo novo, sem passo a passo: você monta a partida com o que aprendeu nos cursos da trilha, primeiro em 2D e depois em 3D.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="sz-chip">2D</span>
          <span className="sz-chip">3D</span>
          <span className="sz-chip">Sem nota</span>
          <span className={cn('sz-chip', PHRASE_CHIP)}>Verifique quantas vezes quiser</span>
          {card.status === 'done' ? (
            <span className="sz-chip sz-chip-ok">
              <Check aria-hidden /> Concluída
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex w-full flex-col gap-3 md:w-[17rem] md:flex-none">
        {card.lessons ? (
          <>
            <div className="flex justify-between text-[0.9rem]">
              <span className="text-muted-foreground">
                {card.lessons.done} de {card.lessons.total} aulas
              </span>
              <strong>{card.lessons.percent}%</strong>
            </div>
            <ProgressBar
              value={card.lessons.percent}
              label="Progresso da missão"
              done={card.status === 'done'}
            />
          </>
        ) : null}
        {card.continueHref ? (
          <EntryAction
            card={card}
            label={card.status === 'progress' ? 'Continuar a missão' : null}
            className="self-start"
          />
        ) : (
          <span className={cn('sz-chip self-start', PHRASE_CHIP)}>
            <Lock aria-hidden />
            {note}
          </span>
        )}
      </div>
    </article>
  )
}

/**
 * Um Poder na grade: a dimensão e as aulas no alto, o nome, a frase e o botão. Com versões 2D e
 * 3D, cada versão ganha a sua ação ("2D: Abrir de novo", "3D: Começar"): elas contam uma vez
 * para a etapa, mas a pessoa pode querer fazer as duas.
 */
function CreatorPowerCard({
  title,
  card,
  versions,
  tracks,
  done,
  note,
}: {
  title: string
  card: CreatorEntryCardView
  versions: readonly CreatorEntryCardView[]
  tracks: string
  done: boolean
  note: (version: CreatorEntryCardView) => string | null
}) {
  const many = versions.length > 1
  return (
    <article className="sz-card-sm flex h-full flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.85rem] text-muted-foreground">
          {[
            tracks,
            !many && card.lessons
              ? `${card.lessons.total} ${card.lessons.total === 1 ? 'aula' : 'aulas'}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {done ? (
          <span className="sz-chip sz-chip-ok">
            <Check aria-hidden /> Feito
          </span>
        ) : null}
      </div>
      <h3 className="sz-h4">{title}</h3>
      {card.subtitle ? (
        <p className="m-0 line-clamp-3 text-[0.95rem] text-muted-foreground">{card.subtitle}</p>
      ) : null}
      <div className="mt-auto flex flex-col items-start gap-2">
        {many ? (
          versions.map((version) => (
            <PowerVersionAction key={version.courseId} version={version} note={note(version)} />
          ))
        ) : card.continueHref ? (
          <EntryAction
            card={card}
            label={card.status === 'done' ? 'Abrir de novo' : null}
            className="self-start"
          />
        ) : (
          <span className={cn('sz-chip', PHRASE_CHIP)}>
            <Lock aria-hidden />
            {note(card)}
          </span>
        )}
      </div>
    </article>
  )
}

function PowerVersionAction({
  version,
  note,
}: {
  version: CreatorEntryCardView
  note: string | null
}) {
  const track = version.track === '3d' ? '3D' : version.track === '2d' ? '2D' : version.title
  const action = version.status === 'done' ? 'Abrir de novo' : creatorEntryAction(version.status)
  if (version.continueHref && action)
    return (
      <Link
        href={version.continueHref}
        prefetch={false}
        className={cn(version.status === 'done' ? 'sz-btn-outline' : 'sz-btn', 'sz-btn-sm')}
      >
        {track}: {action}
      </Link>
    )
  return (
    <span className={cn('sz-chip', PHRASE_CHIP)}>
      <Lock aria-hidden />
      {track}: {note ?? 'Ainda fechado'}
    </span>
  )
}

function SectionHead({
  id,
  title,
  lead,
  aside,
}: {
  id: string
  title: string
  lead: string
  aside?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 max-w-3xl flex-1 basis-[24rem] flex-col gap-1">
        <h2 id={id} className="sz-h2">
          {title}
        </h2>
        <p className="m-0 text-muted-foreground">{lead}</p>
      </div>
      {aside}
    </div>
  )
}

/* ─────────────── A etapa ─────────────── */

/**
 * `/cursos/etapa/<posto>` no currículo: o cabeçalho na cor da etapa (número, "Etapa N de 8",
 * o que a trilha libera e o cartão "Para concluir a etapa"), a fita da jornada, os cursos da
 * trilha, a missão, os Poderes e os extras.
 */
export function AdultCreatorTrail({
  view,
  level,
  catalog,
  mine,
  capabilities = {},
}: {
  view: CreatorJourneyView
  level: string
  catalog: Catalog
  mine: Mine
  capabilities?: StageCapabilities
}) {
  const index = view.stages.findIndex((item) => item.level === level)
  const stage = view.stages[index]!
  const badge = creatorBadge(view, level)
  const current = creatorBadge(view, view.level)
  const next = view.stages[index + 1]
  const list = creatorStageChecklist(stage)
  const card = (entry: Parameters<typeof creatorEntryCard>[0]) =>
    creatorEntryCard(entry, catalog, mine)
  const future = !stage.available && !stage.earned && !stage.completed
  // Etapa guardada de um progresso anterior (o piso da jornada), sem os passos feitos aqui: diz
  // isso em vez de "concluída" ao lado de uma lista em zero.
  const keptOnly = stage.earned && !list.complete
  const note = (item: CreatorEntryCardView, role?: 'base3d' | 'after-pair') =>
    creatorEntryNote(item.status, future ? { futureStage: stage.title } : { role })
  const base2d = card(stage.base2d)
  const base3d = card(stage.base3d)
  const mission = card(stage.mission)
  const currentStage = creatorCurrentStage(view)
  // Só as ferramentas que a comunidade adulta sabe apresentar (a política filtra; aqui é a rede).
  const tools = (capabilities[stage.level] ?? []).filter((capability) =>
    Object.hasOwn(UNLOCK_TILES, capability),
  )
  const color = { '--etapa-cor': stageColor(badge) } as CSSProperties

  return (
    <>
      <section
        className="sz-band"
        style={{ ...color, borderTop: `6px solid ${stageColor(badge)}` }}
      >
        <div className="sz-page flex flex-col gap-4 pt-7 pb-9 md:pb-11">
          <BackLink href="/cursos" label="Voltar à jornada" />
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
                  Etapa {badge.position} de {badge.total}
                  {stage.genre ? ` · ${stage.genre}` : ''}
                </span>
                <h1 className="sz-h1 break-words">{stage.title}</h1>
                <p className="sz-lead m-0">
                  {future
                    ? `Esta etapa abre quando você concluir a anterior. Já dá para ver o que vem por aqui.`
                    : keptOnly
                      ? creatorStageSummary(stage)
                      : stage.completed
                        ? 'Etapa concluída. Os cursos continuam abertos para você rever e ampliar seus jogos.'
                        : `Faça os cursos da trilha, a missão e ${stage.minimumPowers} ${powerWord(stage.minimumPowers)} para concluir a etapa.`}
                </p>
              </div>
            </div>
            <ChecklistCard
              title={
                keptOnly
                  ? 'O que você fez aqui'
                  : stage.completed
                    ? 'Etapa concluída'
                    : 'Para concluir a etapa'
              }
              rows={checklistRows(stage, mission)}
              percent={list.percent}
              done={list.complete}
              showBar={!keptOnly}
            />
          </div>
          {view.paused ? (
            <p role="status" className="sz-card-sm m-0 p-4 font-bold">
              A progressão está pausada por enquanto. Seus cursos e conquistas continuam guardados.
            </p>
          ) : null}
          <section aria-labelledby="etapa-libera" className="mt-2 flex flex-col gap-3">
            <h2 id="etapa-libera" className="sz-kicker">
              Nesta etapa você ganha
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((capability) => {
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
              {next ? (
                <UnlockTile
                  icon={ArrowRight}
                  tone="text-(--sz-community-action-light)"
                  name={`A etapa ${badge.position + 1}`}
                  text={next.title}
                />
              ) : (
                <UnlockTile
                  icon={Trophy}
                  tone="text-(--dourado)"
                  name="O título de Lenda"
                  text="Todas as Maestrias abertas para você escolher."
                />
              )}
            </ul>
          </section>
        </div>
      </section>

      <div className="sz-page flex flex-col gap-10 pt-10 pb-16">
        <section aria-labelledby="etapa-onde" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="etapa-onde" className="sz-h4">
              Onde você está na jornada
            </h2>
            <Link
              href="/progresso"
              prefetch={false}
              className="sz-link inline-flex min-h-11 items-center"
            >
              Ver a jornada inteira
            </Link>
          </div>
          <JourneyRibbon
            badge={current}
            currentShare={
              currentStage ? creatorStageChecklist(currentStage).percent / 100 : undefined
            }
          />
          {future && currentStage ? (
            <p className="m-0 text-muted-foreground">
              Você está na etapa {current.position}, {currentStage.title}.{' '}
              <Link href={`/cursos/etapa/${currentStage.level}`} className="sz-link">
                Ir para a minha etapa
              </Link>
            </p>
          ) : null}
        </section>

        <section aria-labelledby="cursos" className="flex flex-col gap-5">
          <SectionHead
            id="cursos"
            title="Cursos da trilha"
            lead="Comece por aqui: primeiro o 2D, depois o 3D. Eles ensinam tudo o que a missão vai pedir."
          />
          <CreatorCourseRow card={base2d} note={note(base2d)} />
          <CreatorCourseRow card={base3d} note={note(base3d, 'base3d')} />
        </section>

        <section aria-labelledby="missao" className="flex flex-col gap-5">
          <SectionHead
            id="missao"
            title="Missão"
            lead="Um jogo novo, sem passo a passo, para mostrar o que você aprendeu. Abre depois dos cursos da trilha."
          />
          <CreatorMissionCard card={mission} note={note(mission, 'after-pair')} />
        </section>

        <PowersSection stage={stage} catalog={catalog} mine={mine} future={future} />

        {stage.extras.length ? (
          <section aria-labelledby="extras" className="flex flex-col gap-5">
            <SectionHead
              id="extras"
              title="Extras"
              lead="Para ir além. Não contam para concluir a etapa."
            />
            {stage.extras.map((extra) => {
              const item = card(extra)
              return (
                <CreatorCourseRow
                  key={extra.courseId}
                  card={item}
                  note={note(item, 'after-pair')}
                />
              )
            })}
          </section>
        ) : null}

        <p className="m-0 text-[0.9rem] text-muted-foreground">
          Cada curso concluído acrescenta os blocos dele ao Estúdio. Publicar no Mural é opcional.
        </p>
      </div>
    </>
  )
}

const POWERS_VISIBLE = 6

function PowersSection({
  stage,
  catalog,
  mine,
  future,
}: {
  stage: CreatorStageView
  catalog: Catalog
  mine: Mine
  future: boolean
}) {
  const cards = stage.powers.map((power) => {
    const options = power.courses.map((entry) => creatorEntryCard(entry, catalog, mine))
    const primary =
      options.find((item) => item.status === 'progress') ??
      options.find((item) => item.status === 'done') ??
      options.find((item) => item.href) ??
      options[0]
    const tracks = [...new Set(options.flatMap((item) => (item.track ? [item.track] : [])))]
      .sort()
      .map((track) => (track === '3d' ? '3D' : '2D'))
      .join(' e ')
    return { power, primary, options, tracks }
  })
  const render = ({ power, primary, options, tracks }: (typeof cards)[number]) =>
    primary ? (
      <li key={power.mechanicId}>
        <CreatorPowerCard
          title={power.title}
          card={primary}
          versions={options}
          tracks={tracks}
          done={power.completed}
          note={(version) =>
            creatorEntryNote(
              version.status,
              future ? { futureStage: stage.title } : { role: 'after-pair' },
            )
          }
        />
      </li>
    ) : null
  const required = stage.minimumPowers
  return (
    <section aria-labelledby="poderes" className="flex flex-col gap-5">
      <SectionHead
        id="poderes"
        title="Poderes"
        lead={`Mecânicas novas para os seus jogos. Escolha os que quiser: ${required} ${required === 1 ? 'conta' : 'contam'} para concluir a etapa. As versões 2D e 3D do mesmo Poder contam uma vez.`}
        aside={
          future ? undefined : (
            <span className="sz-chip sz-chip-acao">
              {Math.min(stage.powersCompleted, required)} de {required} {powerWord(required)}
            </span>
          )
        }
      />
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
        {cards.slice(0, POWERS_VISIBLE).map(render)}
      </ul>
      {cards.length > POWERS_VISIBLE ? (
        <details className="group/poderes flex flex-col">
          <summary className="sz-btn-outline mx-auto w-fit cursor-pointer list-none group-open/poderes:hidden">
            Ver todos os {cards.length} Poderes
          </summary>
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
            {cards.slice(POWERS_VISIBLE).map(render)}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

/* ─────────────── O próximo passo e a régua ─────────────── */

/**
 * O próximo passo da jornada (Início, Criar e Cursos): a etapa na cor dela, o curso a fazer
 * agora com o botão amarelo e o caminho para a página da etapa. Serve no palco e na bancada.
 */
export function AdultCreatorNextStep({
  view,
  catalog,
  mine,
}: {
  view: CreatorJourneyView
  catalog: Catalog
  mine: Mine
}) {
  const stage = creatorCurrentStage(view)
  const badge = creatorBadge(view, view.level)
  if (!stage)
    return (
      <section
        aria-label="Seu próximo passo na jornada"
        className="sz-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-6 md:p-6"
      >
        <StageMedal badge={badge} big crown />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="sz-kicker">Jornada do Criador · Lenda</span>
          <h2 className="sz-h3">Você chegou à Lenda</h2>
          <p className="m-0 text-muted-foreground">{creatorJourneyHint(view)}</p>
        </div>
        <Link href="/maestrias" prefetch={false} className="sz-btn">
          Ver as Maestrias <ArrowRight aria-hidden />
        </Link>
      </section>
    )
  const nextStep = creatorNextStep(view, catalog, mine)
  const mission = creatorEntryCard(stage.mission, catalog, mine)
  const rows = checklistRows(stage, mission)
  const missing = creatorStageMissing(stage)
  return (
    <section
      aria-label="Seu próximo passo na jornada"
      className="sz-card flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-6 md:p-6"
      style={{ boxShadow: `inset 4px 0 0 ${stageColor(badge)}` }}
    >
      <StageMedal badge={badge} big />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="sz-kicker">
          Jornada do Criador · Etapa {badge.position} de {badge.total} · {stage.title}
        </span>
        <h2 className="sz-h3">
          {nextStep
            ? nextStep.role === 'mission'
              ? `Missão: ${nextStep.card.title}`
              : nextStep.role === 'power'
                ? `Poder: ${nextStep.powerTitle ?? nextStep.card.title}`
                : nextStep.card.title
            : 'Seu próximo passo'}
        </h2>
        <p className="m-0 text-muted-foreground">
          {view.paused
            ? creatorJourneyHint(view)
            : missing
              ? `Para concluir a etapa: ${missing.charAt(0).toLowerCase()}${missing.slice(1)}.`
              : creatorJourneyHint(view)}
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {rows.map((row) => (
            <li key={row.label}>
              <span className={cn('sz-chip', row.done && 'sz-chip-ok')}>
                {row.done ? <Check aria-hidden /> : null}
                {row.label}
                {row.done ? <span className="sr-only">: feito</span> : ` · ${row.detail}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-3 md:flex-none md:flex-col">
        {nextStep ? (
          <Link href={nextStep.card.continueHref ?? '#'} prefetch={false} className="sz-btn">
            {nextStep.card.status === 'progress' ? (
              <>
                <Play aria-hidden /> Continuar
              </>
            ) : (
              <>
                Começar <ArrowRight aria-hidden />
              </>
            )}
          </Link>
        ) : null}
        <Link
          href={`/cursos/etapa/${encodeURIComponent(stage.level)}`}
          prefetch={false}
          className={nextStep ? 'sz-btn-outline' : 'sz-btn'}
        >
          Ver a etapa
        </Link>
      </div>
    </section>
  )
}

/** A régua das etapas do currículo, com a Lenda levando às Maestrias. */
export function AdultCreatorStepper({ view }: { view: CreatorJourneyView }) {
  return (
    <JourneyStepper
      total={view.stages.length + 1}
      legendReached={view.level === 'god'}
      legendHref="/maestrias"
      items={view.stages.map((stage) => ({
        key: stage.level,
        href: `/cursos/etapa/${encodeURIComponent(stage.level)}`,
        title: stage.title,
        state: stage.level === view.level ? 'aqui' : stage.completed ? 'feita' : 'fechada',
      }))}
    />
  )
}

/* ─────────────── Maestrias ─────────────── */

const AREA_LOOK: Record<string, { color: string; Icon: LucideIcon }> = {
  python2d: { color: 'var(--etapa-3)', Icon: Code2 },
  python3d: { color: 'var(--etapa-4)', Icon: Box },
  javascript2d: { color: 'var(--etapa-2)', Icon: Braces },
  javascript3d: { color: 'var(--etapa-7)', Icon: Shapes },
  arte2d: { color: 'var(--etapa-6)', Icon: Palette },
  modelagem3d: { color: 'var(--etapa-5)', Icon: Box },
}

export function MasteryTile({ id, big = false }: { id: string; big?: boolean }) {
  const look = AREA_LOOK[id] ?? { color: 'var(--primary)', Icon: Trophy }
  const Icon = look.Icon
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex flex-none items-center justify-center rounded-xl text-white',
        big ? 'size-16' : 'size-12',
      )}
      style={{ background: look.color }}
    >
      <Icon className={big ? 'size-8' : 'size-6'} />
    </span>
  )
}

const levelDone = (level: CreatorMasteryLevelView) => level.completed || level.earned

/** As seis áreas: um cartão por área, os três níveis numerados e o botão do que fazer. */
export function AdultMasteryHub({
  areas,
  view,
}: {
  areas: readonly CreatorMasteryView[]
  view?: CreatorJourneyView
}) {
  return (
    <ul className="m-0 grid list-none gap-5 p-0 md:grid-cols-2 xl:grid-cols-3">
      {areas.map((area) => {
        const progress = creatorMasteryProgress(area)
        return (
          <li key={area.id}>
            <Link
              href={`/maestrias/${encodeURIComponent(area.id)}`}
              prefetch={false}
              className="sz-card flex h-full flex-col gap-4 p-5 text-foreground no-underline focus-visible:outline-3 focus-visible:outline-(--ring) focus-visible:outline-offset-2"
            >
              <div className="flex items-center gap-3">
                <MasteryTile id={area.id} />
                <h2 className="sz-h4">{area.title}</h2>
              </div>
              <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {area.levels.map((level) => {
                  const done = levelDone(level)
                  const now = progress.current?.level === level.level
                  return (
                    <li key={level.level} className="flex items-center gap-3">
                      <span
                        className={cn('sz-num', done ? 'sz-num-ok' : now ? 'sz-num-acao' : '')}
                        aria-hidden="true"
                      >
                        {done ? <Check className="size-4" /> : ROMAN_LEVEL[level.level]}
                      </span>
                      <span className={cn('text-[0.95rem]', now && 'font-bold')}>
                        {creatorMasteryLevelTitle(level)}
                        <span className="sr-only">
                          {done ? ', conquistado' : now ? ', seu nível agora' : ''}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ol>
              <div className="mt-auto">
                {progress.action ? (
                  <span className={progress.status === 'complete' ? 'sz-btn-outline' : 'sz-btn'}>
                    {progress.status === 'complete' ? <Trophy aria-hidden /> : null}
                    {progress.action}
                  </span>
                ) : (
                  <span className={cn('sz-chip', PHRASE_CHIP)}>
                    <Lock aria-hidden />
                    {creatorMasteryEntryNote(area, view)}
                  </span>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Os três passos de cada nível (núcleo, duas oficinas, projeto) em cartões. */
export function AdultMasteryHowItWorks({ area }: { area: CreatorMasteryView }) {
  const tiles: { Icon: LucideIcon; title: string; text: string }[] = [
    {
      Icon: FlaskConical,
      title: 'O núcleo',
      text: 'Os cursos que ensinam a base do nível. Um crédito validado pela equipe também vale.',
    },
    {
      Icon: Wrench,
      title: 'Duas oficinas',
      text: 'Duas entre três aplicações diferentes no seu jogo.',
    },
    {
      Icon: Trophy,
      title: 'Um projeto aprovado',
      text: 'A equipe confere o projeto em todos os critérios essenciais e devolve comentários.',
    },
  ]
  return (
    <section aria-labelledby="como-nivel" className="flex flex-col gap-4">
      <h2 id="como-nivel" className="sz-h3">
        Como conquistar cada nível
      </h2>
      <p className="m-0 max-w-3xl text-muted-foreground">{creatorMasteryApproach(area)}</p>
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
        {tiles.map(({ Icon, title, text }) => (
          <li key={title} className="sz-card-sm flex items-start gap-3.5 p-4">
            <span
              aria-hidden="true"
              className="inline-flex size-11 flex-none items-center justify-center rounded-xl bg-(--carta-2) text-(--cta)"
            >
              <Icon className="size-6" />
            </span>
            <span className="flex min-w-0 flex-col">
              <strong>{title}</strong>
              <span className="text-[0.85rem] text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[0.9rem] text-muted-foreground">{CREATOR_MASTERY_ORDER}</p>
    </section>
  )
}

/** Os níveis de uma área, cada um num cartão que abre (o atual já vem aberto). */
export function AdultMasteryArea({
  area,
  catalog,
  mine,
  view,
  submission,
}: {
  area: CreatorMasteryView
  catalog: Catalog
  mine: Mine
  view?: CreatorJourneyView
  submission?: (level: CreatorMasteryLevelView) => ReactNode
}) {
  const current = creatorMasteryProgress(area).current
  return (
    <div className="flex flex-col gap-5">
      {area.levels.map((level) => {
        const done = levelDone(level)
        const now = current?.level === level.level
        return (
          <details key={level.level} open={now} className="sz-card group/nivel p-5 md:p-7">
            <summary className="flex cursor-pointer list-none items-start gap-4 rounded-[0.8rem] focus-visible:outline-3 focus-visible:outline-(--ring) focus-visible:outline-offset-4">
              <span
                aria-hidden="true"
                className={cn('sz-num', done ? 'sz-num-ok' : now ? 'sz-num-acao' : '')}
              >
                {done ? <Check className="size-4" /> : ROMAN_LEVEL[level.level]}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="sz-kicker">Nível {ROMAN_LEVEL[level.level]}</span>
                  <span
                    className={cn(
                      'sz-chip',
                      PHRASE_CHIP,
                      done ? 'sz-chip-ok' : now ? 'sz-chip-novo' : '',
                    )}
                  >
                    {creatorMasteryLevelStatus(level, area, view)}
                  </span>
                </span>
                <h2 className="sz-h3">{creatorMasteryLevelTitle(level)}</h2>
                <span className="flex flex-wrap gap-2">
                  <span className={cn('sz-chip', level.nucleusCompleted && 'sz-chip-ok')}>
                    {level.nucleusCompleted ? <Check aria-hidden /> : null}
                    Núcleo
                  </span>
                  <span className={cn('sz-chip', level.workshopsCompleted >= 2 && 'sz-chip-ok')}>
                    {level.workshopsCompleted >= 2 ? <Check aria-hidden /> : null}
                    Oficinas {Math.min(level.workshopsCompleted, 2)} de 2
                  </span>
                  <span
                    className={cn(
                      'sz-chip',
                      PHRASE_CHIP,
                      level.approval === 'approved' && 'sz-chip-ok',
                    )}
                  >
                    {level.approval === 'approved' ? <Check aria-hidden /> : null}
                    {creatorMasteryApprovalLabel(level)}
                  </span>
                </span>
              </span>
              <ChevronDown
                aria-hidden
                className="mt-2 size-6 flex-none text-muted-foreground transition-transform group-open/nivel:rotate-180"
              />
            </summary>
            <div className="mt-6 flex flex-col gap-7 border-(--border) border-t pt-6">
              {level.nucleusCourses.length ? (
                <section className="flex flex-col gap-3">
                  <h3 className="sz-h4">O núcleo</h3>
                  {level.nucleusCourses.map((entry) => {
                    const card = creatorEntryCard(entry, catalog, mine)
                    return (
                      <CreatorCourseRow
                        key={entry.courseId}
                        card={card}
                        note={creatorEntryNote(card.status)}
                      />
                    )
                  })}
                </section>
              ) : null}
              <section className="flex flex-col gap-3">
                <h3 className="sz-h4">Escolha duas oficinas</h3>
                <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-3">
                  {level.workshops.map((workshop) => (
                    <li key={workshop.id} className="sz-card-sm flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <strong>{workshop.title}</strong>
                        {workshop.completed ? (
                          <span className="sz-chip sz-chip-ok">
                            <Check aria-hidden /> Feita
                          </span>
                        ) : null}
                      </div>
                      {workshop.courses.map((entry) => {
                        const card = creatorEntryCard(entry, catalog, mine)
                        return card.continueHref ? (
                          <Link
                            key={entry.courseId}
                            href={card.continueHref}
                            prefetch={false}
                            className="sz-link inline-flex min-h-11 items-center gap-1.5"
                          >
                            {card.title === workshop.title
                              ? card.status === 'done'
                                ? 'Rever a oficina'
                                : card.status === 'progress'
                                  ? 'Continuar a oficina'
                                  : 'Abrir a oficina'
                              : card.title}
                            <ArrowRight aria-hidden className="size-4" />
                          </Link>
                        ) : (
                          <span
                            key={entry.courseId}
                            className="flex items-center gap-1.5 text-[0.9rem] text-muted-foreground"
                          >
                            <Lock aria-hidden className="size-4" />
                            {creatorEntryNote(card.status)}
                          </span>
                        )
                      })}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="sz-soft flex flex-col gap-4 rounded-[1rem] p-5">
                <h3 className="sz-h4">Seu projeto: critérios essenciais</h3>
                {level.project ? (
                  <ProjectGuide card={creatorEntryCard(level.project, catalog, mine)} />
                ) : null}
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {level.rubric.criteria.map((criterion) => {
                    const ok = level.approvedCriteriaIds.includes(criterion.id)
                    return (
                      <li key={criterion.id} className="flex items-start gap-2.5">
                        {ok ? (
                          <Check
                            aria-label="Aprovado"
                            className="mt-0.5 size-5 flex-none text-(--pen-ok-texto)"
                            strokeWidth={3}
                          />
                        ) : (
                          <Circle
                            aria-hidden
                            className="mt-0.5 size-5 flex-none text-muted-foreground"
                          />
                        )}
                        <span>{criterion.title.replace(/^O aluno\b|^A aluna\b/, 'Você')}</span>
                      </li>
                    )
                  })}
                </ul>
                <p className="m-0 text-[0.9rem] text-muted-foreground">
                  A equipe avalia uma versão salva do projeto e devolve comentários. Se precisar
                  ajustar, você envia uma nova versão; o trabalho anterior fica registrado.
                </p>
                {submission?.(level)}
              </section>
            </div>
          </details>
        )
      })}
    </div>
  )
}

function ProjectGuide({ card }: { card: CreatorEntryCardView }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-2 text-[0.95rem]">
      <span className="font-bold">Guia de projeto (opcional):</span>
      {card.continueHref ? (
        <Link href={card.continueHref} prefetch={false} className="sz-link">
          {card.title}
        </Link>
      ) : (
        <span className="text-muted-foreground">{card.title}</span>
      )}
    </p>
  )
}
