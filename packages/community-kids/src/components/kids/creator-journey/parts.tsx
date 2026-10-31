import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import {
  type CreatorEntryCardView,
  type CreatorStageChecklist,
  creatorEntryAction,
} from '@sistemazero/member-shell/lib/creator-journey-presentation'
import { ArrowRight, BookOpen, Check, Lock, Play } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { levelInfo } from '@/lib/level-info'
import type { CourseTrack, StudentLevelSlug } from '@/lib/types'

/**
 * As peças da Jornada do Criador no desenho do Kids (telas aprovadas de 25/10/2026): os
 * cartões brancos da casa, os chips de tom e o progresso verde. Nada aqui decide acesso:
 * o estado de cada curso chega pronto do `creatorEntryCard` (fato da jornada + catálogo +
 * "Meus cursos"), e o cartão só sabe desenhar.
 */

/* ─────────────── Medalhão do posto ─────────────── */

/**
 * O MEDALHÃO do posto (a mesma arte do mapa, `/jornada/<slug>.webp`). O ícone fica por baixo
 * e a arte por cima: se o .webp faltar no deploy, a imagem sem `alt` não desenha nada e o
 * ícone aparece, sem JS.
 */
export function StageMedal({
  slug,
  ring = 'var(--primary)',
  dim = false,
  lock = false,
  className,
}: {
  slug: StudentLevelSlug
  /** Cor do anel: o azul da marca na trilha atual, a cor do nível nas outras. */
  ring?: string
  dim?: boolean
  /** Selo de cadeado no canto (o posto ainda não foi alcançado). */
  lock?: boolean
  className?: string
}) {
  const info = levelInfo(slug)
  const Icon = info.icon
  return (
    <span aria-hidden="true" className="relative w-fit shrink-0">
      <span
        className={cn(
          'relative grid shrink-0 place-items-center overflow-hidden rounded-full border-[3px]',
          dim ? 'border-transparent bg-muted' : 'bg-card',
          className,
        )}
        style={dim ? undefined : { borderColor: ring }}
      >
        <Icon
          className={cn('size-1/2', dim && 'text-muted-foreground')}
          style={dim ? undefined : { color: info.colorVar }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/jornada/${slug}.webp`}
          alt=""
          width={72}
          height={72}
          className={cn('absolute inset-0 size-full object-cover', dim && 'opacity-45 grayscale')}
        />
      </span>
      {lock ? (
        <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full bg-card text-muted-foreground shadow-sm">
          <Lock className="size-3.5" />
        </span>
      ) : null}
    </span>
  )
}

/* ─────────────── Chips ─────────────── */

/** O tom de cada chip, com a tinta que passa no contraste sobre ele. */
const TOM = {
  ceu: 'bg-(--band-ceu) text-(--sz-kids-azul-texto)',
  lilas: 'bg-(--band-lilas) text-[#4b2aa8]',
  menta: 'bg-(--band-menta) text-(--success-foreground)',
  amarelo: 'bg-(--band-amarelo) text-[#7a4100]',
  rosa: 'bg-(--band-rosa) text-(--sz-kids-rosa-funda)',
  muted: 'bg-muted text-muted-foreground',
} as const
export type KidsTagTone = keyof typeof TOM

export function KidsTag({ tone, children }: { tone: KidsTagTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-extrabold text-[0.75rem]',
        TOM[tone],
      )}
    >
      {children}
    </span>
  )
}

/** 2D no céu, 3D no lilás: a dimensão se reconhece pela cor antes de ler. */
export function TrackTag({ track }: { track: CourseTrack | null }) {
  if (!track) return null
  return <KidsTag tone={track === '3d' ? 'lilas' : 'ceu'}>{track === '3d' ? '3D' : '2D'}</KidsTag>
}

export function DoneTag() {
  return (
    <KidsTag tone="menta">
      <Check className="size-3.5" strokeWidth={3} aria-hidden /> Feito
    </KidsTag>
  )
}

/* ─────────────── O que falta para subir ─────────────── */

type ChecklistItem = { id: string; label: string; detail: string | null; done: boolean }

/** Os três requisitos com o detalhe que a criança lê ("1 de 2", "1 de 4 aulas"). */
export function checklistItems(
  list: CreatorStageChecklist,
  missionLessons: CreatorEntryCardView['lessons'],
): ChecklistItem[] {
  return [
    {
      id: 'cursos',
      label: 'Cursos da trilha',
      detail: list.courses.complete
        ? null
        : list.courses.preparing
          ? 'Em preparação'
          : `${list.courses.done} de 2`,
      done: list.courses.complete,
    },
    {
      id: 'missao',
      label: 'Missão',
      detail: list.mission.complete
        ? null
        : missionLessons && missionLessons.done > 0
          ? `${missionLessons.done} de ${missionLessons.total} aulas`
          : list.mission.preparing
            ? 'Em preparação'
            : list.mission.available
              ? 'Por fazer'
              : 'Depois dos cursos',
      done: list.mission.complete,
    },
    {
      id: 'poderes',
      label: list.powers.required === 1 ? 'Poder' : 'Poderes',
      detail: list.powers.complete ? null : `${list.powers.done} de ${list.powers.required}`,
      done: list.powers.complete,
    },
  ]
}

/**
 * Feito em menta com o ✓; o PRIMEIRO que falta em amarelo (é onde ela está); o resto em creme.
 * O estado vai também no texto, para quem não vê a cor.
 */
function itemTone(items: ChecklistItem[], index: number) {
  const item = items[index]!
  if (item.done) return 'done' as const
  return items.findIndex((candidate) => !candidate.done) === index
    ? ('now' as const)
    : ('later' as const)
}

export function ChecklistStrip({
  title,
  items,
  className,
}: {
  /** "Para virar Inventor(a)". */
  title: string
  items: ChecklistItem[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'kids-carta flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 md:px-5',
        className,
      )}
    >
      <p className="shrink-0 font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em] md:w-40">
        {title}
      </p>
      <ul className="grid flex-1 gap-2.5 md:grid-cols-3">
        {items.map((item, index) => {
          const tone = itemTone(items, index)
          return (
            <li
              key={item.id}
              className={cn(
                'flex min-h-11 items-center gap-2.5 rounded-2xl px-3.5 py-2.5',
                tone === 'done'
                  ? 'bg-(--band-menta)'
                  : tone === 'now'
                    ? 'bg-(--band-amarelo)'
                    : 'bg-(--band-creme)',
              )}
            >
              {item.done ? (
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-(--success-foreground) text-white">
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-card text-muted-foreground ring-2 ring-(--borda-carta)"
                />
              )}
              <span className="font-extrabold text-[0.9375rem]">{item.label}</span>
              <span className="ml-auto text-right font-bold text-muted-foreground text-xs">
                {item.done ? <span className="sr-only">feito</span> : item.detail}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** A versão em pílulas soltas, para o cartão da Início e o da Família. */
export function ChecklistPills({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, index) => {
        const tone = itemTone(items, index)
        return (
          <li
            key={item.id}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-extrabold text-[0.8125rem]',
              tone === 'done'
                ? 'bg-(--band-menta) text-(--success-foreground)'
                : tone === 'now'
                  ? 'bg-(--band-amarelo) text-(--sz-kids-tinta)'
                  : 'bg-(--band-creme) text-foreground',
            )}
          >
            {item.done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
            {item.label}
            {item.done ? (
              <span className="sr-only">: feito</span>
            ) : item.detail ? (
              <span className="font-bold opacity-75">{item.detail}</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/* ─────────────── Progresso e botão ─────────────── */

/** A pílula apagada de quem ainda não abre (no lugar do botão). */
const PILULA_APAGADA =
  'flex w-full items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-2.5 text-center font-bold text-muted-foreground text-xs'

/**
 * As aulas feitas, a barra verde e o botão do próximo passo (a régua da Início: seguir em
 * frente é o azul cheio; revisar é a pílula suave). Quem ainda não abre mostra só a frase.
 */
export function EntryFooter({
  card,
  note,
  action,
  compact = false,
}: {
  card: CreatorEntryCardView
  /** O que a criança lê quando o curso não abre. */
  note: string | null
  /** Troca o texto do botão ("Abrir de novo" nos Poderes). */
  action?: string | null
  compact?: boolean
}) {
  const label = action ?? creatorEntryAction(card.status)
  if (!card.href || !label)
    return (
      <span className={PILULA_APAGADA}>
        {card.status === 'planned' ? null : <Lock className="size-3.5 shrink-0" aria-hidden />}
        {note}
      </span>
    )
  const forward = card.status !== 'done'
  return (
    <div>
      {card.lessons && !compact ? (
        <>
          <div className="flex items-center justify-between font-semibold text-muted-foreground text-xs">
            <span>
              {card.lessons.done} de {card.lessons.total}{' '}
              {card.lessons.total === 1 ? 'aula' : 'aulas'}
            </span>
            <span
              className={cn(
                'font-extrabold',
                card.lessons.percent > 0 && 'text-(--success-foreground)',
              )}
            >
              {card.lessons.percent}%
            </span>
          </div>
          <div className="sz-progress mt-2" aria-hidden="true">
            <span style={{ width: `${card.lessons.percent}%` }} />
          </div>
        </>
      ) : null}
      <span
        className={cn(
          'sz-btn-gradient w-full gap-2',
          card.lessons && !compact && 'mt-3.5',
          !forward && 'sz-btn-suave',
        )}
      >
        {forward ? (
          card.status === 'progress' ? (
            <Play className="size-4" aria-hidden />
          ) : null
        ) : (
          <ArrowRight className="size-4" aria-hidden />
        )}
        {label}
      </span>
    </div>
  )
}

/** O cartão inteiro é o link quando o curso abre; senão é um bloco quieto. */
export function EntryShell({
  card,
  className,
  children,
}: {
  card: CreatorEntryCardView
  className?: string
  children: ReactNode
}) {
  return card.continueHref ? (
    <Link
      href={card.continueHref}
      prefetch={false}
      className={cn('group kid-pop block', className)}
    >
      {children}
    </Link>
  ) : (
    <div className={cn('block', className)}>{children}</div>
  )
}

/** A capa do curso, ou o livro no chão cinza; apagada quando o curso ainda não abre. */
export function EntryCover({
  card,
  className,
  iconClassName = 'size-10',
}: {
  card: CreatorEntryCardView
  className?: string
  iconClassName?: string
}) {
  const closed = !card.href
  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-muted', className)}>
      {card.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.coverImageUrl}
          alt=""
          width={16}
          height={9}
          loading="lazy"
          decoding="async"
          className={cn(
            'h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]',
            closed && 'opacity-60 grayscale',
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <BookOpen className={iconClassName} strokeWidth={1.75} aria-hidden />
        </div>
      )}
      {closed && card.status !== 'planned' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="grid size-11 place-items-center rounded-full bg-card text-muted-foreground shadow-sm">
            <Lock className="size-5" aria-hidden />
          </span>
        </div>
      ) : null}
    </div>
  )
}

/* ─────────────── Os cartões ─────────────── */

/** Curso da trilha: o cartão grande de duas colunas, com a capa larga em cima. */
export function TrailCourseCard({
  card,
  note,
}: {
  card: CreatorEntryCardView
  note: string | null
}) {
  return (
    <EntryShell card={card} className="h-full">
      <article className="kids-carta flex h-full flex-col overflow-hidden">
        <EntryCover card={card} className="aspect-[2/1] w-full" />
        <div className="flex flex-1 flex-col gap-5 p-6">
          <div className="min-w-0">
            <h3 className="sz-display text-xl md:text-2xl">{card.title}</h3>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <TrackTag track={card.track} />
              {card.status === 'done' ? <DoneTag /> : null}
            </span>
            {card.subtitle ? (
              <p className="mt-1.5 line-clamp-2 font-medium text-[0.9375rem] text-muted-foreground">
                {card.subtitle}
              </p>
            ) : null}
          </div>
          <div className="mt-auto">
            <EntryFooter card={card} note={note} />
          </div>
        </div>
      </article>
    </EntryShell>
  )
}

/** O cartão deitado (extras e a lista da trilha no mapa): capa à esquerda, botão à direita. */
export function WideCourseCard({
  card,
  note,
  eyebrow,
  tags,
}: {
  card: CreatorEntryCardView
  note: string | null
  eyebrow: string
  tags?: ReactNode
}) {
  return (
    <EntryShell card={card} className="h-full">
      <article className="kids-carta flex h-full flex-col gap-4 p-4 md:flex-row md:items-center md:gap-6 md:p-5">
        <EntryCover
          card={card}
          className="aspect-[5/3] w-full rounded-2xl md:w-40"
          iconClassName="size-8"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-muted-foreground text-xs">{eyebrow}</p>
          <h3 className="sz-display mt-1 text-xl md:text-[1.375rem]">{card.title}</h3>
          <span className="mt-2 flex flex-wrap gap-1.5">
            {tags ?? <TrackTag track={card.track} />}
            {card.status === 'done' ? <DoneTag /> : null}
          </span>
          {card.subtitle ? (
            <p className="mt-1.5 line-clamp-2 font-medium text-[0.8125rem] text-muted-foreground">
              {card.subtitle}
            </p>
          ) : null}
        </div>
        <div className="w-full shrink-0 md:w-56">
          <EntryFooter card={card} note={note} />
        </div>
      </article>
    </EntryShell>
  )
}

/**
 * A missão: o cartão deitado com a arte no amarelo. Sem capa, quem aparece é o Zappy
 * pensando (a missão é o jogo que a criança inventa sem passo a passo).
 */
export function MissionCard({
  card,
  note,
  eyebrow = 'Missão da trilha',
}: {
  card: CreatorEntryCardView
  note: string | null
  eyebrow?: string
}) {
  return (
    <EntryShell card={card}>
      <article className="kids-carta flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-6 md:p-6">
        <div className="relative aspect-[5/3] w-full shrink-0 overflow-hidden rounded-2xl bg-(--band-amarelo) md:w-60">
          {card.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.coverImageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={cn('h-full w-full object-cover', !card.href && 'opacity-60 grayscale')}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={BUILTIN_ART.thinking.poster.url}
              alt=""
              className={cn(
                'absolute inset-0 m-auto h-[85%] w-auto object-contain',
                !card.href && 'opacity-60 grayscale',
              )}
            />
          )}
          {!card.href && card.status !== 'planned' ? (
            <span className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-card text-muted-foreground shadow-sm">
              <Lock className="size-4" aria-hidden />
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-muted-foreground text-xs">{eyebrow}</p>
          <h3 className="sz-display mt-1 text-2xl md:text-[1.625rem]">{card.title}</h3>
          <p className="mt-1.5 font-medium text-[0.9375rem] text-muted-foreground">
            {card.subtitle ??
              'Um jogo novo, sem passo a passo. Você monta a partida com o que aprendeu nos cursos da trilha: primeiro em 2D, depois em 3D.'}
          </p>
          <span className="mt-3 flex flex-wrap gap-1.5">
            <TrackTag track="2d" />
            <TrackTag track="3d" />
            <KidsTag tone="muted">Sem nota</KidsTag>
            <KidsTag tone="muted">Tente quantas vezes quiser</KidsTag>
            {card.status === 'done' ? <DoneTag /> : null}
          </span>
        </div>
        <div className="w-full shrink-0 md:w-56">
          <EntryFooter
            card={card}
            note={note}
            action={card.status === 'progress' ? 'Continuar a missão' : null}
          />
        </div>
      </article>
    </EntryShell>
  )
}

/** Um Poder: cartão pequeno da grade de três, com a dimensão e as aulas no alto. */
export function PowerCard({
  title,
  card,
  tracks,
  done,
  note,
}: {
  title: string
  /** O curso que o cartão abre (a versão em andamento, a feita ou a primeira). */
  card: CreatorEntryCardView
  /** As dimensões em que o Poder existe (2D, 3D ou as duas). */
  tracks: readonly CourseTrack[]
  done: boolean
  note: string | null
}) {
  return (
    <EntryShell card={card} className="h-full">
      <article className="kids-carta flex h-full flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {tracks.map((track) => (
            <TrackTag key={track} track={track} />
          ))}
          {card.lessons ? (
            <span className="font-bold text-muted-foreground text-xs">
              {card.lessons.total} {card.lessons.total === 1 ? 'aula' : 'aulas'}
            </span>
          ) : null}
          {done ? (
            <span className="ml-auto">
              <DoneTag />
            </span>
          ) : null}
        </div>
        <div>
          <h3 className="sz-display text-xl">{title}</h3>
          {card.subtitle ? (
            <p className="mt-1 line-clamp-2 font-medium text-[0.875rem] text-muted-foreground">
              {card.subtitle}
            </p>
          ) : null}
        </div>
        <div className="mt-auto">
          <EntryFooter
            card={card}
            note={note}
            action={done && card.href ? 'Abrir de novo' : null}
            compact
          />
        </div>
      </article>
    </EntryShell>
  )
}
