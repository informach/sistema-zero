'use client'

import { COURSE_TIER_LABELS } from '@sistemazero/member-shell/lib/course-tier'
import { Check, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { careerNodeState, LEVEL_TIER } from '@/lib/career-map'
import { cn } from '@/lib/cn'
import { LEVEL_INFO, LEVEL_ORDER, levelInfo, nextLevelHint } from '@/lib/level-info'
import type { StudentLevelSlug, StudentLevelView } from '@/lib/types'

/**
 * Mapa da Carreira (/cursos): serpentina vertical com os 8 níveis. Cada nó tem a
 * ilustração do nível (Dedé/Debinha em `/carreira/<slug>.webp`; sem arquivo →
 * fallback no ícone do LEVEL_INFO), fica preto-e-branco quando ainda não foi
 * atingido e, liberado, navega p/ a listagem da trilha (`/cursos/trilha/[tier]`).
 * Nó travado NÃO navega: balança + recado gentil (decisão da usuária 24/07).
 */
export function CareerMap({ level }: { level: StudentLevelView }) {
  const hint = nextLevelHint(level)
  const current = levelInfo(level.slug)

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full border-2 bg-card px-4 py-1.5 font-bold text-sm shadow-sm"
          style={{ borderColor: current.colorVar }}
        >
          <current.icon className="size-4" style={{ color: current.colorVar }} aria-hidden />
          Você é {current.label}
        </span>
        {hint ? <p className="max-w-md text-muted-foreground text-sm">{hint}</p> : null}
      </div>

      <ol className="relative mx-auto w-full max-w-xl">
        {/* Espinha do caminho: linha tracejada central atrás dos nós. */}
        <span
          aria-hidden
          className="-translate-x-1/2 absolute top-16 bottom-16 left-1/2 border-border border-l-2 border-dashed"
        />
        {LEVEL_ORDER.map((slug, index) => (
          <CareerNode
            key={slug}
            slug={slug}
            side={index % 2 === 0 ? 'left' : 'right'}
            state={careerNodeState(level.slug, slug)}
            level={level}
          />
        ))}
      </ol>
    </section>
  )
}

function CareerNode({
  slug,
  side,
  state,
  level,
}: {
  slug: StudentLevelSlug
  side: 'left' | 'right'
  state: ReturnType<typeof careerNodeState>
  level: StudentLevelView
}) {
  const info = LEVEL_INFO[slug]
  const tier = LEVEL_TIER[slug]
  const [artBroken, setArtBroken] = useState(false)
  const [wiggling, setWiggling] = useState(false)
  const wiggleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locked = state === 'locked'
  const Icon = info.icon

  const remaining =
    state === 'current' && tier && level.remaining ? (level.remaining[tier] ?? 0) : 0

  const art = (
    <span
      className={cn(
        'relative z-10 grid size-28 shrink-0 place-items-center overflow-hidden rounded-full border-4 bg-card shadow-md md:size-32',
        locked && 'opacity-80 grayscale',
        state === 'current' && 'kid-float',
      )}
      style={{ borderColor: locked ? 'var(--border)' : info.colorVar }}
    >
      {artBroken ? (
        <Icon className="size-12" style={{ color: info.colorVar }} aria-hidden />
      ) : (
        // Ilustração dos personagens (Dedé/Debinha) — pode ainda não existir no
        // deploy: onError cai no ícone do nível (o mapa nunca quebra sem arte).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/carreira/${slug}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setArtBroken(true)}
        />
      )}
      {locked ? (
        <span className="absolute right-1 bottom-1 grid size-8 place-items-center rounded-full bg-background/95 shadow-sm">
          <Lock className="size-4 text-muted-foreground" aria-hidden />
        </span>
      ) : state === 'done' ? (
        <span className="absolute right-1 bottom-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Check className="size-4" strokeWidth={3} aria-hidden />
        </span>
      ) : null}
    </span>
  )

  const label = (
    <span className="flex max-w-40 flex-col items-center gap-1 text-center">
      {state === 'current' ? (
        <span className="rounded-full bg-primary px-3 py-0.5 font-bold text-[11px] text-primary-foreground">
          Você está aqui
        </span>
      ) : null}
      <span
        className={cn(
          'font-bold text-sm leading-tight',
          locked ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {info.label}
      </span>
      {tier ? (
        <span className="text-[11px] text-muted-foreground">Trilha {COURSE_TIER_LABELS[tier]}</span>
      ) : state !== 'locked' ? (
        <span className="text-[11px] text-muted-foreground">O topo da carreira!</span>
      ) : null}
      {state === 'current' && remaining > 0 ? (
        <span className="font-semibold text-[11px]" style={{ color: info.colorVar }}>
          {remaining === 1 ? 'Falta 1 curso' : `Faltam ${remaining} cursos`}
        </span>
      ) : null}
    </span>
  )

  const inner = (
    <span
      className={cn(
        'flex flex-col items-center gap-2',
        wiggling && 'kid-wiggle',
        !locked && 'kid-pop',
      )}
    >
      {art}
      {label}
    </span>
  )

  const rowClass = cn(
    'relative flex py-4',
    side === 'left' ? 'justify-start pl-2 md:pl-10' : 'justify-end pr-2 md:pr-10',
  )

  // Nó travado: NÃO navega — balança + recado gentil.
  if (locked) {
    return (
      <li className={rowClass}>
        <button
          type="button"
          aria-label={`${info.label} — ainda bloqueado`}
          className="cursor-not-allowed"
          onClick={() => {
            setWiggling(true)
            if (wiggleTimer.current) clearTimeout(wiggleTimer.current)
            wiggleTimer.current = setTimeout(() => setWiggling(false), 700)
            toast('Continue sua carreira para abrir esta parte do mapa! 🔒')
          }}
        >
          {inner}
        </button>
      </li>
    )
  }

  // Lenda não tem trilha p/ abrir — o nó é a própria celebração.
  if (!tier) {
    return (
      <li className={rowClass}>
        <span>{inner}</span>
      </li>
    )
  }

  return (
    <li className={rowClass}>
      <Link
        href={`/cursos/trilha/${tier}`}
        aria-label={`${info.label} — abrir a trilha ${COURSE_TIER_LABELS[tier]}`}
      >
        {inner}
      </Link>
    </li>
  )
}
