import type { CreatorJourneyView } from '@sistemazero/core/journey'
import {
  CREATOR_MASTERY_ORDER,
  type CreatorEntryCardView,
  type CreatorMasteryLevelView,
  type CreatorMasteryView,
  creatorEntryCard,
  creatorEntryNote,
  creatorMasteryApproach,
  creatorMasteryApprovalLabel,
  creatorMasteryEntryNote,
  creatorMasteryLevelStatus,
  creatorMasteryLevelTitle,
  creatorMasteryProgress,
  ROMAN_LEVEL,
} from '@sistemazero/member-shell/lib/creator-journey-presentation'
import {
  ArrowRight,
  Box,
  Braces,
  Check,
  ChevronDown,
  Code,
  FlaskConical,
  Lock,
  type LucideIcon,
  Palette,
  Shapes,
  Sparkles,
  Trophy,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { CatalogCourseView, MyCourseView } from '@/lib/types'
import { KidsSectionHeader } from '../kids-section-header'
import { DoneTag, KidsTag, WideCourseCard } from './parts'

/** A cor e o ícone de cada área: reconhecer antes de ler, como as oficinas do Criar. */
const AREA_LOOK: Record<string, { color: string; Icon: LucideIcon }> = {
  python2d: { color: 'var(--sz-kids-laranja-texto)', Icon: Code },
  python3d: { color: 'var(--level-explorer)', Icon: Box },
  javascript2d: { color: 'var(--level-coder)', Icon: Braces },
  javascript3d: { color: 'var(--level-champion)', Icon: Shapes },
  arte2d: { color: 'var(--sz-kids-rosa-funda)', Icon: Palette },
  modelagem3d: { color: 'var(--kids-verde)', Icon: Box },
}
const lookOf = (id: string) => AREA_LOOK[id] ?? { color: 'var(--primary)', Icon: Sparkles }

export function MasteryIcon({ id, size = 'md' }: { id: string; size?: 'md' | 'lg' }) {
  const { color, Icon } = lookOf(id)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center text-white',
        size === 'lg' ? 'size-16 rounded-[1.25rem]' : 'size-11 rounded-xl',
      )}
      style={{ backgroundColor: color }}
    >
      <Icon className={size === 'lg' ? 'size-8' : 'size-5'} />
    </span>
  )
}

const levelDone = (level: CreatorMasteryLevelView) => level.completed || level.earned

