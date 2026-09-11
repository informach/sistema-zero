'use client'

import { creativeToolAvailability } from '@sistemazero/core/career'
import { Check, Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useId, useState } from 'react'
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
import { careerNodeState, LEVEL_TIER, nodeShowsCheck, type TierCompletion } from '@/lib/career-map'
import { buildCareerGeometry, type CareerGeometry, type CareerPoint } from '@/lib/career-path'
import { cn } from '@/lib/cn'
import { LEVEL_INFO } from '@/lib/level-info'
import type { StudentLevelSlug, StudentLevelView } from '@/lib/types'
import { CareerHorizonNode } from './career-horizon-node'
import { useWiggle } from './use-wiggle'

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
 * (`careerHorizon`) e fecha com o nó "E tem muito mais pela frente". Enquanto os 49 cursos não
 * existem, a alternativa seria uma fileira de cadeados prometendo cursos que ninguém gravou. Quando
 * o catálogo enche, o horizonte vira a Lenda, o nó de fechamento some e este componente volta a
 * desenhar os 8 medalhões de sempre, sem ninguém desligar nada.
 */
export function CareerMap({
  level,
  courses,
  completionByLevel,
  studioOwned = false,
}: {
  level: StudentLevelView
  /** Recorte do catálogo publicado (3 campos) — define o horizonte e o contador honesto.
   *  ⚠️ Recorte, não a view inteira: isto atravessa a fronteira servidor→cliente. */
  courses: readonly CareerCatalogEntry[]
  /**
   * Quantas aventuras de CADA trilha já estão prontas, de quantas existem — bônus incluído.
   * Calculado no servidor (`tierCompletionByLevel`) sobre os marcos que vêm no PRÓPRIO
   * catálogo: ou ele carregou, e isto é confiável, ou a página já falhou antes.
   * ⚠️ Segue opcional para o ✓ ter um caminho posicional em qualquer estado torto.
   */
  completionByLevel?: Record<StudentLevelSlug, TierCompletion>
  /** Estúdio Completo comprado? Só com posse o estado "em dia" oferece o atalho de criar. */
  studioOwned?: boolean
}) {
  const progress = careerProgress(level, courses)
  /**
   * ⚠️ "Em dia" precisa olhar a TRILHA, não só a régua da carreira. O `careerProgress` só
   * conhece as posições obrigatórias: com um bônus novo por fazer ele diz `up-to-date`
   * enquanto o contador do medalhão mostra "8 de 9". O card afirmaria "você já fez tudo
   * que está pronto por aqui" — exatamente a mentira que este contador existe para matar.
   */
  const currentTrilha = completionByLevel?.[level.slug as StudentLevelSlug]
  const trilhaComplete = !currentTrilha || currentTrilha.done >= currentTrilha.total
  const visible = visibleCareerLevels(level.slug, careerHorizon(courses))
  const showHorizon = hasHorizonNode(visible)
  const beyond = levelsBeyondHorizon(visible)
  const currentIndex = Math.max(0, visible.indexOf(level.slug as StudentLevelSlug))
  const nodeCount = visible.length + (showHorizon ? 1 : 0)
  const geo = buildCareerGeometry(nodeCount, currentIndex)

  return (
    // O chip "Você é <posto>" e a frase do próximo marco moram no CABEÇALHO da página
    // (telas-modelo de 11/09/2026); aqui fica só o mapa.
    <section aria-label="Mapa da carreira" className="flex flex-col gap-8">
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
            completion={completionByLevel?.[slug]}
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

      {progress.kind === 'up-to-date' && trilhaComplete ? (
        <UpToDate
          studioOwned={
            creativeToolAvailability({
              tool: 'estudio-completo',
              owned: studioOwned,
              level: level.slug,
            }) === 'available'
          }
        />
      ) : null}
    </section>
  )
}

/**
 * A criança fez tudo que existe. Não é fim de linha nem culpa dela: é hora de criar o que
 * quiser. Com o Estúdio comprado (produto vendido à parte), o recado vira atalho.
 */
