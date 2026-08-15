'use client'

import { Hammer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { CareerPoint } from '@/lib/career-path'
import { cn } from '@/lib/cn'
import { LEVEL_INFO } from '@/lib/level-info'
import type { StudentLevelSlug } from '@/lib/types'
import { useWiggle } from './use-wiggle'

/**
 * O nó que FECHA o mapa da carreira enquanto o catálogo não tem os 49 cursos.
 *
 * No lugar da fileira de medalhões cinzas com cadeado (que para a criança lê como "você não
 * fez o suficiente"), um nó só, com a arte da Lenda e um martelinho: os postos daqui para
 * cima estão sendo CONSTRUÍDOS, e a espera não é culpa dela.
 *
 * ⚠️ **Este nó é um AVISO, não uma trilha, então NÃO navega e NÃO abre nada** (decisão da
 * usuária, 14/08): ele recebe o mesmo bloqueio dos postos ainda não conquistados — sacode e
 * mostra um recado. Antes ele abria um `Dialog` listando os postos que faltam, e o painel
 * renderizava DENTRO da bolinha: o `<li>` usa `-translate-x-1/2 -translate-y-1/2`, o Tailwind
 * v4 compila isso na propriedade `translate:`, e um elemento com `translate` vira containing
 * block de `position: fixed` — o `fixed inset-0` do overlay se resolvia contra o medalhão de
 * 11rem, não contra a viewport. O `toast` do sonner não sofre disso porque sai por portal no
 * `document.body`.
 *
 * Some sozinho quando o catálogo enche (`hasHorizonNode` → false).
 */
export function CareerHorizonNode({
  point,
  viewHeight,
  levels,
}: {
  point: CareerPoint
  viewHeight: number
  /** Postos que ficaram além do horizonte, na ordem da escada. */
  levels: readonly StudentLevelSlug[]
}) {
  // Arte ausente cai no ÍCONE do nível, como os demais nós. Antes o `onError` só
  // escondia a imagem e sobrava um círculo VAZIO — o único nó do mapa sem desenho.
  const [artBroken, setArtBroken] = useState(false)
  const { wiggling, wiggle } = useWiggle()
  const last = levels.at(-1) ?? 'god'
  const art = LEVEL_INFO[last]
  const Icon = art.icon

  return (
    <li
      className="-translate-x-1/2 -translate-y-1/2 absolute"
      style={{ left: `${point.x}%`, top: `${(point.y / viewHeight) * 100}%` }}
    >
      <button
        type="button"
        aria-label="Mais postos da carreira, ainda sendo construídos"
        className="relative block cursor-not-allowed"
        onClick={() => {
          wiggle()
          toast('Estamos construindo esta parte do mapa. Volte daqui a pouquinho! 🔨')
        }}
      >
        <span className={cn('block', wiggling && 'kid-wiggle')}>
          {/* Mesmo wrapper dos demais nós: o badge fica FORA do círculo que recorta. */}
          <span className="career-medal relative z-10 block shrink-0">
            <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-4 border-dashed bg-card opacity-90 shadow-lg">
              {artBroken ? (
                <Icon className="size-16 text-muted-foreground" aria-hidden />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/carreira/${last}.webp`}
                  alt=""
                  width={112}
                  height={112}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover opacity-70"
                  onError={() => setArtBroken(true)}
                />
              )}
            </span>
            <span className="absolute right-1 bottom-1 z-20 grid size-9 place-items-center rounded-full bg-background text-muted-foreground shadow-md ring-1 ring-border">
              <Hammer className="size-5" aria-hidden />
            </span>
          </span>
          <span className="-translate-x-1/2 absolute top-full left-1/2 mt-3 flex w-44 flex-col items-center gap-0.5 text-center">
            <span className="font-bold text-foreground text-sm leading-tight">
              E tem muito mais pela frente
            </span>
            <span className="text-[11px] text-muted-foreground">
              {levels.length === 1
                ? 'Mais 1 posto está sendo construído'
                : `Mais ${levels.length} postos estão sendo construídos`}
            </span>
          </span>
        </span>
      </button>
    </li>
  )
}