/** Os níveis I, II e III como linhas: menta conquistado, amarelo o atual, claro os outros. */
function LevelRows({ area }: { area: CreatorMasteryView }) {
  const current = creatorMasteryProgress(area).current
  return (
    <ol className="space-y-2">
      {area.levels.map((level) => {
        const done = levelDone(level)
        const now = current?.level === level.level
        return (
          <li
            key={level.level}
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm',
              done ? 'bg-(--band-menta)' : now ? 'bg-(--band-amarelo)' : 'bg-background',
            )}
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full font-extrabold text-xs',
                done
                  ? 'bg-(--success-foreground) text-white'
                  : 'bg-card text-muted-foreground ring-2 ring-(--borda-carta)',
              )}
            >
              {done ? (
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              ) : (
                ROMAN_LEVEL[level.level]
              )}
            </span>
            <span className="font-bold">{creatorMasteryLevelTitle(level)}</span>
            <span className="sr-only">
              {done ? ', conquistado' : now ? ', o seu nível agora' : ''}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * As Maestrias (`/maestrias`): um cartão por área, com os três níveis em linhas e o botão do
 * que fazer. A área fechada diz depois de qual trilha ela abre.
 */
export function KidsMasteryHub({
  areas,
  view,
}: {
  areas: readonly CreatorMasteryView[]
  view?: CreatorJourneyView
}) {
  const trophies = areas.reduce((sum, area) => sum + creatorMasteryProgress(area).earned, 0)
  return (
    <section aria-labelledby="maestrias">
      <KidsSectionHeader
        id="maestrias"
        title="Escolha no que quer ficar craque"
        subtitle="Faça na ordem que quiser e quantas quiser."
        actions={
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 font-extrabold text-sm">
            <Trophy className="size-4 text-(--kids-ouro-fg)" aria-hidden />
            {trophies} {trophies === 1 ? 'troféu' : 'troféus'}
          </span>
        }
      />
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => {
          const progress = creatorMasteryProgress(area)
          const body = (
            <article className="kids-carta flex h-full flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <MasteryIcon id={area.id} />
                <h3 className="sz-display text-xl">{area.title}</h3>
              </div>
              <LevelRows area={area} />
              <div className="mt-auto pt-1">
                {progress.action ? (
                  <span
                    className={cn(
                      'sz-btn-gradient w-full gap-2',
                      progress.status === 'complete' && 'sz-btn-suave',
                    )}
                  >
                    {progress.status === 'complete' ? (
                      <Trophy className="size-4" aria-hidden />
                    ) : null}
                    {progress.action}
                  </span>
                ) : (
                  <span className="flex w-full items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-2.5 text-center font-bold text-muted-foreground text-xs">
                    <Lock className="size-3.5 shrink-0" aria-hidden />
                    {creatorMasteryEntryNote(area, view)}
                  </span>
                )}
              </div>
            </article>
          )
          return (
            <li key={area.id}>
              <Link
                href={`/maestrias/${encodeURIComponent(area.id)}`}
                prefetch={false}
                className={cn('group block h-full', progress.status !== 'locked' && 'kid-pop')}
              >
                {body}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Os três passos de cada nível, no desenho do "Como funciona a missão". */
export function MasteryHowItWorks({ area }: { area: CreatorMasteryView }) {
  const tiles: { Icon: LucideIcon; title: string; text: string }[] = [
    {
      Icon: FlaskConical,
      title: 'O núcleo',
      text: 'Os cursos que ensinam a base do nível. Um crédito validado pela equipe também vale.',
    },
    {
      Icon: Wrench,
      title: 'Duas oficinas',
      text: 'Escolha duas entre três aplicações diferentes no seu jogo.',
    },
    {
      Icon: Trophy,
      title: 'Um projeto aprovado',
      text: 'A equipe confere o seu projeto em todos os critérios essenciais e manda um retorno.',
    },
  ]
  return (
    <section className="kids-carta p-6 md:p-7">
      <h2 className="sz-display text-xl md:text-[1.625rem]">Como conquistar cada nível</h2>
      <p className="mt-3 max-w-3xl font-medium text-[0.9375rem] text-muted-foreground">
        {creatorMasteryApproach(area)}
      </p>
      <ul className="mt-5 grid gap-3 md:grid-cols-3">
        {tiles.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 rounded-2xl bg-background p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--band-amarelo) text-(--sz-kids-tinta)">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-extrabold text-[0.9375rem]">{title}</span>
              <span className="mt-0.5 block font-medium text-muted-foreground text-sm">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 font-medium text-muted-foreground text-sm">{CREATOR_MASTERY_ORDER}</p>
    </section>
  )
}

/** Um curso pequeno dentro da oficina: o link com o título, ou o motivo de ainda não abrir. */
function MiniCourse({ card, label }: { card: CreatorEntryCardView; label?: string }) {
  if (!card.continueHref)
    return (
      <p className="flex items-start gap-2 rounded-xl bg-card px-3 py-2.5 font-semibold text-muted-foreground text-sm">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="block text-foreground">{card.title}</span>
          {creatorEntryNote(card.status)}
        </span>
      </p>
    )
  return (
    <Link
      href={card.continueHref}
      prefetch={false}
      className="kids-3d kids-3d--carta flex min-h-11 items-center gap-2 rounded-xl bg-card px-3 py-2.5 font-bold text-sm"
    >
      <span className="min-w-0 flex-1">{label ?? card.title}</span>
      {card.status === 'done' ? (
        <Check
          className="size-4 shrink-0 text-(--success-foreground)"
          strokeWidth={3}
          aria-label="Feito"
        />
      ) : (
        <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
      )}
    </Link>
  )
}

/**
 * Uma área de Maestria (`/maestrias/<id>`): cada nível num cartão que abre (o atual já vem
 * aberto), com o que falta em pílulas, o núcleo, as oficinas, os critérios do projeto e a
 * entrega.
 */
export function KidsMasteryArea({
  area,
  catalog,
  mine,
  view,
  submission,
}: {
  area: CreatorMasteryView
  catalog: readonly CatalogCourseView[]
  mine: readonly MyCourseView[]
  view?: CreatorJourneyView
  submission?: (level: CreatorMasteryLevelView) => ReactNode
}) {
  const current = creatorMasteryProgress(area).current
  return (
    <div className="flex flex-col gap-5">
      {area.levels.map((level) => {
        const done = levelDone(level)
        const now = current?.level === level.level
        const project = creatorMasteryApprovalLabel(level)
        return (
          <details key={level.level} open={now} className="kids-carta group/nivel p-5 md:p-6">
            <summary className="flex cursor-pointer list-none items-start gap-4 rounded-2xl focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4">
              <span
                aria-hidden="true"
                className={cn(
                  'sz-display grid size-12 shrink-0 place-items-center rounded-full text-lg',
                  done
                    ? 'bg-(--success-foreground) text-white'
                    : now
                      ? 'bg-(--sz-kids-amarelo) text-(--sz-kids-tinta)'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="size-6" strokeWidth={3} /> : ROMAN_LEVEL[level.level]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
                    Nível {ROMAN_LEVEL[level.level]}
                  </span>
                  <KidsTag tone={done ? 'menta' : now ? 'amarelo' : 'muted'}>
                    {creatorMasteryLevelStatus(level, area, view)}
                  </KidsTag>
                </span>
                <h2 className="sz-display mt-1 text-xl md:text-2xl">
                  {creatorMasteryLevelTitle(level)}
                </h2>
                <span className="mt-3 flex flex-wrap gap-2">
                  <Pill done={level.nucleusCompleted}>Núcleo</Pill>
                  <Pill done={level.workshopsCompleted >= 2}>
                    Oficinas {Math.min(level.workshopsCompleted, 2)} de 2
                  </Pill>
                  <Pill done={level.approval === 'approved'}>{project}</Pill>
                </span>
              </span>
              <ChevronDown
                className="mt-3 size-5 shrink-0 text-muted-foreground transition-transform group-open/nivel:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-6 flex flex-col gap-7 border-(--borda-carta) border-t pt-6">
              {level.nucleusCourses.length ? (
                <section className="flex flex-col gap-3">
                  <h3 className="sz-display text-lg">O núcleo</h3>
                  <ul className="grid gap-3">
                    {level.nucleusCourses.map((entry) => {
                      const card = creatorEntryCard(entry, catalog, mine)
                      return (
                        <li key={entry.courseId}>
                          <WideCourseCard
                            card={card}
                            note={creatorEntryNote(card.status)}
                            eyebrow="Núcleo da Maestria"
                          />
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ) : null}
              <section className="flex flex-col gap-3">
                <h3 className="sz-display text-lg">Escolha duas oficinas</h3>
                <ul className="grid gap-3 lg:grid-cols-3">
                  {level.workshops.map((workshop) => (
                    <li
                      key={workshop.id}
                      className={cn(
                        'flex flex-col gap-3 rounded-2xl p-4',
                        workshop.completed ? 'bg-(--band-menta)' : 'bg-background',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-extrabold">{workshop.title}</p>
                        {workshop.completed ? <DoneTag /> : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        {workshop.courses.map((entry) => {
                          const card = creatorEntryCard(entry, catalog, mine)
                          return (
                            <MiniCourse
                              key={entry.courseId}
                              card={card}
                              // O curso da oficina costuma ter o nome dela: aí o link diz a ação.
                              label={
                                card.title === workshop.title
                                  ? card.status === 'done'
                                    ? 'Rever a oficina'
                                    : card.status === 'progress'
                                      ? 'Continuar a oficina'
                                      : 'Abrir a oficina'
                                  : undefined
                              }
                            />
                          )
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="flex flex-col gap-4 rounded-2xl bg-background p-5">
                <h3 className="sz-display text-lg">Seu projeto: critérios essenciais</h3>
                {level.project ? (
                  <div className="max-w-md">
                    <p className="mb-2 font-bold text-muted-foreground text-xs">
                      Guia de projeto (opcional)
                    </p>
                    <MiniCourse card={creatorEntryCard(level.project, catalog, mine)} />
                  </div>
                ) : null}
                <ul className="flex flex-col gap-2">
                  {level.rubric.criteria.map((criterion) => {
                    const ok = level.approvedCriteriaIds.includes(criterion.id)
                    return (
                      <li key={criterion.id} className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full',
                            ok
                              ? 'bg-(--success-foreground) text-white'
                              : 'bg-card ring-2 ring-(--borda-carta)',
                          )}
                        >
                          {ok ? (
                            <Check className="size-3.5" strokeWidth={3} aria-label="Aprovado" />
                          ) : null}
                        </span>
                        <span className="font-medium">
                          {criterion.title.replace(/^O aluno\b|^A aluna\b/, 'Você')}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="font-medium text-muted-foreground text-sm">
                  A equipe avalia uma versão salva do projeto e devolve comentários. Se precisar
                  ajustar, você envia uma nova versão; o seu trabalho anterior fica registrado.
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

function Pill({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-extrabold text-[0.8125rem]',
        done
          ? 'bg-(--band-menta) text-(--success-foreground)'
          : 'bg-(--band-creme) text-foreground',
      )}
    >
      {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
      {children}
      {done ? <span className="sr-only">: feito</span> : null}
    </span>
  )
}
