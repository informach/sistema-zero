'use client'

import { buttonVariants } from '@sistemazero/ui/button'
import { Check, Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  type CareerCatalogEntry,
  type CareerProgress,
  careerHorizon,
  careerProgress,
  hasHorizonNode,
  levelsBeyondHorizon,
  visibleCareerLevels,
} from '@/lib/career-horizon'
import { careerNodeState, LEVEL_TIER } from '@/lib/career-map'
import { buildCareerGeometry, type CareerGeometry, type CareerPoint } from '@/lib/career-path'
import { cn } from '@/lib/cn'
import { LEVEL_INFO, levelInfo } from '@/lib/level-info'
import type { StudentLevelSlug, StudentLevelView } from '@/lib/types'
import { CareerHorizonNode } from './career-horizon-node'

/**
 * Mapa da Carreira (/cursos): uma FITA curva contínua serpenteia ligando os níveis; a parte já
 * conquistada acende no degradê das cores dos níveis, a parte à frente fica apagada. Cada nó é um
 * MEDALHÃO grande com a ilustração do nível (Dedé/Debinha em `/carreira/<slug>.webp`; sem arquivo →
 * fallback no ícone do LEVEL_INFO) e, liberado, navega p/ a trilha do nível
 * (`/cursos/trilha/[level]`). Nó travado NÃO navega: balança + recado gentil (decisão da usuária
 * 24/07). Fita e medalhões dividem o espaço normalizado da geometria pura (`lib/career-path.ts`) →
 * alinham em qualquer largura.
 *
 * ⭐ **HORIZONTE DO CATÁLOGO:** o mapa desenha só até onde o catálogo de hoje consegue levar
 * (`careerHorizon`) e fecha com o nó "E tem muito mais pela frente". Enquanto os 48 cursos não
 * existem, a alternativa seria uma fileira de cadeados prometendo cursos que ninguém gravou. Quando
 * o catálogo enche, o horizonte vira a Lenda, o nó de fechamento some e este componente volta a
 * desenhar os 8 medalhões de sempre, sem ninguém desligar nada.
 */
export function CareerMap({
  level,
  courses,
  studioOwned = false,
}: {
  level: StudentLevelView
  /** Recorte do catálogo publicado (3 campos) — define o horizonte e o contador honesto.
   *  ⚠️ Recorte, não a view inteira: isto atravessa a fronteira servidor→cliente. */
  courses: readonly CareerCatalogEntry[]
  /** Estúdio Completo comprado? Só com posse o estado "em dia" oferece o atalho de criar. */
  studioOwned?: boolean
}) {
  const current = levelInfo(level.slug)
  const progress = careerProgress(level, courses)
  const visible = visibleCareerLevels(level.slug, careerHorizon(courses))
  const showHorizon = hasHorizonNode(visible)
  const beyond = levelsBeyondHorizon(visible)
  const currentIndex = Math.max(0, visible.indexOf(level.slug as StudentLevelSlug))
  const nodeCount = visible.length + (showHorizon ? 1 : 0)
  const geo = buildCareerGeometry(nodeCount, currentIndex)

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full border-2 bg-card px-4 py-1.5 font-bold text-sm shadow-sm"
          style={{ borderColor: current.colorVar }}
        >
          <current.icon className="size-4" style={{ color: current.colorVar }} aria-hidden />
          Você é {current.label}
        </span>
        {progress.kind === 'pending' ? (
          <p className="max-w-md text-muted-foreground text-sm">{progress.hint}</p>
        ) : null}
      </div>

      {/* `mb-10` reserva o espaço da legenda do ÚLTIMO nó, que é absoluta e cai ~42px
          ABAIXO da caixa da lista. Sem isso o bloco "Você está em dia" (irmão seguinte)
          entra por cima dela — medido em 10px de sobreposição. Margem, não padding: os
          nós são posicionados em % da caixa, e padding recalcularia todas as posições. */}
      <ol
        className="relative mx-auto mb-10 w-full max-w-xl"
        style={{ height: `calc(var(--career-row) * ${nodeCount})` }}
      >
        <CareerRibbon geo={geo} levels={visible} />
        {visible.map((slug, index) => (
          <CareerNode
            key={slug}
            slug={slug}
            point={geo.points[index] ?? { x: 50, y: 0 }}
            viewHeight={geo.viewHeight}
            state={careerNodeState(level.slug, slug)}
            progress={progress}
          />
        ))}
        {showHorizon ? (
          <CareerHorizonNode
            point={geo.points[visible.length] ?? { x: 50, y: 0 }}
            viewHeight={geo.viewHeight}
            levels={beyond}
          />
        ) : null}
      </ol>

      {progress.kind === 'up-to-date' ? <UpToDate studioOwned={studioOwned} /> : null}
    </section>
  )
}

