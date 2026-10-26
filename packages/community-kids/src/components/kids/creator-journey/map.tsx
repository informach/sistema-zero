'use client'

import type { CreatorJourneyView } from '@sistemazero/core/journey'
import {
  type CreatorStageChecklist,
  creatorStageChecklist,
  creatorStageOpen,
} from '@sistemazero/member-shell/lib/creator-journey-presentation'
import { Check, Lock } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useId, useState } from 'react'
import { cn } from '@/lib/cn'
import { buildJourneyGeometry, type JourneyPoint } from '@/lib/journey-path'
import { LEVEL_INFO } from '@/lib/level-info'
import type { StudentLevelSlug } from '@/lib/types'
import { JourneyRibbon, ProgressDots } from '../journey-map'

type NodeState = 'done' | 'current' | 'open' | 'locked'

interface MapNode {
  slug: StudentLevelSlug
  label: string
  state: NodeState
  href: string
  list: CreatorStageChecklist | null
}

/**
 * O MAPA DA JORNADA no currículo novo (`/cursos`): a mesma fita curva e os mesmos medalhões
 * do mapa de sempre (`journey-map.tsx`), com o que cada posto pede hoje. O posto atual mostra
 * os três chips (cursos da trilha, missão e Poderes); os já feitos, as bolinhas cheias; os
 * próximos, quantos passos têm. A Lenda fecha a fita e, alcançada, leva às Maestrias.
 *
 * ⚠️ A trava do mapa de sempre (pedido dela, 26/10/2026): o posto que a criança ainda não
 * alcançou fica em preto e branco, com o cadeado, e NÃO é link; só ganha cor e abre quando ela
 * chega lá (ou quando o servidor já abriu um curso dele: `creatorStageOpen`). A Lenda segue a
 * mesma régua. A equipe não passa por aqui: a prévia dela é outro caminho, com tudo aberto.
 */
export function CreatorJourneyMapKids({
  view,
  missionLessons = null,
}: {
  view: CreatorJourneyView
  /** As aulas da missão da trilha atual ("Missão 1/4"), quando a criança já a tem. */
  missionLessons?: { done: number; total: number } | null
}) {
  const nodes: MapNode[] = [
    ...view.stages.map((stage) => ({
      slug: stage.level as StudentLevelSlug,
      label: stage.title,
      state: (stage.level === view.level
        ? 'current'
        : stage.completed
          ? 'done'
          : creatorStageOpen(stage)
            ? 'open'
            : 'locked') as NodeState,
      href: `/cursos/trilha/${stage.level}`,
      list: creatorStageChecklist(stage),
    })),
    {
      slug: 'god' as const,
      label: 'Lenda',
      state: (view.level === 'god' ? 'current' : 'locked') as NodeState,
      href: '/maestrias',
      list: null,
    },
  ]
  const currentIndex = Math.max(
    0,
    nodes.findIndex((node) => node.state === 'current'),
  )
  const geo = buildJourneyGeometry(nodes.length, currentIndex)
  return (
    <section aria-label="Mapa da Jornada do Criador" className="flex flex-col gap-8">
      <ol
        className="relative mx-auto mb-10 w-full max-w-xl"
        style={{ height: `calc(var(--journey-row) * ${nodes.length})` }}
      >
        <JourneyRibbon geo={geo} levels={nodes.map((node) => node.slug)} />
        {nodes.map((node, index) => (
          <CurriculumNode
            key={node.slug}
            node={node}
            point={geo.points[index] ?? { x: 50, y: 0 }}
            viewHeight={geo.viewHeight}
            missionLessons={node.state === 'current' ? missionLessons : null}
          />
        ))}
      </ol>
    </section>
  )
}