function UpToDate({ studioOwned }: { studioOwned: boolean }) {
  return (
    <div className="kids-carta mx-auto flex w-full max-w-md flex-col items-center p-6 text-center md:p-7">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-2xl bg-(--sz-kids-amarelo)"
      >
        <Sparkles className="size-7 text-(--kids-ouro-fg)" />
      </span>
      <p className="sz-display mt-4 text-xl md:text-2xl">Você está em dia!</p>
      <p className="mt-2 font-medium text-[0.9375rem] text-muted-foreground">
        Você já fez tudo que está pronto por aqui. Novas aventuras estão sendo criadas!
      </p>
      {studioOwned ? (
        <Link href="/estudio" className="sz-btn-gradient mt-5 px-6">
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

/**
 * Teto da fileira de bolinhas.
 *
 * ⚠️ A legenda do medalhão é `w-44` (176 px) e a fileira é flex SEM wrap: cada bolinha custa
 * 12 px (`size-2` + `gap-1`), então 15 já ocupam a largura inteira e a partir daí a fileira
 * VAZA por cima da fita e da legenda vizinha. Antes isso era impossível por construção — o
 * total era o número de posições obrigatórias, no máximo 8. Desde que o contador passou a
 * incluir os bônus (15/08) o total é aberto, e o teto precisa ser explícito.
 *
 * Acima do teto as bolinhas SOMEM e fica só o "N de M", que é exato de qualquer forma: a
 * fileira é ilustração, o número é a informação.
 */
const MAX_PROGRESS_DOTS = 12

/**
 * Bolinhas do degrau: uma por curso que EXISTE, cheia (na cor do nível) quando já foi
 * concluído; as que faltam ficam no cinza do texto de apoio, como nas telas-modelo.
 */
function ProgressDots({ done, total, color }: { done: number; total: number; color: string }) {
  if (total > MAX_PROGRESS_DOTS) return null
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={
            // Bolinha não tem identidade própria — a posição é a identidade.
            // biome-ignore lint/suspicious/noArrayIndexKey: lista puramente posicional
            index
          }
          className={cn('size-2 rounded-full', index < done ? null : 'bg-current opacity-35')}
          style={index < done ? { backgroundColor: color } : undefined}
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
  completion,
}: {
  slug: StudentLevelSlug
  point: CareerPoint
  viewHeight: number
  state: ReturnType<typeof careerNodeState>
  progress: CareerProgress
  completion?: TierCompletion
}) {
  const info = LEVEL_INFO[slug]
  const tier = LEVEL_TIER[slug]
  const [artBroken, setArtBroken] = useState(false)
  const progressDescriptionId = useId()
  const { wiggling, wiggle } = useWiggle()
  const locked = state === 'locked'
  const Icon = info.icon
  const showCheck = nodeShowsCheck(state, completion)

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
          'grid h-full w-full place-items-center overflow-hidden rounded-full border-4',
          // Telas-modelo (11/09/2026): o posto atual ganha o anel AZUL da marca (o mesmo
          // azul do "Você está aqui"); os vencidos, a cor do nível; o travado é um círculo
          // claro sem borda, com a arte apagada. Nada de sombra: o mapa é chapado.
          state === 'current'
            ? 'border-primary bg-card'
            : locked
              ? 'border-transparent bg-muted'
              : 'bg-card',
        )}
        style={state === 'done' ? { borderColor: info.colorVar } : undefined}
      >
        {artBroken ? (
          <Icon
            className={cn('size-16', locked && 'text-muted-foreground')}
            style={locked ? undefined : { color: info.colorVar }}
            aria-hidden
          />
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
            className={cn('h-full w-full object-cover', locked && 'opacity-45 grayscale')}
            onError={() => setArtBroken(true)}
          />
        )}
      </span>
      {locked ? (
        <span className="absolute right-1 bottom-1 z-20 grid size-9 place-items-center rounded-full bg-card text-muted-foreground shadow-sm">
          <Lock className="size-[1.125rem]" aria-hidden />
        </span>
      ) : showCheck ? (
        <span className="absolute right-1 bottom-1 z-20 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
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
      <span className="-translate-x-1/2 absolute top-full left-1/2 mt-3 flex w-44 flex-col items-center gap-1 text-center">
        <span
          className={cn(
            'sz-display text-base md:text-[1.0625rem]',
            locked ? 'text-muted-foreground' : 'text-(--tinta)',
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
            em vez de esperar 8 cursos pelo próximo posto. O contador conta só o que EXISTE.
            ⭐ Aparece TAMBÉM nos postos já vencidos: é assim que uma aventura publicada num
            degrau antigo se anuncia ("8 de 9"). Sem isso ela ficaria invisível, porque a
            criança já passou dali e o medalhão só mostrava o ✓. */}
        {completion && completion.total > 0 && (state === 'current' || state === 'done') ? (
          <span
            id={progressDescriptionId}
            className="flex flex-col items-center gap-1 font-semibold text-[11px] text-muted-foreground"
          >
            <ProgressDots done={completion.done} total={completion.total} color={info.colorVar} />
            {completion.done} de {completion.total}{' '}
            {completion.total === 1 ? 'aventura pronta' : 'aventuras prontas'}
            {state === 'done' && completion.done < completion.total ? (
              <span className="rounded-full bg-card px-2 py-0.5 text-foreground">
                {completion.total - completion.done} para explorar · conquista mantida
              </span>
            ) : null}
          </span>
        ) : state === 'current' && progress.kind === 'up-to-date' ? (
          <span className="font-semibold text-[11px] text-muted-foreground">
            Você está em dia! 🎉
          </span>
        ) : locked && completion && completion.total > 0 ? (
          // O posto travado também diz o tamanho da trilha dele (telas-modelo): quantas
          // aventuras existem lá, todas por fazer. Conta só o que o catálogo TEM.
          <span className="flex flex-col items-center gap-1 font-semibold text-[11px] text-muted-foreground">
            <ProgressDots done={0} total={completion.total} color={info.colorVar} />
            {completion.total} {completion.total === 1 ? 'aventura' : 'aventuras'}
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
            wiggle()
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
            aria-describedby={
              completion && completion.total > 0 ? progressDescriptionId : undefined
            }
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
        aria-describedby={completion && completion.total > 0 ? progressDescriptionId : undefined}
        className="relative block"
      >
        {inner}
      </Link>
    </li>
  )
}