/**
 * A criança fez tudo que existe. Não é fim de linha nem culpa dela: é hora de criar o que
 * quiser. Com o Estúdio comprado (produto vendido à parte), o recado vira atalho.
 */
function UpToDate({ studioOwned }: { studioOwned: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-3xl border-2 border-border border-dashed bg-card p-5 text-center">
      <Sparkles className="size-7 text-primary" aria-hidden />
      <p className="sz-display text-lg">Você está em dia!</p>
      <p className="text-muted-foreground text-sm">
        Você já fez tudo que está pronto por aqui. Novas aventuras estão sendo criadas!
      </p>
      {studioOwned ? (
        <Link
          href="/estudio"
          className={cn(buttonVariants({ variant: 'default' }), 'h-11 rounded-full px-6')}
        >
          Criar um jogo meu
        </Link>
      ) : null}
    </div>
  )
}

/** A fita: trilha completa apagada + trecho percorrido no degradê das cores dos níveis. */
function CareerRibbon({
  geo,
  levels,
}: {
  geo: CareerGeometry
  /** Níveis DESENHADOS, na ordem dos pontos — o degradê lê a cor daqui, não do LEVEL_ORDER
   *  global (o mapa pode ser mais curto que a escada). */
  levels: readonly StudentLevelSlug[]
}) {
  const lastTraveled = geo.gradientStops.at(-1)
  const startY = geo.points[0]?.y ?? 0
  const endY = lastTraveled ? (geo.points[lastTraveled.index]?.y ?? geo.viewHeight) : geo.viewHeight

  return (
    <svg
      className="career-ribbon"
      viewBox={`0 0 ${geo.viewWidth} ${geo.viewHeight}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {geo.traveledPath ? (
        <defs>
          <linearGradient
            id="career-ribbon-grad"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={startY}
            x2="0"
            y2={endY}
          >
            {geo.gradientStops.map((stop) => (
              <stop
                key={stop.index}
                offset={stop.offset}
                stopColor={`var(--level-${levels[stop.index] ?? 'noob'})`}
              />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      <path className="career-ribbon__track" d={geo.fullPath} vectorEffect="non-scaling-stroke" />
      {geo.traveledPath ? (
        <path
          className="career-ribbon__fill"
          d={geo.traveledPath}
          vectorEffect="non-scaling-stroke"
          stroke="url(#career-ribbon-grad)"
        />
      ) : null}
    </svg>
  )
}

/** Bolinhas do degrau atual: uma por curso que EXISTE, cheia quando já foi concluído. */
function ProgressDots({ done, total }: { done: number; total: number }) {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={
            // Bolinha não tem identidade própria — a posição é a identidade.
            // biome-ignore lint/suspicious/noArrayIndexKey: lista puramente posicional
            index
          }
          className={cn(
            'size-2 rounded-full',
            index < done ? 'bg-current' : 'bg-current opacity-25',
          )}
        />
      ))}
    </span>
  )
}

function CareerNode({
  slug,
  point,
  viewHeight,
  state,
  progress,
}: {
  slug: StudentLevelSlug
  point: CareerPoint
  viewHeight: number
  state: ReturnType<typeof careerNodeState>
  progress: CareerProgress
}) {
  const info = LEVEL_INFO[slug]
  const tier = LEVEL_TIER[slug]
  const [artBroken, setArtBroken] = useState(false)
  const [wiggling, setWiggling] = useState(false)
  const wiggleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locked = state === 'locked'
  const Icon = info.icon

  const medal = (
    // Wrapper posicionado, SEM recorte: o badge (cadeado/check) fica FORA do círculo
    // com overflow-hidden — senão a borda circular corta o cantinho dele.
    <span
      className={cn(
        'career-medal relative z-10 block shrink-0',
        state === 'current' && 'kid-float',
      )}
    >
      <span
        className={cn(
          'grid h-full w-full place-items-center overflow-hidden rounded-full border-4 bg-card shadow-lg',
          locked && 'opacity-80 grayscale',
        )}
        style={{ borderColor: locked ? 'var(--border)' : info.colorVar }}
      >
        {artBroken ? (
          <Icon className="size-16" style={{ color: info.colorVar }} aria-hidden />
        ) : (
          // Ilustração dos personagens (Dedé/Debinha) — pode ainda não existir no
          // deploy: onError cai no ícone do nível (o mapa nunca quebra sem arte).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/carreira/${slug}.webp`}
            alt=""
            width={112}
            height={112}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setArtBroken(true)}
          />
        )}
      </span>
      {locked ? (
        <span className="absolute right-1 bottom-1 z-20 grid size-9 place-items-center rounded-full bg-background text-muted-foreground shadow-md ring-1 ring-border">
          <Lock className="size-5" aria-hidden />
        </span>
      ) : state === 'done' ? (
        <span className="absolute right-1 bottom-1 z-20 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-card">
          <Check className="size-5" strokeWidth={3} aria-hidden />
        </span>
      ) : null}
    </span>
  )

  const inner = (
    <span className={cn('block', wiggling && 'kid-wiggle', !locked && 'kid-pop')}>
      {state === 'current' ? (
        <span className="-translate-x-1/2 absolute bottom-full left-1/2 mb-3 whitespace-nowrap rounded-full bg-primary px-3 py-0.5 font-bold text-[11px] text-primary-foreground shadow-sm">
          Você está aqui
        </span>
      ) : null}
      {medal}
      <span className="-translate-x-1/2 absolute top-full left-1/2 mt-3 flex w-44 flex-col items-center gap-0.5 text-center">
        <span
          className={cn(
            'font-bold text-sm leading-tight',
            locked ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {info.label}
        </span>
        {/* ⚠️ NADA de nome de degrau ("Iniciante 2D") aqui: é vocabulário de quem MONTA o
            curso, não de quem faz. Para a criança o nó já se chama Faísca, Construtor(a)… */}
        {!tier && state !== 'locked' ? (
          <span className="text-[11px] text-muted-foreground">O topo da carreira!</span>
        ) : null}
        {/* Marcos do degrau: a criança vê o passo a passo se mexer a cada curso publicado,
            em vez de esperar 8 cursos pelo próximo posto. O contador conta só o que EXISTE. */}
        {state === 'current' && progress.kind === 'pending' ? (
          <span
            className="mt-0.5 flex flex-col items-center gap-1 font-semibold text-[11px]"
            style={{ color: info.colorVar }}
          >
            <ProgressDots done={progress.done} total={progress.ready} />
            {progress.done} de {progress.ready}{' '}
            {progress.ready === 1 ? 'aventura pronta' : 'aventuras prontas'}
          </span>
        ) : state === 'current' && progress.kind === 'up-to-date' ? (
          <span className="font-semibold text-[11px]" style={{ color: info.colorVar }}>
            Você está em dia! 🎉
          </span>
        ) : null}
      </span>
    </span>
  )

  // O medalhão é centrado no ponto da fita (translate -50%,-50%); balão/legenda são
  // absolutos em relação a ele (acima/abaixo), fora do fluxo → não deslocam o centro.
  const positionStyle = {
    left: `${point.x}%`,
    top: `${(point.y / viewHeight) * 100}%`,
  }
  const rowClass = '-translate-x-1/2 -translate-y-1/2 absolute'

  // Nó travado: NÃO navega — balança + recado gentil.
  if (locked) {
    return (
      <li className={rowClass} style={positionStyle}>
        <button
          type="button"
          aria-label={`${info.label}, ainda bloqueado`}
          className="relative block cursor-not-allowed"
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

  // Lenda (god): não estuda um degrau, mas TEM trilha — os cursos bônus da formatura
  // (nível `lenda`). Liberada (a criança é Lenda) → navega como os demais.
  if (!tier) {
    if (slug === 'god') {
      return (
        <li className={rowClass} style={positionStyle}>
          <Link
            href="/cursos/trilha/god"
            aria-label={`Abrir os cursos bônus da ${info.label}`}
            className="relative block"
          >
            {inner}
          </Link>
        </li>
      )
    }
    return (
      <li className={rowClass} style={positionStyle}>
        <span className="relative block">{inner}</span>
      </li>
    )
  }

  return (
    <li className={rowClass} style={positionStyle}>
      <Link
        href={`/cursos/trilha/${slug}`}
        aria-label={`Abrir a trilha ${info.label}`}
        className="relative block"
      >
        {inner}
      </Link>
    </li>
  )
}