function CurriculumNode({
  node,
  point,
  viewHeight,
  missionLessons,
}: {
  node: MapNode
  point: JourneyPoint
  viewHeight: number
  missionLessons: { done: number; total: number } | null
}) {
  const info = LEVEL_INFO[node.slug]
  const Icon = info.icon
  const [artBroken, setArtBroken] = useState(false)
  const captionId = useId()
  const locked = node.state === 'locked'
  const current = node.state === 'current'
  const legend = node.slug === 'god'

  return (
    <li
      className="-translate-x-1/2 -translate-y-1/2 absolute"
      style={{ left: `${point.x}%`, top: `${(point.y / viewHeight) * 100}%` }}
    >
      <NodeFrame
        locked={locked}
        href={node.href}
        current={current}
        label={
          legend
            ? locked
              ? 'Lenda, ainda bloqueada'
              : 'Lenda: conhecer as Maestrias'
            : locked
              ? `Trilha ${node.label}, ainda bloqueada`
              : `Abrir a trilha ${node.label}`
        }
        captionId={captionId}
      >
        <span className={cn('block', !locked && 'kid-pop')}>
          {current ? (
            <span className="-translate-x-1/2 absolute bottom-full left-1/2 mb-3 whitespace-nowrap rounded-full bg-primary px-3 py-0.5 font-bold text-[11px] text-primary-foreground shadow-sm">
              Você está aqui
            </span>
          ) : null}
          <span
            className={cn('journey-medal relative z-10 block shrink-0', current && 'kid-float')}
          >
            <span
              className={cn(
                'grid h-full w-full place-items-center overflow-hidden rounded-full border-4',
                current
                  ? 'border-primary bg-card'
                  : locked
                    ? 'border-transparent bg-muted'
                    : 'bg-card',
              )}
              style={!current && !locked ? { borderColor: info.colorVar } : undefined}
            >
              {artBroken ? (
                <Icon
                  className={cn('size-16', locked && 'text-muted-foreground')}
                  style={locked ? undefined : { color: info.colorVar }}
                  aria-hidden
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/jornada/${node.slug}.webp`}
                  alt=""
                  width={112}
                  height={112}
                  loading="lazy"
                  decoding="async"
                  className={cn('h-full w-full object-cover', locked && 'opacity-45 grayscale')}
                  onError={() => setArtBroken(true)}
                />
              )}
            </span>
            {locked ? (
              <span className="absolute right-1 bottom-1 z-20 grid size-9 place-items-center rounded-full bg-card text-muted-foreground shadow-sm">
                <Lock className="size-[1.125rem]" aria-hidden />
              </span>
            ) : node.state === 'done' ? (
              <span className="absolute right-1 bottom-1 z-20 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                <Check className="size-5" strokeWidth={3} aria-hidden />
              </span>
            ) : null}
          </span>
          <span className="-translate-x-1/2 absolute top-full left-1/2 mt-3 flex w-44 flex-col items-center gap-1 text-center">
            <span
              className={cn(
                'sz-display text-base md:text-[1.0625rem]',
                locked ? 'text-muted-foreground' : 'text-(--tinta)',
              )}
            >
              {node.label}
            </span>
            <span
              id={captionId}
              className="flex flex-col items-center gap-1 font-semibold text-[11px] text-muted-foreground"
            >
              {legend ? (
                locked ? null : (
                  'As Maestrias'
                )
              ) : current && node.list ? (
                <CurrentChips list={node.list} missionLessons={missionLessons} />
              ) : node.list ? (
                <>
                  <ProgressDots
                    done={locked ? 0 : node.list.done}
                    total={node.list.total}
                    color={info.colorVar}
                  />
                  {locked
                    ? `${node.list.total} cursos`
                    : `${node.list.done} de ${node.list.total} cursos prontos`}
                </>
              ) : null}
            </span>
          </span>
        </span>
      </NodeFrame>
    </li>
  )
}

/** O medalhão aberto é link; o trancado é só desenho (o nome e o "ainda bloqueada" ficam escritos). */
function NodeFrame({
  locked,
  href,
  current,
  label,
  captionId,
  children,
}: {
  locked: boolean
  href: string
  current: boolean
  label: string
  captionId: string
  children: ReactNode
}) {
  if (locked)
    return (
      <div className="relative block">
        {children}
        <span className="sr-only">Ainda bloqueada</span>
      </div>
    )
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={current ? 'step' : undefined}
      aria-label={label}
      aria-describedby={captionId}
      className="relative block rounded-full focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
    >
      {children}
    </Link>
  )
}

/** Os três chips do posto atual, empilhados sob o medalhão como na tela aprovada. */
function CurrentChips({
  list,
  missionLessons,
}: {
  list: CreatorStageChecklist
  missionLessons: { done: number; total: number } | null
}) {
  const chip = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-extrabold'
  const doneChip = cn(chip, 'bg-(--band-menta) text-(--success-foreground)')
  const firstPending = !list.courses.complete
    ? 'cursos'
    : !list.mission.complete
      ? 'missao'
      : 'poderes'
  const pendingChip = (id: string) =>
    cn(
      chip,
      id === firstPending
        ? 'bg-(--sz-kids-amarelo) text-(--sz-kids-tinta)'
        : 'bg-card text-foreground',
    )
  return (
    <span className="flex flex-col items-center gap-1 whitespace-nowrap">
      {list.courses.complete ? (
        <span className={doneChip}>
          <Check className="size-3" strokeWidth={3} aria-hidden />
          Cursos da trilha
        </span>
      ) : (
        <span className={pendingChip('cursos')}>Cursos {list.courses.done}/2</span>
      )}
      {list.mission.complete ? (
        <span className={doneChip}>
          <Check className="size-3" strokeWidth={3} aria-hidden />
          Missão
        </span>
      ) : (
        <span className={pendingChip('missao')}>
          {missionLessons && missionLessons.total > 0
            ? `Missão ${missionLessons.done}/${missionLessons.total}`
            : 'Missão'}
        </span>
      )}
      {list.powers.complete ? (
        <span className={doneChip}>
          <Check className="size-3" strokeWidth={3} aria-hidden />
          Poderes
        </span>
      ) : (
        <span className={pendingChip('poderes')}>
          Poderes {list.powers.done}/{list.powers.required}
        </span>
      )}
    </span>
  )
}
